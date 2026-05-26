import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../core/database/prisma.service';
import { generateToken } from '../../shared/utils/tokens.util';
import { hasUnsubscribeLink } from '../../shared/utils/interpolate.util';
import { getPaginationParams, buildPaginatedResponse } from '../../shared/utils/pagination.util';
import { parse as parseHtml } from 'node-html-parser';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email-sending') private readonly sendingQueue: Queue,
  ) {}

  async findAll(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = {};
    if (query.search) where.name = { contains: query.search };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true, fromEmail: true, healthScore: true } },
          lists: { include: { list: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return buildPaginatedResponse(
      data.map((c) => ({ ...c, listIds: c.lists.map((l) => l.listId) })),
      total, page, limit,
    );
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, fromEmail: true, healthScore: true } },
        lists: { include: { list: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return { ...campaign, listIds: campaign.lists.map((l) => l.listId) };
  }

  private pickCampaignFields(data: any) {
    const allowed = [
      'name','subject','preheader','htmlContent','textContent','senderId',
      'scheduledAt','throttlePerMinute','rotationMode','trackOpens','trackClicks',
      'utmSource','utmMedium','utmCampaign','status',
    ];
    return Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k)),
    );
  }

  async create(dto: any, userId: string) {
    const { listIds, ...raw } = dto;
    const campaignData = this.pickCampaignFields(raw);
    return this.prisma.campaign.create({
      data: {
        ...campaignData,
        createdBy: userId,
        ...(listIds?.length && {
          lists: { create: listIds.map((listId: string) => ({ listId })) },
        }),
      },
      include: { lists: true },
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const { listIds, ...raw } = dto;
    const campaignData = this.pickCampaignFields(raw);

    if (listIds !== undefined) {
      await this.prisma.campaignList.deleteMany({ where: { campaignId: id } });
      if (listIds.length > 0) {
        await this.prisma.campaignList.createMany({
          data: listIds.map((listId: string) => ({ campaignId: id, listId })),
        });
      }
    }

    return this.prisma.campaign.update({
      where: { id },
      data: campaignData,
    });
  }

  async remove(id: string) {
    const campaign = await this.findOne(id);
    if (['SENDING', 'SCHEDULED'].includes(campaign.status)) {
      throw new BadRequestException('Cannot delete an active or scheduled campaign');
    }
    await this.prisma.campaign.delete({ where: { id } });
  }

  async dispatch(id: string, senderId?: string) {
    const campaign = await this.findOne(id);

    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      throw new BadRequestException(`Cannot dispatch campaign with status: ${campaign.status}`);
    }

    if (!campaign.htmlContent) {
      throw new BadRequestException('Campaign has no HTML content');
    }

    if (!hasUnsubscribeLink(campaign.htmlContent)) {
      throw new BadRequestException(
        'Campaign HTML must contain an unsubscribe link ({{unsubscribeUrl}})',
      );
    }

    const activeSenderId = senderId || campaign.senderId;
    if (!activeSenderId) {
      throw new BadRequestException('No sender account assigned to this campaign');
    }

    const sender = await this.prisma.senderAccount.findUnique({
      where: { id: activeSenderId },
    });
    if (!sender || sender.status !== 'ACTIVE') {
      throw new BadRequestException('Sender account is not active');
    }

    // Resolve all contacts from lists
    const listIds = campaign.lists.map((l: any) => l.listId);
    if (listIds.length === 0) {
      throw new BadRequestException('Campaign has no recipient lists');
    }

    const contactIds = await this.resolveRecipients(listIds, id);

    if (contactIds.length === 0) {
      throw new BadRequestException('No eligible recipients found');
    }

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'SENDING',
        startedAt: new Date(),
        senderId: activeSenderId,
        totalRecipients: contactIds.length,
      },
    });

    // Create recipient records in batches
    await this.createRecipients(id, contactIds, activeSenderId);

    // Pre-generate tracking tokens for all recipients
    await this.createTrackingTokens(id, contactIds, campaign.htmlContent, campaign.trackOpens, campaign.trackClicks);

    // Enqueue sending jobs
    await this.enqueueSendingJobs(campaign, contactIds, activeSenderId);

    return { dispatched: contactIds.length };
  }

  async pause(id: string) {
    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async resume(id: string) {
    const campaign = await this.findOne(id);
    if (campaign.status !== 'PAUSED') {
      throw new BadRequestException('Campaign is not paused');
    }
    await this.prisma.campaign.update({ where: { id }, data: { status: 'SENDING' } });
    // Re-enqueue pending recipients
    const pendingRecipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: id, status: { in: ['PENDING', 'QUEUED'] } },
      include: { contact: true },
      take: 10000,
    });
    await this.sendingQueue.addBulk(
      pendingRecipients.map((r) => ({
        name: 'send-email',
        data: {
          campaignId: id,
          recipientId: r.id,
          contactId: r.contactId,
          senderId: r.senderId ?? campaign.senderId,
          to: r.contact.email,
        },
      })),
    );
  }

  async cancel(id: string) {
    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    await this.sendingQueue.clean(0, 'wait');
  }

  async getRecipients(campaignId: string, query: { page?: number; limit?: number; status?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = { campaignId };
    if (query.status) where.status = query.status;
    const [data, total] = await Promise.all([
      this.prisma.campaignRecipient.findMany({
        where, skip, take,
        include: { contact: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { queuedAt: 'desc' },
      }),
      this.prisma.campaignRecipient.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getEvents(campaignId: string, query: { page?: number; limit?: number; eventType?: string }) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = { campaignId };
    if (query.eventType) where.eventType = query.eventType;
    const [data, total] = await Promise.all([
      this.prisma.campaignEvent.findMany({
        where, skip, take,
        include: { contact: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaignEvent.count({ where }),
    ]);
    return buildPaginatedResponse(data, total, page, limit);
  }

  async getFunnel(campaignId: string) {
    const campaign = await this.findOne(campaignId);
    const [sent, opened, clicked, bounced, unsubscribed] = await Promise.all([
      this.prisma.campaignEvent.count({ where: { campaignId, eventType: 'SENT' } }),
      this.prisma.campaignEvent.count({ where: { campaignId, eventType: 'OPENED' } }),
      this.prisma.campaignEvent.count({ where: { campaignId, eventType: 'CLICKED' } }),
      this.prisma.campaignEvent.count({ where: { campaignId, eventType: { in: ['BOUNCED_HARD', 'BOUNCED_SOFT'] } } }),
      this.prisma.campaignEvent.count({ where: { campaignId, eventType: 'UNSUBSCRIBED' } }),
    ]);
    return {
      total: campaign.totalRecipients,
      queued: campaign.totalRecipients - sent,
      sent,
      opened,
      clicked,
      bounced,
      unsubscribed,
    };
  }

  private async resolveRecipients(listIds: string[], campaignId: string): Promise<string[]> {
    // Get all contacts from lists
    const members = await this.prisma.contactListMember.findMany({
      where: { listId: { in: listIds } },
      select: { contactId: true },
    });

    const uniqueContactIds = [...new Set(members.map((m) => m.contactId))];

    // Filter out ineligible contacts
    const suppressedEmails = await this.prisma.suppression.findMany({
      select: { email: true },
    });
    const suppressedEmailSet = new Set(suppressedEmails.map((s) => s.email));

    const eligibleContacts = await this.prisma.contact.findMany({
      where: {
        id: { in: uniqueContactIds },
        status: { notIn: ['UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED'] },
      },
      select: { id: true, email: true },
    });

    // Filter suppressed
    const finalContacts = eligibleContacts.filter(
      (c) => !suppressedEmailSet.has(c.email.toLowerCase()),
    );

    // Exclude already-sent recipients for this campaign
    const alreadySent = await this.prisma.campaignRecipient.findMany({
      where: { campaignId, status: { notIn: ['PENDING', 'QUEUED'] } },
      select: { contactId: true },
    });
    const sentIds = new Set(alreadySent.map((r) => r.contactId));

    return finalContacts
      .filter((c) => !sentIds.has(c.id))
      .map((c) => c.id);
  }

  private async createRecipients(campaignId: string, contactIds: string[], senderId: string) {
    const CHUNK = 1000;
    for (let i = 0; i < contactIds.length; i += CHUNK) {
      const chunk = contactIds.slice(i, i + CHUNK);
      await this.prisma.campaignRecipient.createMany({
        data: chunk.map((contactId) => ({
          campaignId,
          contactId,
          senderId,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      });
    }
  }

  private async createTrackingTokens(
    campaignId: string,
    contactIds: string[],
    htmlContent: string,
    trackOpens: boolean,
    trackClicks: boolean,
  ) {
    // Extract unique links from HTML
    const root = parseHtml(htmlContent);
    const links: string[] = [];
    if (trackClicks) {
      root.querySelectorAll('a[href]').forEach((el) => {
        const href = el.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('mailto:') &&
            !href.startsWith('tel:') && !href.includes('{{')) {
          links.push(href);
        }
      });
    }
    const uniqueLinks = [...new Set(links)];

    const CHUNK = 500;
    for (let i = 0; i < contactIds.length; i += CHUNK) {
      const chunk = contactIds.slice(i, i + CHUNK);
      const tokens: any[] = [];

      for (const contactId of chunk) {
        if (trackOpens) {
          tokens.push({ campaignId, contactId, tokenType: 'OPEN', token: generateToken() });
        }
        tokens.push({ campaignId, contactId, tokenType: 'UNSUBSCRIBE', token: generateToken() });
        for (const url of uniqueLinks) {
          tokens.push({ campaignId, contactId, tokenType: 'CLICK', token: generateToken(), targetUrl: url });
        }
      }

      await this.prisma.trackingToken.createMany({ data: tokens, skipDuplicates: true });
    }
  }

  private async enqueueSendingJobs(campaign: any, contactIds: string[], senderId: string) {
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id, contactId: { in: contactIds } },
      include: { contact: { select: { id: true, email: true } } },
    });

    const CHUNK = 1000;
    for (let i = 0; i < recipients.length; i += CHUNK) {
      const chunk = recipients.slice(i, i + CHUNK);
      await this.sendingQueue.addBulk(
        chunk.map((r) => ({
          name: 'send-email',
          data: {
            campaignId: campaign.id,
            recipientId: r.id,
            contactId: r.contactId,
            senderId,
            to: r.contact.email,
          },
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        })),
      );
    }

    await this.prisma.campaignRecipient.updateMany({
      where: { campaignId: campaign.id, contactId: { in: contactIds } },
      data: { status: 'QUEUED', queuedAt: new Date() },
    });
  }
}
