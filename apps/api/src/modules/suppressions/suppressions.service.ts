import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

@Injectable()
export class SuppressionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where = query.search ? { email: { contains: query.search } } : {};
    const [data, total] = await Promise.all([
      this.prisma.suppression.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.suppression.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async isSupressed(email: string): Promise<boolean> {
    const sup = await this.prisma.suppression.findUnique({ where: { email: email.toLowerCase() } });
    return !!sup;
  }

  async suppress(dto: { email: string; reason?: string; notes?: string }) {
    const email = dto.email.toLowerCase().trim();
    return this.prisma.suppression.upsert({
      where: { email },
      create: {
        email,
        reason: (dto.reason as any) ?? 'MANUAL',
        notes: dto.notes,
      },
      update: { notes: dto.notes },
    });
  }

  async bulkSuppress(emails: string[], reason = 'MANUAL') {
    const data = emails.map((email) => ({
      email: email.toLowerCase().trim(),
      reason: reason as any,
    }));
    return this.prisma.suppression.createMany({ data, skipDuplicates: true });
  }

  async remove(id: string) {
    await this.prisma.suppression.delete({ where: { id } });
  }
}
