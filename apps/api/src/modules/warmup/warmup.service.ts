import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class WarmupService {
  private readonly logger = new Logger(WarmupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRule(senderId: string) {
    return this.prisma.warmupRule.findUnique({ where: { senderId } });
  }

  async upsertRule(senderId: string, dto: {
    initialDailyVolume?: number; dailyIncreasePercent?: number; maxDailyLimit?: number;
    minOpenRate?: number; maxBounceRate?: number; maxComplaintRate?: number;
    cooldownDays?: number; autoPauseOnCritical?: boolean;
  }) {
    return this.prisma.warmupRule.upsert({
      where: { senderId },
      create: { senderId, ...dto },
      update: dto,
    });
  }

  async getLogs(senderId: string) {
    return this.prisma.warmupLog.findMany({
      where: { senderId },
      orderBy: { date: 'desc' },
      take: 30,
    });
  }

  @Cron('5 0 * * *') // 00:05 UTC daily
  async advanceAllSenders() {
    this.logger.log('🔥 Running daily warmup advancement...');
    const senders = await this.prisma.senderAccount.findMany({
      where: { warmupEnabled: true, status: 'ACTIVE' },
      include: { warmupRule: true },
    });

    for (const sender of senders) {
      try {
        await this.advanceSender(sender);
      } catch (err) {
        this.logger.error(`Failed to advance warmup for sender ${sender.id}:`, err);
      }
    }
  }

  async advanceSender(sender: any) {
    const rule = sender.warmupRule;
    if (!rule) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    const [sent, bounced, complained, opened] = await Promise.all([
      this.prisma.campaignEvent.count({
        where: { senderId: sender.id, eventType: 'SENT', createdAt: { gte: yesterday, lt: today } },
      }),
      this.prisma.campaignEvent.count({
        where: { senderId: sender.id, eventType: { in: ['BOUNCED_HARD', 'BOUNCED_SOFT'] }, createdAt: { gte: yesterday, lt: today } },
      }),
      this.prisma.campaignEvent.count({
        where: { senderId: sender.id, eventType: 'COMPLAINED', createdAt: { gte: yesterday, lt: today } },
      }),
      this.prisma.campaignEvent.count({
        where: { senderId: sender.id, eventType: 'OPENED', createdAt: { gte: yesterday, lt: today } },
      }),
    ]);

    const bounceRate = sent > 0 ? bounced / sent : 0;
    const complaintRate = sent > 0 ? complained / sent : 0;
    const openRate = sent > 0 ? opened / sent : 0;

    let stageAdvanced = false;
    let notes = '';

    const isCritical = bounceRate > rule.maxBounceRate || complaintRate > rule.maxComplaintRate;

    if (isCritical && rule.autoPauseOnCritical) {
      await this.prisma.senderAccount.update({
        where: { id: sender.id },
        data: { status: 'PAUSED' },
      });
      notes = `Auto-paused: bounce=${(bounceRate * 100).toFixed(1)}%, complaint=${(complaintRate * 100).toFixed(2)}%`;
      this.logger.warn(`Sender ${sender.id} auto-paused due to critical metrics`);

      await this.prisma.notification.create({
        data: {
          userId: (await this.prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id ?? '',
          type: 'WARMUP_PAUSED',
          title: 'Warmup Auto-Paused',
          message: `Sender "${sender.name}" was auto-paused. ${notes}`,
        },
      });
    } else if (!isCritical && sent > 0) {
      const newLimit = Math.min(
        Math.floor(sender.warmupCurrentDailyLimit * (1 + rule.dailyIncreasePercent / 100)),
        rule.maxDailyLimit,
      );

      if (newLimit > sender.warmupCurrentDailyLimit) {
        await this.prisma.senderAccount.update({
          where: { id: sender.id },
          data: {
            warmupStage: { increment: 1 },
            warmupCurrentDailyLimit: newLimit,
          },
        });
        stageAdvanced = true;
        notes = `Stage advanced. New daily limit: ${newLimit}`;
        this.logger.log(`Sender ${sender.id} warmup advanced to ${newLimit}/day`);
      }
    }

    const targetVolume = sender.warmupCurrentDailyLimit;
    await this.prisma.warmupLog.create({
      data: {
        senderId: sender.id,
        date: yesterday,
        targetVolume,
        actualVolume: sent,
        bounceRate,
        openRate,
        complaintRate,
        stageAdvanced,
        notes,
      },
    });
  }

  async getProgress(senderId: string) {
    const sender = await this.prisma.senderAccount.findUnique({
      where: { id: senderId },
      include: { warmupRule: true },
    });
    if (!sender) return null;

    const logs = await this.getLogs(senderId);
    const rule = sender.warmupRule;

    return {
      senderId,
      senderName: sender.name,
      status: sender.status,
      warmupEnabled: sender.warmupEnabled,
      currentStage: sender.warmupStage,
      currentDailyLimit: sender.warmupCurrentDailyLimit,
      maxDailyLimit: rule?.maxDailyLimit ?? sender.dailyLimit,
      progressPercent: rule
        ? Math.min(100, Math.floor((sender.warmupCurrentDailyLimit / rule.maxDailyLimit) * 100))
        : 0,
      logs,
      rule,
    };
  }
}
