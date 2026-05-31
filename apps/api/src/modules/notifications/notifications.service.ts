import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = { userId };
    if (query.unreadOnly) where.isRead = false;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
      },
    });
    // Forward to email if configured
    await this.maybeSendEmailForward(data.title, data.message).catch(() => null);
    return notification;
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

    await (this.prisma.notification.createMany as any)({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata ?? undefined,
      })),
    });

    // Forward to email if configured
    await this.maybeSendEmailForward(data.title, data.message).catch(() => null);
  }

  // ── Email forwarding ─────────────────────────────────────────────────

  private async maybeSendEmailForward(title: string, message: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'notifications.forwardEmail' },
    }).catch(() => null);

    const forwardTo = setting?.value?.trim();
    if (!forwardTo) return;

    // Use the first active sender for SMTP, or fall back to a no-reply
    const sender = await this.prisma.senderAccount.findFirst({
      where: { status: 'ACTIVE' },
      select: { fromEmail: true, fromName: true, smtpHost: true, smtpPort: true, smtpUser: true, smtpPasswordEncrypted: true, smtpEncryption: true },
    });
    if (!sender) return;

    const { decrypt } = await import('../../shared/utils/crypto.util');
    const encKey = this.config.get('ENCRYPTION_KEY', '');
    const password = decrypt(sender.smtpPasswordEncrypted, encKey);

    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpEncryption === 'TLS',
      auth: { user: sender.smtpUser, pass: password },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"${sender.fromName}" <${sender.fromEmail}>`,
      to: forwardTo,
      subject: `[MailForge] ${title}`,
      text: `${title}\n\n${message}\n\n---\nSent by MailForge notifications system`,
      html: `<p><strong>${title}</strong></p><p>${message}</p><hr><p style="color:#888;font-size:12px">Sent by MailForge</p>`,
    });

    this.logger.log(`Notification forwarded to ${forwardTo}: ${title}`);
  }
}
