import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; limit?: number; severity?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = { isDismissed: false };
    if (query.severity) where.severity = query.severity;
    const [data, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where, skip, take, orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.recommendation.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async dismiss(id: string) {
    await this.prisma.recommendation.update({
      where: { id },
      data: { isDismissed: true },
    });
  }

  async markRead(id: string) {
    await this.prisma.recommendation.update({
      where: { id },
      data: { isRead: true },
    });
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async evaluateRules() {
    this.logger.log('Evaluating recommendation rules...');

    const senders = await this.prisma.senderAccount.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const sender of senders) {
      await this.evaluateSenderRules(sender);
    }

    await this.evaluateContactRules();
    await this.evaluateCampaignRules();
  }

  async evaluateCampaignAfterSend(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.sentCount === 0) return;

    const bounceRate = campaign.bounceCount / campaign.sentCount;
    const complaintRate = campaign.complaintCount / campaign.sentCount;
    const openRate = campaign.openCount / campaign.sentCount;

    if (bounceRate > 0.05) {
      await this.createIfNotExists({
        type: 'HIGH_BOUNCE_RATE',
        severity: 'CRITICAL',
        title: 'High bounce rate detected',
        message: `Campaign "${campaign.name}" has a ${(bounceRate * 100).toFixed(1)}% bounce rate (>5%). Stop the campaign and clean your list.`,
        actionText: 'Review and clean your contact list before sending more emails.',
        resourceType: 'campaign',
        resourceId: campaignId,
      });
    }

    if (complaintRate > 0.001) {
      await this.createIfNotExists({
        type: 'HIGH_COMPLAINT_RATE',
        severity: 'CRITICAL',
        title: 'High spam complaint rate',
        message: `Campaign "${campaign.name}" has a ${(complaintRate * 100).toFixed(2)}% complaint rate (>0.1%). This will severely damage your sender reputation.`,
        actionText: 'Stop the campaign and review your sending practices.',
        resourceType: 'campaign',
        resourceId: campaignId,
      });
    }

    if (openRate < 0.05 && campaign.sentCount > 100) {
      await this.createIfNotExists({
        type: 'LOW_OPEN_RATE',
        severity: 'WARNING',
        title: 'Low open rate',
        message: `Campaign "${campaign.name}" has only a ${(openRate * 100).toFixed(1)}% open rate. Consider improving your subject line or sender reputation.`,
        actionText: 'Try A/B testing subject lines and improving sender reputation.',
        resourceType: 'campaign',
        resourceId: campaignId,
      });
    }
  }

  private async evaluateSenderRules(sender: any) {
    if (sender.healthScore < 50) {
      await this.createIfNotExists({
        type: 'LOW_SENDER_HEALTH',
        severity: sender.healthScore < 30 ? 'CRITICAL' : 'WARNING',
        title: `Sender health score is ${sender.healthScore}`,
        message: `The sender "${sender.name}" (${sender.fromEmail}) has a low health score. This may affect email deliverability.`,
        actionText: 'Review bounce rates, complaint rates, and check DNS authentication.',
        resourceType: 'sender',
        resourceId: sender.id,
      });
    }

    if (sender.status === 'ERROR') {
      await this.createIfNotExists({
        type: 'SMTP_ERROR',
        severity: 'CRITICAL',
        title: 'SMTP connection failure',
        message: `Sender "${sender.name}" failed to connect. Last error: ${sender.lastError || 'Unknown error'}`,
        actionText: 'Check SMTP credentials and server availability.',
        resourceType: 'sender',
        resourceId: sender.id,
      });
    }
  }

  private async evaluateContactRules() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const inactiveCount = await this.prisma.contact.count({
      where: {
        status: 'SUBSCRIBED',
        lastOpenedAt: { lt: ninetyDaysAgo },
        totalSent: { gt: 3 },
      },
    });

    if (inactiveCount > 100) {
      await this.createIfNotExists({
        type: 'INACTIVE_CONTACTS',
        severity: 'INFO',
        title: `${inactiveCount.toLocaleString()} contacts haven't opened in 90+ days`,
        message: 'Consider creating a re-engagement campaign or removing inactive contacts to improve deliverability.',
        actionText: 'Create a segment for inactive contacts and send a re-engagement campaign.',
        resourceType: null,
        resourceId: null,
      });
    }
  }

  private async evaluateCampaignRules() {
    // Check for campaigns without unsubscribe links (informational)
    const recentCampaigns = await this.prisma.campaign.findMany({
      where: { status: 'DRAFT', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { id: true, name: true, htmlContent: true },
    });

    for (const campaign of recentCampaigns) {
      if (!campaign.htmlContent.includes('unsubscribeUrl')) {
        await this.createIfNotExists({
          type: 'MISSING_UNSUBSCRIBE',
          severity: 'CRITICAL',
          title: 'Campaign missing unsubscribe link',
          message: `Campaign "${campaign.name}" does not contain an unsubscribe link. This is required by CAN-SPAM, GDPR, and most email providers.`,
          actionText: 'Add {{unsubscribeUrl}} to your email template.',
          resourceType: 'campaign',
          resourceId: campaign.id,
        });
      }
    }
  }

  private async createIfNotExists(data: {
    type: string; severity: string; title: string; message: string;
    actionText?: string; resourceType: string | null; resourceId: string | null;
  }) {
    const existing = await this.prisma.recommendation.findFirst({
      where: {
        type: data.type,
        resourceId: data.resourceId,
        isDismissed: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24h
      },
    });
    if (!existing) {
      await this.prisma.recommendation.create({ data: data as any });
    }
  }
}
