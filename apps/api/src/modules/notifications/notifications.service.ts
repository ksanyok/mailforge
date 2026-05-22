import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = { userId };
    if (query.unreadOnly) where.isRead = false;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
      },
    });
  }

  async notifyAdmins(data: {
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: data.type as any,
        title: data.title,
        message: data.message,
        metadata: data.metadata ?? undefined,
      })),
    });
  }
}
