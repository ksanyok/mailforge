import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { interpolate } from '../../shared/utils/interpolate.util';

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue('email-sending') private readonly queue: Queue,
  ) {}

  // Runs every 6 hours
  @Cron(CronExpression.EVERY_6_HOURS)
  async processFollowUps() {
    // Find campaigns with follow-up enabled that have completed sending
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        followUpEnabled: true,
        followUpSentAt: null,
        status: { in: ['SENT', 'SENDING'] },
      },
      select: {
        id: true, name: true, subject: true, htmlContent: true, textContent: true,
        senderId: true, followUpDays: true, followUpSubject: true, followUpBody: true,
        startedAt: true, completedAt: true, throttlePerMinute: true, rotationMode: true,
        trackOpens: true, trackClicks: true,
      },
    });

    for (const campaign of campaigns) {
      await this.processOneCampaign(campaign).catch((err) => {
        this.logger.error(`Follow-up failed for campaign ${campaign.id}: ${err.message}`);
      });
    }
  }

  private async processOneCampaign(campaign: any) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - campaign.followUpDays);

    const refDate = campaign.completedAt ?? campaign.startedAt;
    if (!refDate || new Date(refDate) > daysAgo) return; // not enough time passed

    // Find contacts who were SENT to but never replied (no OPENED/CLICKED/REPLIED events)
    const sentRecipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id, status: { in: ['SENT', 'DELIVERED'] } },
      select: { contactId: true, contact: { select: { email: true, status: true } } },
    });

    const noReplyContacts = sentRecipients.filter(
      (r: any) => r.contact?.status === 'SUBSCRIBED',
    );

    if (noReplyContacts.length === 0) return;

    this.logger.log(`Sending follow-up for campaign ${campaign.id} to ${noReplyContacts.length} contacts`);

    // Create follow-up recipients and queue jobs
    const subject = campaign.followUpSubject ?? `Follow-up: ${campaign.subject}`;
    const body = campaign.followUpBody ?? campaign.htmlContent;

    for (const recipient of noReplyContacts) {
      const r = await this.prisma.campaignRecipient.create({
        data: {
          campaignId: campaign.id,
          contactId: recipient.contactId,
          senderId: campaign.senderId,
          status: 'QUEUED',
          queuedAt: new Date(),
        },
      });

      await this.queue.add('send-email', {
        campaignId: campaign.id,
        recipientId: r.id,
        contactId: recipient.contactId,
        senderId: campaign.senderId,
        to: recipient.contact.email,
        overrideSubject: subject,
        overrideHtml: body,
      }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    }

    // Mark follow-up as sent
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { followUpSentAt: new Date() },
    });

    this.logger.log(`Follow-up queued for campaign ${campaign.id}`);
  }
}
