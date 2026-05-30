import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where = query.search
      ? {
          OR: [
            { email: { contains: query.search } },
            { name: { contains: query.search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true, email: true, name: true, role: true, isActive: true,
          twoFactorEnabled: true, lastLoginAt: true, createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        twoFactorEnabled: true, lastLoginAt: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: { name?: string; role?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto as any,
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    requesterId: string,
  ) {
    if (id !== requesterId) {
      throw new ForbiddenException('Cannot change another user\'s password');
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const valid = await bcryptjs.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ForbiddenException('Current password is incorrect');

    const passwordHash = await bcryptjs.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash, refreshToken: null } });
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('Cannot delete your own account');
    }
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }
}
