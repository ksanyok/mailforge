import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { generateUnsubscribeToken } from '../../shared/utils/tokens.util';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

export interface ImportJobData {
  importId: string;
  filePath: string;
  fileType: string;
  columnMapping: Record<string, string>;
  dedupeRule: 'SKIP' | 'UPDATE';
  listId?: string;
}

const BATCH_SIZE = 500;

@Processor('imports')
export class ImportsProcessor {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('process-import')
  async processImport(job: Job<ImportJobData>) {
    const { importId, filePath, fileType, columnMapping, dedupeRule, listId } = job.data;

    await this.prisma.import.update({
      where: { id: importId },
      data: { status: 'PROCESSING' },
    });

    try {
      const rows = await this.parseFile(filePath, fileType);
      await this.prisma.import.update({
        where: { id: importId },
        data: { totalRows: rows.length },
      });

      let processedRows = 0;
      let successRows = 0;
      let errorRows = 0;
      const errors: Array<{ rowNumber: number; email?: string; error: string; rawData: any }> = [];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        this.logger.log(`Import ${importId}: Processing batch ${batchNumber}/${Math.ceil(rows.length / BATCH_SIZE)}`);

        for (const [batchIndex, row] of batch.entries()) {
          const rowNumber = i + batchIndex + 1;
          try {
            const mapped = this.mapRow(row, columnMapping);

            if (!mapped.email || !this.isValidEmail(mapped.email)) {
              errors.push({ rowNumber, email: mapped.email, error: 'Invalid email format', rawData: row });
              errorRows++;
              continue;
            }

            const existingContact = await this.prisma.contact.findUnique({
              where: { email: mapped.email.toLowerCase().trim() },
            });

            if (existingContact) {
              if (dedupeRule === 'UPDATE') {
                await this.prisma.contact.update({
                  where: { id: existingContact.id },
                  data: {
                    firstName: mapped.firstName || existingContact.firstName,
                    lastName: mapped.lastName || existingContact.lastName,
                    phone: mapped.phone || existingContact.phone,
                    company: mapped.company || existingContact.company,
                  },
                });
                if (listId) {
                  await this.prisma.contactListMember.upsert({
                    where: { contactId_listId: { contactId: existingContact.id, listId } },
                    create: { contactId: existingContact.id, listId },
                    update: {},
                  });
                }
                successRows++;
              } else {
                successRows++;
              }
            } else {
              const contact = await this.prisma.contact.create({
                data: {
                  email: mapped.email.toLowerCase().trim(),
                  firstName: mapped.firstName,
                  lastName: mapped.lastName,
                  phone: mapped.phone,
                  company: mapped.company,
                  sourceType: 'csv',
                  sourceId: importId,
                  unsubscribeToken: generateUnsubscribeToken(),
                  ...(listId && {
                    listMembers: { create: { listId } },
                  }),
                },
              });
              successRows++;
              this.logger.debug(`Created contact: ${contact.email}`);
            }
          } catch (err) {
            errorRows++;
            errors.push({
              rowNumber,
              error: err instanceof Error ? err.message : 'Unknown error',
              rawData: row,
            });
          }
        }

        processedRows += batch.length;
        await this.prisma.import.update({
          where: { id: importId },
          data: { processedRows, successRows, errorRows },
        });
        await job.progress(Math.floor((processedRows / rows.length) * 100));
      }

      // Save errors
      if (errors.length > 0) {
        await this.prisma.importError.createMany({
          data: errors.map((e) => ({
            importId,
            rowNumber: e.rowNumber,
            email: e.email,
            error: e.error,
            rawData: e.rawData,
          })),
        });
      }

      // Update list contact count
      if (listId) {
        await this.prisma.contactList.update({
          where: { id: listId },
          data: { contactCount: { increment: successRows } },
        });
      }

      await this.prisma.import.update({
        where: { id: importId },
        data: {
          status: errorRows === rows.length ? 'FAILED' : 'COMPLETED',
          completedAt: new Date(),
          processedRows: rows.length,
          successRows,
          errorRows,
        },
      });

      // Clean up file
      try { fs.unlinkSync(filePath); } catch {}

      this.logger.log(`Import ${importId} completed: ${successRows} success, ${errorRows} errors`);
    } catch (err) {
      this.logger.error(`Import ${importId} failed:`, err);
      await this.prisma.import.update({
        where: { id: importId },
        data: { status: 'FAILED', completedAt: new Date() },
      });
      throw err;
    }
  }

  private async parseFile(filePath: string, fileType: string): Promise<Record<string, string>[]> {
    if (fileType === 'xlsx' || fileType === 'xls') {
      return this.parseXlsx(filePath);
    }
    if (fileType === 'json') {
      return this.parseJson(filePath);
    }
    return this.parseCsv(filePath);
  }

  private parseCsv(filePath: string): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];
      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  private parseXlsx(filePath: string): Record<string, string>[] {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  private parseJson(filePath: string): Record<string, string>[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }

  private mapRow(row: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
    if (Object.keys(mapping).length === 0) {
      // Auto-detect common column names
      return {
        email: row.email || row.Email || row.EMAIL || row['E-mail'] || '',
        firstName: row.firstName || row.first_name || row['First Name'] || row.firstname || '',
        lastName: row.lastName || row.last_name || row['Last Name'] || row.lastname || '',
        phone: row.phone || row.Phone || row.PHONE || '',
        company: row.company || row.Company || row.COMPANY || row.organization || '',
      };
    }
    const result: Record<string, string> = {};
    for (const [field, column] of Object.entries(mapping)) {
      result[field] = row[column] || '';
    }
    return result;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
}
