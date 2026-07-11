import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { promises as dns } from 'dns';
import * as net from 'net';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';
import { generateUnsubscribeToken } from '../../shared/utils/tokens.util';
import { classifyEmail } from '../../shared/utils/email-domain.util';
import { ContactStatus, ValidationStatus } from '@mailforge/shared';

const ROLE_BASED_PREFIXES = [
  'info', 'support', 'admin', 'administrator', 'postmaster', 'hostmaster',
  'webmaster', 'noreply', 'no-reply', 'sales', 'marketing', 'contact',
  'hello', 'team', 'help', 'abuse', 'security', 'privacy', 'legal',
  'billing', 'newsletter', 'notifications', 'alerts', 'updates',
];

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'temp-mail.org', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
  'guerrillamail.net', 'guerrillamail.org', 'spam4.me', 'trashmail.com',
  'trashmail.me', 'trashmail.net', 'fakeinbox.com', 'tempinbox.com',
  'dispostable.com', 'mailnesia.com', 'mailnull.com', 'spamgourmet.com',
];

// Domains that always accept any address (catch-all) — skip SMTP check
const CATCH_ALL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me',
  'aol.com', 'zoho.com',
];

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    listId?: string;
    tagId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where: any = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search } },
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { company: { contains: query.search } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.listId) {
      where.listMembers = { some: { listId: query.listId } };
    }
    if (query.tagId) {
      where.contactTags = { some: { tagId: query.tagId } };
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contactTags: { include: { tag: true } },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((c) => ({ ...c, tags: c.contactTags.map((ct) => ct.tag) })),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        contactTags: { include: { tag: true } },
        notes: { orderBy: { createdAt: 'desc' } },
        listMembers: { include: { list: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return {
      ...contact,
      tags: contact.contactTags.map((ct) => ct.tag),
      lists: contact.listMembers.map((lm) => lm.list),
    };
  }

  async create(dto: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    customFields?: Record<string, unknown>;
    listIds?: string[];
    tagIds?: string[];
  }) {
    const existing = await this.prisma.contact.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Contact with this email already exists');

    const validationStatus = this.validateEmail(dto.email);
    const unsubscribeToken = generateUnsubscribeToken();
    const cls = classifyEmail(dto.email);
    const website = typeof dto.customFields?.website === 'string' ? (dto.customFields.website as string) : undefined;

    const contact = await this.prisma.contact.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        company: dto.company,
        website,
        emailDomain: cls.domain,
        emailType: cls.type,
        customFields: dto.customFields ?? {},
        validationStatus,
        riskScore: this.calculateRiskScore(validationStatus),
        unsubscribeToken,
        ...(dto.listIds?.length && {
          listMembers: {
            create: dto.listIds.map((listId) => ({ listId })),
          },
        }),
        ...(dto.tagIds?.length && {
          contactTags: {
            create: dto.tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: { contactTags: { include: { tag: true } } },
    });

    // Update list counts
    if (dto.listIds?.length) {
      await this.incrementListCounts(dto.listIds, 1);
    }

    return { ...contact, tags: contact.contactTags.map((ct) => ct.tag) };
  }

  async update(
    id: string,
    dto: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      company?: string;
      customFields?: Record<string, unknown>;
      status?: ContactStatus;
    },
  ) {
    await this.findOne(id);
    return this.prisma.contact.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: { listMembers: true },
    });
    if (contact?.listMembers.length) {
      const listIds = contact.listMembers.map((m) => m.listId);
      await this.incrementListCounts(listIds, -1);
    }
    await this.prisma.contact.delete({ where: { id } });
  }

  async bulkAction(dto: {
    contactIds: string[];
    action: string;
    listId?: string;
    tagId?: string;
  }) {
    const { contactIds, action } = dto;

    switch (action) {
      case 'suppress':
        await this.prisma.contact.updateMany({
          where: { id: { in: contactIds } },
          data: { status: 'SUPPRESSED' },
        });
        break;

      case 'unsubscribe':
        await this.prisma.contact.updateMany({
          where: { id: { in: contactIds } },
          data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
        });
        break;

      case 'delete':
        await this.prisma.contact.deleteMany({
          where: { id: { in: contactIds } },
        });
        break;

      case 'addToList':
        if (!dto.listId) break;
        await this.prisma.contactListMember.createMany({
          data: contactIds.map((contactId) => ({
            contactId,
            listId: dto.listId!,
          })),
          skipDuplicates: true,
        });
        await this.incrementListCounts([dto.listId], contactIds.length);
        break;

      case 'addTag':
        if (!dto.tagId) break;
        await this.prisma.contactTag.createMany({
          data: contactIds.map((contactId) => ({
            contactId,
            tagId: dto.tagId!,
          })),
          skipDuplicates: true,
        });
        break;
    }

    return { affected: contactIds.length };
  }

  async addNote(contactId: string, content: string) {
    await this.findOne(contactId);
    return this.prisma.contactNote.create({
      data: { contactId, content },
    });
  }

  private validateEmail(email: string): ValidationStatus {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return ValidationStatus.INVALID;

    const [localPart, domain] = email.toLowerCase().split('@');

    if (DISPOSABLE_DOMAINS.includes(domain)) return ValidationStatus.DISPOSABLE;

    if (ROLE_BASED_PREFIXES.some((prefix) => localPart === prefix || localPart.startsWith(prefix + '.'))) {
      return ValidationStatus.ROLE_BASED;
    }

    return ValidationStatus.VALID;
  }

  private async checkMxRecord(domain: string): Promise<boolean> {
    try {
      const records = await dns.resolveMx(domain);
      return records.length > 0;
    } catch {
      return false;
    }
  }

  // SMTP handshake verification: connect to MX, do RCPT TO, disconnect
  // Returns 'valid' | 'invalid' | 'catch_all' | 'unknown'
  private async smtpVerify(email: string, domain: string): Promise<'valid' | 'invalid' | 'catch_all' | 'unknown'> {
    if (CATCH_ALL_DOMAINS.includes(domain)) return 'catch_all';

    let mxHost: string;
    try {
      const records = await dns.resolveMx(domain);
      if (!records.length) return 'invalid';
      records.sort((a, b) => a.priority - b.priority);
      mxHost = records[0].exchange;
    } catch {
      return 'invalid';
    }

    return new Promise((resolve) => {
      const socket = net.createConnection({ host: mxHost, port: 25 });
      let buf = '';
      let stage = 0;
      const done = (result: 'valid' | 'invalid' | 'catch_all' | 'unknown') => {
        socket.destroy();
        resolve(result);
      };
      const timer = setTimeout(() => done('unknown'), 8000);

      socket.on('data', (chunk) => {
        buf += chunk.toString();
        if (!buf.endsWith('\n')) return;

        const line = buf.trim();
        buf = '';

        if (stage === 0 && line.startsWith('220')) {
          socket.write(`EHLO mail.senior-dev.cloud\r\n`);
          stage = 1;
        } else if (stage === 1 && (line.startsWith('250') || line.startsWith('220'))) {
          socket.write(`MAIL FROM:<verify@senior-dev.cloud>\r\n`);
          stage = 2;
        } else if (stage === 2 && line.startsWith('250')) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          stage = 3;
        } else if (stage === 3) {
          clearTimeout(timer);
          socket.write('QUIT\r\n');
          if (line.startsWith('250') || line.startsWith('251')) {
            done('valid');
          } else if (line.startsWith('550') || line.startsWith('551') || line.startsWith('553') || line.startsWith('554')) {
            done('invalid');
          } else if (line.startsWith('450') || line.startsWith('451') || line.startsWith('452')) {
            // Temporary failure — treat as unknown
            done('unknown');
          } else {
            done('unknown');
          }
        } else if (line.startsWith('4') || line.startsWith('5')) {
          clearTimeout(timer);
          done('unknown');
        }
      });

      socket.on('error', () => { clearTimeout(timer); resolve('unknown'); });
      socket.on('timeout', () => { clearTimeout(timer); resolve('unknown'); });
      socket.setTimeout(8000);
    });
  }

  async verifyEmailMx(email: string): Promise<{ valid: boolean; hasMx: boolean; smtpResult: string; reason: string }> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, hasMx: false, smtpResult: 'skipped', reason: 'Invalid email format' };
    }
    const [, domain] = email.toLowerCase().split('@');
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return { valid: false, hasMx: false, smtpResult: 'skipped', reason: 'Disposable email domain' };
    }
    const hasMx = await this.checkMxRecord(domain);
    if (!hasMx) {
      return { valid: false, hasMx: false, smtpResult: 'skipped', reason: 'Domain has no MX record' };
    }
    const smtpResult = await this.smtpVerify(email, domain);
    return {
      valid: smtpResult !== 'invalid',
      hasMx: true,
      smtpResult,
      reason: smtpResult === 'valid' ? 'OK — address exists'
        : smtpResult === 'invalid' ? 'Address rejected by mail server'
        : smtpResult === 'catch_all' ? 'OK — domain accepts all addresses (cannot verify individual mailbox)'
        : 'OK — domain has MX (server did not confirm individual address)',
    };
  }

  async verifyContactsList(listId: string): Promise<{ total: number; invalid: number; marked: number; skipped: number }> {
    const members = await this.prisma.contactListMember.findMany({
      where: { listId },
      include: { contact: { select: { id: true, email: true, status: true } } },
    });

    let invalid = 0;
    let marked = 0;
    let skipped = 0;
    const mxCache = new Map<string, boolean>();
    const smtpCache = new Map<string, string>();

    for (const m of members) {
      const contact = m.contact;
      if (['BOUNCED', 'UNSUBSCRIBED', 'SUPPRESSED'].includes(contact.status)) {
        skipped++;
        continue;
      }

      const email = contact.email.toLowerCase();
      const [, domain] = email.split('@');

      // Step 1: MX check (cached per domain)
      let hasMx: boolean;
      if (mxCache.has(domain)) {
        hasMx = mxCache.get(domain)!;
      } else {
        hasMx = await this.checkMxRecord(domain);
        mxCache.set(domain, hasMx);
      }

      if (!hasMx) {
        invalid++;
        await this.markBounced(contact.id, contact.email);
        marked++;
        continue;
      }

      // Step 2: SMTP verification (skip catch-all domains to avoid false positives)
      if (!CATCH_ALL_DOMAINS.includes(domain)) {
        let smtpResult: string;
        if (smtpCache.has(email)) {
          smtpResult = smtpCache.get(email)!;
        } else {
          smtpResult = await this.smtpVerify(email, domain);
          smtpCache.set(email, smtpResult);
        }

        if (smtpResult === 'invalid') {
          invalid++;
          await this.markBounced(contact.id, contact.email);
          marked++;
        }
      }
    }

    this.logger.log(`List ${listId} verified: ${members.length} total, ${invalid} invalid, ${marked} marked BOUNCED`);
    return { total: members.length, invalid, marked, skipped };
  }

  private async markBounced(contactId: string, email: string): Promise<void> {
    await this.prisma.contact.update({
      where: { id: contactId },
      data: { status: 'BOUNCED', validationStatus: 'INVALID' },
    });
    await this.prisma.suppression.upsert({
      where: { email },
      create: { email, reason: 'BOUNCE_HARD' },
      update: { reason: 'BOUNCE_HARD' },
    }).catch(() => null);
  }

  private calculateRiskScore(validationStatus: ValidationStatus): number {
    switch (validationStatus) {
      case ValidationStatus.INVALID: return 90;
      case ValidationStatus.DISPOSABLE: return 80;
      case ValidationStatus.ROLE_BASED: return 50;
      case ValidationStatus.RISKY: return 60;
      default: return 10;
    }
  }

  private async incrementListCounts(listIds: string[], delta: number) {
    await Promise.all(
      listIds.map((id) =>
        this.prisma.contactList.update({
          where: { id },
          data: { contactCount: { increment: delta } },
        }),
      ),
    );
  }
}
