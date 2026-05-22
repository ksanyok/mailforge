import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('imports') private readonly importsQueue: Queue,
  ) {}

  async findAll(query: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const [data, total] = await Promise.all([
      this.prisma.import.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { list: { select: { id: true, name: true } } },
      }),
      this.prisma.import.count(),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const imp = await this.prisma.import.findUnique({
      where: { id },
      include: {
        list: true,
        errors: { take: 100, orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!imp) throw new NotFoundException('Import not found');
    return imp;
  }

  async createImport(
    file: Express.Multer.File,
    dto: { listId?: string; dedupeRule?: string; columnMapping?: Record<string, string> },
    userId: string,
  ) {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const importsDir = path.join(uploadDir, 'imports');
    if (!fs.existsSync(importsDir)) {
      fs.mkdirSync(importsDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(importsDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const importRecord = await this.prisma.import.create({
      data: {
        filename: file.originalname,
        fileType: ext,
        status: 'PENDING',
        listId: dto.listId,
        columnMapping: dto.columnMapping ?? {},
        dedupeRule: (dto.dedupeRule as any) ?? 'SKIP',
        createdBy: userId,
      },
    });

    await this.importsQueue.add('process-import', {
      importId: importRecord.id,
      filePath,
      fileType: ext,
      columnMapping: dto.columnMapping ?? {},
      dedupeRule: dto.dedupeRule ?? 'SKIP',
      listId: dto.listId,
    });

    return importRecord;
  }

  async getErrors(importId: string, query: { page?: number; limit?: number }) {
    await this.findOne(importId);
    const { skip, take, page, limit } = getPaginationParams(query);
    const [data, total] = await Promise.all([
      this.prisma.importError.findMany({
        where: { importId },
        skip,
        take,
        orderBy: { rowNumber: 'asc' },
      }),
      this.prisma.importError.count({ where: { importId } }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }
}
