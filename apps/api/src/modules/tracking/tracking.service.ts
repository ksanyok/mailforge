import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isBot(userAgent: string): boolean {
    return /bot|crawler|spider|scanner|preview|prefetch|fetch|curl|wget|python|java|go-http|okhttp|axios|node-fetch|google|yahoo|baidu|bing|slurp|msnbot|teoma|ia_archiver|duckduckbot|exabot|facebot|bingpreview|googleimageproxy|google-apps-script/i.test(userAgent);
  }

  async handleOpen(token: string, userAgent: string, ipAddress: string) {
    if (this.isBot(userAgent)) {
      this.logger.debug(`Ignoring open from bot UA: ${userAgent.slice(0, 80)}`);
      return;
    }

    const trackingToken = await this.prisma.trackingToken.findUnique({
      where: { token },
    });
    if (!trackingToken || trackingToken.tokenType !== 'OPEN') return;

    const { campaignId, contactId } = trackingToken;

    // Update token
    await this.prisma.trackingToken.update({
      where: { token },
      data: {
        clickCount: { increment: 1 },
        firstClickAt: trackingToken.firstClickAt ?? new Date(),
        lastClickAt: new Date(),
      },
    });

    // Check if already opened (for unique count)
    const alreadyOpened = await this.prisma.campaignEvent.findFirst({
      where: { campaignId, contactId, eventType: 'OPENED' },
    });

    await this.prisma.campaignEvent.create({
      data: {
        campaignId,
        contactId,
        eventType: 'OPENED',
        userAgent,
        ipAddress,
        deviceType: this.getDeviceType(userAgent),
      },
    });

    await Promise.all([
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          openCount: { increment: 1 },
          ...(!alreadyOpened && { uniqueOpenCount: { increment: 1 } }),
        },
      }),
      this.prisma.contact.update({
        where: { id: contactId },
        data: { totalOpened: { increment: 1 }, lastOpenedAt: new Date() },
      }),
      this.prisma.campaignRecipient.updateMany({
        where: { campaignId, contactId, status: { in: ['SENT', 'DELIVERED'] } },
        data: { status: 'OPENED' },
      }),
    ]);
  }

  async handleClick(token: string, userAgent: string, ipAddress: string) {
    const trackingToken = await this.prisma.trackingToken.findUnique({
      where: { token },
    });
    if (!trackingToken || trackingToken.tokenType !== 'CLICK') return null;

    const { campaignId, contactId, targetUrl } = trackingToken;

    await this.prisma.trackingToken.update({
      where: { token },
      data: {
        clickCount: { increment: 1 },
        firstClickAt: trackingToken.firstClickAt ?? new Date(),
        lastClickAt: new Date(),
      },
    });

    const alreadyClicked = await this.prisma.campaignEvent.findFirst({
      where: { campaignId, contactId, eventType: 'CLICKED' },
    });

    let urlHost = '';
    try {
      if (targetUrl) urlHost = new URL(targetUrl).hostname;
    } catch {}

    await this.prisma.campaignEvent.create({
      data: {
        campaignId,
        contactId,
        eventType: 'CLICKED',
        url: targetUrl,
        urlHost,
        userAgent,
        ipAddress,
        deviceType: this.getDeviceType(userAgent),
      },
    });

    await Promise.all([
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          clickCount: { increment: 1 },
          ...(!alreadyClicked && { uniqueClickCount: { increment: 1 } }),
        },
      }),
      this.prisma.contact.update({
        where: { id: contactId },
        data: { totalClicked: { increment: 1 }, lastClickedAt: new Date() },
      }),
      this.prisma.campaignRecipient.updateMany({
        where: { campaignId, contactId },
        data: { status: 'CLICKED' },
      }),
    ]);

    return { targetUrl };
  }

  async handleUnsubscribe(token: string) {
    const trackingToken = await this.prisma.trackingToken.findUnique({
      where: { token },
    });
    if (!trackingToken || trackingToken.tokenType !== 'UNSUBSCRIBE') {
      return { success: false };
    }

    const { campaignId, contactId } = trackingToken;

    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.status === 'UNSUBSCRIBED') {
      return { success: false };
    }

    await Promise.all([
      this.prisma.contact.update({
        where: { id: contactId },
        data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
      }),
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: { unsubscribeCount: { increment: 1 } },
      }),
      this.prisma.campaignEvent.create({
        data: { campaignId, contactId, eventType: 'UNSUBSCRIBED' },
      }),
      this.prisma.campaignRecipient.updateMany({
        where: { campaignId, contactId },
        data: { status: 'UNSUBSCRIBED' },
      }),
    ]);

    this.logger.log(`Contact ${contactId} unsubscribed from campaign ${campaignId}`);
    return { success: true };
  }

  private getDeviceType(userAgent: string): string {
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }
}
