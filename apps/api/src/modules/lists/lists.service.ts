import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

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

  async update(id: string, dto: { name?: string; description?: string }) {
    await this.findOne(id);
    return this.prisma.contactList.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contactList.delete({ where: { id } });
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
