import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';
import { generateUnsubscribeToken } from '../../shared/utils/tokens.util';
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

@Injectable()
export class ContactsService {
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

    const contact = await this.prisma.contact.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        company: dto.company,
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
    if (!emailRegex.test(email)) return 'INVALID';

    const [localPart, domain] = email.toLowerCase().split('@');

    if (DISPOSABLE_DOMAINS.includes(domain)) return 'DISPOSABLE';

    if (ROLE_BASED_PREFIXES.some((prefix) => localPart === prefix || localPart.startsWith(prefix + '.'))) {
      return 'ROLE_BASED';
    }

    return 'VALID';
  }

  private calculateRiskScore(validationStatus: ValidationStatus): number {
    switch (validationStatus) {
      case 'INVALID': return 90;
      case 'DISPOSABLE': return 80;
      case 'ROLE_BASED': return 50;
      case 'RISKY': return 60;
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
