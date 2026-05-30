import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../core/database/prisma.service';
import { decrypt } from '../../shared/utils/crypto.util';
import { interpolate } from '../../shared/utils/interpolate.util';

export interface SendEmailJobData {
  campaignId: string;
  recipientId: string;
  contactId: string;
  senderId: string;
  to: string;
}

@Processor('email-sending')
export class SendingProcessor {
  private readonly logger = new Logger(SendingProcessor.name);
  private transporterCache = new Map<string, nodemailer.Transporter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Process({ name: 'send-email', concurrency: 5 })
  async handleSendEmail(job: Job<SendEmailJobData>) {
    const { campaignId, recipientId, contactId, senderId, to } = job.data;

    const [campaign, contact, sender, recipient] = await Promise.all([
      this.prisma.campaign.findUnique({ where: { id: campaignId } }),
      this.prisma.contact.findUnique({ where: { id: contactId } }),
      this.prisma.senderAccount.findUnique({ where: { id: senderId } }),
      this.prisma.campaignRecipient.findUnique({ where: { id: recipientId } }),
    ]);

    if (!campaign || !contact || !sender || !recipient) {
      this.logger.warn(`Missing data for job ${job.id}, skipping`);
      return;
    }

    if (campaign.status === 'PAUSED' || campaign.status === 'CANCELLED') {
      await this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'SKIPPED', skipReason: `Campaign ${campaign.status.toLowerCase()}` },
      });
      return;
    }

    if (['UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED'].includes(contact.status)) {
      await this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'SKIPPED', skipReason: `Contact status: ${contact.status}` },
      });
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { skipCount: { increment: 1 } },
      });
      return;
    }

    // Check sender daily limit
    const canSend = await this.checkSenderLimit(senderId, sender.warmupEnabled, sender.warmupCurrentDailyLimit, sender.dailyLimit);
    if (!canSend) {
      this.logger.warn(`Sender ${senderId} daily limit reached, delaying job`);
      await (job as any).moveToDelayed(Date.now() + 60 * 60 * 1000); // retry in 1 hour
      return;
    }

    try {
      // Build personalized HTML
      const appUrl = this.config.get('APP_URL', 'http://localhost:3001');
      const unsubscribeToken = await this.getToken(campaignId, contactId, 'UNSUBSCRIBE');
      const openToken = campaign.trackOpens ? await this.getToken(campaignId, contactId, 'OPEN') : null;

      const variables = {
        firstName: contact.firstName ?? '',
        lastName: contact.lastName ?? '',
        email: contact.email,
        company: contact.company ?? '',
        unsubscribeUrl: `${appUrl}/t/u/${unsubscribeToken?.token ?? ''}`,
      };

      let html = interpolate(campaign.htmlContent, variables);
      const text = campaign.textContent
        ? interpolate(campaign.textContent, variables)
        : undefined;

      // Inject open tracking pixel
      if (openToken && campaign.trackOpens) {
        const pixelUrl = `${appUrl}/t/o/${openToken.token}`;
        const pixel = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;" />`;
        html = html.replace('</body>', `${pixel}</body>`);
        if (!html.includes('</body>')) html += pixel;
      }

      // Replace click tracking links
      if (campaign.trackClicks) {
        html = await this.wrapClickLinks(html, campaignId, contactId, appUrl);
      }

      // Generate plain-text fallback if not provided
      const plainText = text || html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      // Unique message ID for deduplication
      const msgId = `<${campaignId}.${contactId}.${Date.now()}@${sender.fromEmail.split('@')[1]}>`;

      // Send email
      const transporter = await this.getTransporter(sender);
      const info = await transporter.sendMail({
        from: `"${sender.fromName}" <${sender.fromEmail}>`,
        to: contact.email,
        replyTo: sender.replyTo || sender.fromEmail,
        subject: interpolate(campaign.subject, variables),
        html,
        text: plainText,
        messageId: msgId,
        headers: {
          // Unsubscribe — required by Gmail/Yahoo bulk sender policy
          'List-Unsubscribe': `<${variables.unsubscribeUrl}>, <mailto:${sender.fromEmail}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          // Bulk mail markers — help inbox providers classify correctly
          'Precedence': 'bulk',
          'X-Mailer': 'MailForge',
          // List identity — helps spam filters trust the sender
          'List-ID': `${campaign.name} <campaign-${campaignId}.${sender.fromEmail.split('@')[1]}>`,
          // Feedback-ID — enables Gmail Postmaster Tools engagement tracking
          'Feedback-ID': `${campaignId}:${senderId}:mailforge`,
          // Prevent duplicate detection across resends
          'X-Entity-Ref-ID': msgId,
          // Internal tracking
          'X-Campaign-Id': campaignId,
        },
      });

      // Success: update records
      await Promise.all([
        this.prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { status: 'SENT', sentAt: new Date() },
        }),
        this.prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        }),
        this.prisma.senderAccount.update({
          where: { id: senderId },
          data: { totalSent: { increment: 1 }, lastSuccessAt: new Date() },
        }),
        this.prisma.contact.update({
          where: { id: contactId },
          data: { totalSent: { increment: 1 }, lastSentAt: new Date() },
        }),
        this.prisma.campaignEvent.create({
          data: { campaignId, contactId, senderId, eventType: 'SENT' },
        }),
      ]);

      this.logger.debug(`Sent to ${to}: ${info.messageId}`);

      // Check if campaign is complete
      await this.checkCampaignCompletion(campaignId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to send to ${to}: ${errorMsg}`);

      await this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: 'FAILED', failureReason: errorMsg },
      });
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { bounceCount: { increment: 1 } },
      });
      await this.prisma.campaignEvent.create({
        data: { campaignId, contactId, senderId, eventType: 'FAILED' },
      });

      throw err; // Let BullMQ retry
    }
  }

  private async getTransporter(sender: any): Promise<nodemailer.Transporter> {
    if (this.transporterCache.has(sender.id)) {
      return this.transporterCache.get(sender.id)!;
    }

    const password = decrypt(
      sender.smtpPasswordEncrypted,
      this.config.getOrThrow('ENCRYPTION_KEY'),
    );

    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpEncryption === 'TLS',
      auth: { user: sender.smtpUser, pass: password },
      tls: { rejectUnauthorized: false },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });

    this.transporterCache.set(sender.id, transporter);

    // Remove from cache after 10 minutes
    setTimeout(() => {
      this.transporterCache.delete(sender.id);
    }, 10 * 60 * 1000);

    return transporter;
  }

  private async checkSenderLimit(
    senderId: string,
    warmupEnabled: boolean,
    warmupDailyLimit: number,
    regularDailyLimit: number,
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentToday = await this.prisma.campaignEvent.count({
      where: {
        senderId,
        eventType: 'SENT',
        createdAt: { gte: today },
      },
    });

    const limit = warmupEnabled ? warmupDailyLimit : regularDailyLimit;
    return sentToday < limit;
  }

  private async getToken(campaignId: string, contactId: string, tokenType: string) {
    return this.prisma.trackingToken.findFirst({
      where: { campaignId, contactId, tokenType: tokenType as any },
    });
  }

  private async wrapClickLinks(
    html: string,
    campaignId: string,
    contactId: string,
    appUrl: string,
  ): Promise<string> {
    const tokens = await this.prisma.trackingToken.findMany({
      where: { campaignId, contactId, tokenType: 'CLICK' },
    });

    let result = html;
    for (const token of tokens) {
      if (!token.targetUrl) continue;
      const trackingUrl = `${appUrl}/t/c/${token.token}`;
      // Replace exact href match
      const escaped = token.targetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`href="${escaped}"`, 'g'), `href="${trackingUrl}"`);
      result = result.replace(new RegExp(`href='${escaped}'`, 'g'), `href='${trackingUrl}'`);
    }
    return result;
  }

  private async checkCampaignCompletion(campaignId: string) {
    const [pending, total] = await Promise.all([
      this.prisma.campaignRecipient.count({
        where: { campaignId, status: { in: ['PENDING', 'QUEUED'] } },
      }),
      this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { totalRecipients: true },
      }),
    ]);

    if (pending === 0 && total) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENT', completedAt: new Date() },
      });
      this.logger.log(`Campaign ${campaignId} completed`);
    }
  }
}
