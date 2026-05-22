import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; userId?: string; resourceType?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.resourceType) where.resourceType = query.resourceType;

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async log(data: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.activityLog.create({ data });
  }
}
