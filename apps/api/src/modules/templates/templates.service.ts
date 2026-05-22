import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { extractVariables } from '../../shared/utils/interpolate.util';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; search?: string; category?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = {};
    if (query.search) where.name = { contains: query.search };
    if (query.category) where.category = query.category;
    const [data, total] = await Promise.all([
      this.prisma.emailTemplate.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.emailTemplate.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async create(dto: { name: string; category?: string; htmlContent: string; textContent?: string }) {
    const variables = extractVariables(dto.htmlContent);
    return this.prisma.emailTemplate.create({
      data: { ...dto, variables },
    });
  }

  async update(id: string, dto: { name?: string; category?: string; htmlContent?: string; textContent?: string }) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.htmlContent) {
      data.variables = extractVariables(dto.htmlContent);
    }
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  async remove(id: string) {
    const tpl = await this.findOne(id);
    if (tpl.isSystem) throw new Error('Cannot delete system template');
    await this.prisma.emailTemplate.delete({ where: { id } });
  }
}
