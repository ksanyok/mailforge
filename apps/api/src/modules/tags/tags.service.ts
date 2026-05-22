import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: { name: string; color?: string }) {
    return this.prisma.tag.create({ data: dto });
  }

  async update(id: string, dto: { name?: string; color?: string }) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    return this.prisma.tag.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { id } });
  }
}
