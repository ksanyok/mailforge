import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../core/database/prisma.service';
import { encrypt, decrypt } from '../../shared/utils/crypto.util';
import { calculateHealthScore } from '../../shared/utils/health-score.util';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

@Injectable()
export class SendersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where = query.search ? {
      OR: [
        { name: { contains: query.search } },
        { fromEmail: { contains: query.search } },
      ],
    } : {};
    const [data, total] = await Promise.all([
      this.prisma.senderAccount.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        select: this.selectFields(),
      }),
      this.prisma.senderAccount.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const sender = await this.prisma.senderAccount.findUnique({
      where: { id },
      select: this.selectFields(),
    });
    if (!sender) throw new NotFoundException('Sender account not found');
    return sender;
  }

  async create(dto: {
    name: string; fromName: string; fromEmail: string; replyTo?: string;
    smtpHost: string; smtpPort: number; smtpEncryption?: string;
    smtpUser: string; smtpPassword: string;
    dailyLimit?: number; hourlyLimit?: number; perMinuteLimit?: number;
    warmupEnabled?: boolean; rotationPriority?: number; rotationWeight?: number;
  }) {
    const encryptionKey = this.config.getOrThrow('ENCRYPTION_KEY');
    const smtpPasswordEncrypted = encrypt(dto.smtpPassword, encryptionKey);

    return this.prisma.senderAccount.create({
      data: {
        name: dto.name,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        replyTo: dto.replyTo,
        smtpHost: dto.smtpHost,
        smtpPort: dto.smtpPort,
        smtpEncryption: (dto.smtpEncryption as any) ?? 'TLS',
        smtpUser: dto.smtpUser,
        smtpPasswordEncrypted,
        dailyLimit: dto.dailyLimit ?? 500,
        hourlyLimit: dto.hourlyLimit ?? 100,
        perMinuteLimit: dto.perMinuteLimit ?? 10,
        warmupEnabled: dto.warmupEnabled ?? true,
        rotationPriority: dto.rotationPriority ?? 1,
        rotationWeight: dto.rotationWeight ?? 1,
      },
      select: this.selectFields(),
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const data: any = { ...dto };

    if (dto.smtpPassword) {
      const encryptionKey = this.config.getOrThrow('ENCRYPTION_KEY');
      data.smtpPasswordEncrypted = encrypt(dto.smtpPassword, encryptionKey);
      delete data.smtpPassword;
    }

    return this.prisma.senderAccount.update({
      where: { id },
      data,
      select: this.selectFields(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.senderAccount.delete({ where: { id } });
  }

  async testConnection(id: string, testTo: string) {
    const sender = await this.prisma.senderAccount.findUniqueOrThrow({ where: { id } });
    const encryptionKey = this.config.getOrThrow('ENCRYPTION_KEY');
    const password = decrypt(sender.smtpPasswordEncrypted, encryptionKey);

    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpEncryption === 'TLS',
      auth: { user: sender.smtpUser, pass: password },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
    });

    try {
      await transporter.verify();

      await transporter.sendMail({
        from: `"${sender.fromName}" <${sender.fromEmail}>`,
        to: testTo,
        subject: '✅ MailForge SMTP Test',
        text: 'This is a test email from MailForge. Your SMTP connection is working correctly.',
        html: '<p>This is a test email from <strong>MailForge</strong>. Your SMTP connection is working correctly.</p>',
      });

      await this.prisma.senderAccount.update({
        where: { id },
        data: { status: 'ACTIVE', lastSuccessAt: new Date(), lastError: null },
      });

      return { success: true, message: 'SMTP connection successful. Test email sent.' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      await this.prisma.senderAccount.update({
        where: { id },
        data: { status: 'ERROR', lastErrorAt: new Date(), lastError: errorMsg },
      });
      throw new BadRequestException(`SMTP test failed: ${errorMsg}`);
    } finally {
      transporter.close();
    }
  }

  async updateHealthScore(id: string) {
    const sender = await this.prisma.senderAccount.findUnique({ where: { id } });
    if (!sender) return;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [sent, bounced, complained, opened] = await Promise.all([
      this.prisma.campaignEvent.count({ where: { senderId: id, eventType: 'SENT', createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.campaignEvent.count({ where: { senderId: id, eventType: { in: ['BOUNCED_HARD', 'BOUNCED_SOFT'] }, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.campaignEvent.count({ where: { senderId: id, eventType: 'COMPLAINED', createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.campaignEvent.count({ where: { senderId: id, eventType: 'OPENED', createdAt: { gte: sevenDaysAgo } } }),
    ]);

    const healthScore = calculateHealthScore({
      bounceRate: sent > 0 ? bounced / sent : 0,
      complaintRate: sent > 0 ? complained / sent : 0,
      openRate: sent > 0 ? opened / sent : 0,
      smtpOnline: sender.status !== 'ERROR',
    });

    await this.prisma.senderAccount.update({ where: { id }, data: { healthScore } });
    await this.prisma.senderHealthLog.create({
      data: {
        senderId: id,
        healthScore,
        sentToday: sent,
        bouncesToday: bounced,
        complaintsToday: complained,
        opensToday: opened,
      },
    });

    return healthScore;
  }

  async getHealthLogs(id: string) {
    return this.prisma.senderHealthLog.findMany({
      where: { senderId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  getDecryptedPassword(sender: { smtpPasswordEncrypted: string }): string {
    return decrypt(sender.smtpPasswordEncrypted, this.config.getOrThrow('ENCRYPTION_KEY'));
  }

  private selectFields() {
    return {
      id: true, name: true, fromName: true, fromEmail: true, replyTo: true,
      smtpHost: true, smtpPort: true, smtpEncryption: true, smtpUser: true,
      dailyLimit: true, hourlyLimit: true, perMinuteLimit: true,
      warmupEnabled: true, warmupStage: true, warmupCurrentDailyLimit: true,
      rotationPriority: true, rotationWeight: true, status: true, healthScore: true,
      lastSuccessAt: true, lastErrorAt: true, lastError: true,
      totalSent: true, totalBounced: true, totalComplaints: true,
      createdAt: true, updatedAt: true,
    };
  }
}
