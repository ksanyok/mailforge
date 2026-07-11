import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

export interface SmartListFilter {
  emailType?: 'CORPORATE' | 'FREE' | 'ALL';
  includeDomains?: string[];
  excludeDomains?: string[];
  excludeSubdomainsOf?: string[];
  requireWebsite?: boolean;
  status?: string;
}

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where = query.search ? { name: { contains: query.search } } : {};
    const [data, total] = await Promise.all([
      this.prisma.contactList.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.contactList.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const list = await this.prisma.contactList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  async create(dto: { name: string; description?: string }) {
    return this.prisma.contactList.create({ data: dto });
  }

  /** Build a Prisma `where` for Contact from domain/type filter rules. */
  private buildFilterWhere(f: SmartListFilter): any {
    const norm = (arr?: string[]) =>
      (arr ?? [])
        .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);

    const and: any[] = [];
    // Only sendable contacts by default
    and.push({ status: f.status ?? 'SUBSCRIBED' });

    if (f.emailType === 'CORPORATE' || f.emailType === 'FREE') {
      and.push({ emailType: f.emailType });
    }
    const include = norm(f.includeDomains);
    if (include.length) and.push({ emailDomain: { in: include } });

    const exclude = norm(f.excludeDomains);
    if (exclude.length) and.push({ emailDomain: { notIn: exclude } });

    const excludeSub = norm(f.excludeSubdomainsOf);
    for (const base of excludeSub) {
      and.push({ NOT: { OR: [{ emailDomain: base }, { emailDomain: { endsWith: `.${base}` } }] } });
    }
    if (f.requireWebsite) and.push({ website: { not: null } });

    return { AND: and };
  }

  /** Count how many contacts match a filter (for live preview). */
  async previewFilter(f: SmartListFilter) {
    const where = this.buildFilterWhere(f);
    const [total, corporate, free] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.count({ where: { AND: [where, { emailType: 'CORPORATE' }] } }),
      this.prisma.contact.count({ where: { AND: [where, { emailType: 'FREE' }] } }),
    ]);
    return { total, corporate, free };
  }

  /** Create a static list materialized from a domain/type filter. */
  async createFromFilter(dto: { name: string; description?: string; filter: SmartListFilter }) {
    const where = this.buildFilterWhere(dto.filter);
    const list = await this.prisma.contactList.create({
      data: { name: dto.name, description: dto.description },
    });

    let added = 0;
    let cursor: string | undefined;
    // Batch through matching contacts and insert membership rows.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await this.prisma.contact.findMany({
        where,
        select: { id: true },
        take: 1000,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      await this.prisma.contactListMember.createMany({
        data: batch.map((c) => ({ listId: list.id, contactId: c.id })),
        skipDuplicates: true,
      });
      added += batch.length;
      cursor = batch[batch.length - 1].id;
      if (batch.length < 1000) break;
    }

    await this.prisma.contactList.update({
      where: { id: list.id },
      data: { contactCount: added },
    });
    return { list, added };
  }

  async update(id: string, dto: { name?: string; description?: string }) {
    await this.findOne(id);
    return this.prisma.contactList.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.campaignList.deleteMany({ where: { listId: id } });
    await this.prisma.import.updateMany({ where: { listId: id }, data: { listId: null } });
    await this.prisma.contactList.delete({ where: { id } });
  }

  async addMembers(listId: string, contactIds: string[]) {
    await this.findOne(listId);
    const existing = await this.prisma.contactListMember.findMany({
      where: { listId, contactId: { in: contactIds } },
      select: { contactId: true },
    });
    const existingSet = new Set(existing.map((m) => m.contactId));
    const newIds = contactIds.filter((id) => !existingSet.has(id));
    if (newIds.length > 0) {
      await this.prisma.contactListMember.createMany({
        data: newIds.map((contactId) => ({ listId, contactId })),
        skipDuplicates: true,
      });
      await this.prisma.contactList.update({
        where: { id: listId },
        data: { contactCount: { increment: newIds.length } },
      });
    }
    return { added: newIds.length };
  }

  async getMembers(listId: string, query: { page?: number; limit?: number }) {
    await this.findOne(listId);
    const { skip, take, page, limit } = getPaginationParams(query);
    const [members, total] = await Promise.all([
      this.prisma.contactListMember.findMany({
        where: { listId },
        skip,
        take,
        include: { contact: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } },
        orderBy: { addedAt: 'desc' },
      }),
      this.prisma.contactListMember.count({ where: { listId } }),
    ]);
    return buildPaginatedResponse(members, total, page, limit);
  }

  async getContacts(listId: string, query: { page?: number; limit?: number }) {
    await this.findOne(listId);
    const { skip, take, page, limit } = getPaginationParams(query);
    const [members, total] = await Promise.all([
      this.prisma.contactListMember.findMany({
        where: { listId },
        skip,
        take,
        include: { contact: true },
        orderBy: { addedAt: 'desc' },
      }),
      this.prisma.contactListMember.count({ where: { listId } }),
    ]);
    return buildPaginatedResponse(members.map((m) => m.contact), total, page, limit);
  }

  async removeMembers(listId: string, contactIds: string[]) {
    await this.prisma.contactListMember.deleteMany({
      where: { listId, contactId: { in: contactIds } },
    });
    await this.prisma.contactList.update({
      where: { id: listId },
      data: { contactCount: { decrement: contactIds.length } },
    });
    return { removed: contactIds.length };
  }

  async removeContact(listId: string, contactId: string) {
    await this.prisma.contactListMember.delete({
      where: { contactId_listId: { contactId, listId } },
    });
    await this.prisma.contactList.update({
      where: { id: listId },
      data: { contactCount: { decrement: 1 } },
    });
  }
}
