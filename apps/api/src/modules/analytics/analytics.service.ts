import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalContacts, subscribedContacts, unsubscribedContacts,
      bouncedContacts, complainedContacts, suppressedContacts,
      totalCampaigns, sendingCampaigns, sentCampaigns,
      totalSenders, activeSenders,
    ] = await Promise.all([
      this.prisma.contact.count(),
      this.prisma.contact.count({ where: { status: 'SUBSCRIBED' } }),
      this.prisma.contact.count({ where: { status: 'UNSUBSCRIBED' } }),
      this.prisma.contact.count({ where: { status: 'BOUNCED' } }),
      this.prisma.contact.count({ where: { status: 'COMPLAINED' } }),
      this.prisma.contact.count({ where: { status: 'SUPPRESSED' } }),
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: 'SENDING' } }),
      this.prisma.campaign.count({ where: { status: 'SENT' } }),
      this.prisma.senderAccount.count(),
      this.prisma.senderAccount.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Sending metrics (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sentLast30, sentToday, openedLast30, clickedLast30, bouncedLast30, complainedLast30] =
      await Promise.all([
        this.prisma.campaignEvent.count({
          where: { eventType: 'SENT', createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.campaignEvent.count({
          where: { eventType: 'SENT', createdAt: { gte: today } },
        }),
        this.prisma.campaignEvent.count({
          where: { eventType: 'OPENED', createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.campaignEvent.count({
          where: { eventType: 'CLICKED', createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.campaignEvent.count({
          where: { eventType: { in: ['BOUNCED_HARD', 'BOUNCED_SOFT'] }, createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.campaignEvent.count({
          where: { eventType: 'COMPLAINED', createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

    const senderHealth = await this.prisma.senderAccount.aggregate({
      _avg: { healthScore: true },
      where: { status: 'ACTIVE' },
    });

    // Replied = contacts who have UNSUBSCRIBED status (they responded "not interested")
    // Plus contacts who clicked at least once (engaged)
    const repliedContacts = await this.prisma.contact.count({
      where: { status: 'UNSUBSCRIBED' },
    });

    return {
      contacts: {
        total: totalContacts,
        subscribed: subscribedContacts,
        unsubscribed: unsubscribedContacts,
        bounced: bouncedContacts,
        complained: complainedContacts,
        suppressed: suppressedContacts,
      },
      campaigns: {
        total: totalCampaigns,
        active: sendingCampaigns,
        sent: sentCampaigns,
      },
      sending: {
        sentToday,
        sentLast30Days: sentLast30,
        openRate: sentLast30 > 0 ? Math.round((openedLast30 / sentLast30) * 10000) / 100 : 0,
        clickRate: sentLast30 > 0 ? Math.round((clickedLast30 / sentLast30) * 10000) / 100 : 0,
        bounceRate: sentLast30 > 0 ? Math.round((bouncedLast30 / sentLast30) * 10000) / 100 : 0,
        complaintRate: sentLast30 > 0 ? Math.round((complainedLast30 / sentLast30) * 10000) / 100 : 0,
        openedLast30,
        clickedLast30,
        repliedContacts,
      },
      senders: {
        total: totalSenders,
        active: activeSenders,
        averageHealthScore: Math.round(senderHealth._avg.healthScore ?? 0),
      },
    };
  }

  async getDailyMetrics(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = await this.prisma.campaignEvent.findMany({
      where: { createdAt: { gte: startDate } },
      select: { eventType: true, createdAt: true },
    });

    // Group by date
    const byDate = new Map<string, Record<string, number>>();

    for (const event of events) {
      const date = event.createdAt.toISOString().split('T')[0];
      if (!byDate.has(date)) {
        byDate.set(date, { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, complained: 0 });
      }
      const day = byDate.get(date)!;
      switch (event.eventType) {
        case 'SENT': day.sent++; break;
        case 'OPENED': day.opened++; break;
        case 'CLICKED': day.clicked++; break;
        case 'BOUNCED_HARD':
        case 'BOUNCED_SOFT': day.bounced++; break;
        case 'UNSUBSCRIBED': day.unsubscribed++; break;
        case 'COMPLAINED': day.complained++; break;
      }
    }

    // Fill missing dates
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const date = d.toISOString().split('T')[0];
      result.push({ date, ...(byDate.get(date) ?? { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, complained: 0 }) });
    }
    return result;
  }

  async getSenderComparison() {
    const senders = await this.prisma.senderAccount.findMany({
      select: { id: true, name: true, fromEmail: true, totalSent: true, totalBounced: true, healthScore: true },
    });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Promise.all(
      senders.map(async (s) => {
        const [opened, sent] = await Promise.all([
          this.prisma.campaignEvent.count({
            where: { senderId: s.id, eventType: 'OPENED', createdAt: { gte: thirtyDaysAgo } },
          }),
          this.prisma.campaignEvent.count({
            where: { senderId: s.id, eventType: 'SENT', createdAt: { gte: thirtyDaysAgo } },
          }),
        ]);
        return {
          id: s.id,
          name: s.name,
          email: s.fromEmail,
          sent: s.totalSent,
          openRate: sent > 0 ? Math.round((opened / sent) * 10000) / 100 : 0,
          bounceRate: s.totalSent > 0 ? Math.round((s.totalBounced / s.totalSent) * 10000) / 100 : 0,
          healthScore: s.healthScore,
        };
      }),
    );
    return result;
  }

  async getCampaignComparison(limit = 10) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { status: { in: ['SENT', 'SENDING'] } },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true, name: true, sentCount: true, openCount: true, clickCount: true,
        bounceCount: true, complaintCount: true, unsubscribeCount: true, completedAt: true,
      },
    });
    return campaigns.map((c) => ({
      ...c,
      openRate: c.sentCount > 0 ? (c.openCount / c.sentCount) * 100 : 0,
      clickRate: c.sentCount > 0 ? (c.clickCount / c.sentCount) * 100 : 0,
      bounceRate: c.sentCount > 0 ? (c.bounceCount / c.sentCount) * 100 : 0,
    }));
  }
}
