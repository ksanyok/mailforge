import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow, FetchMessageObject } from 'imapflow';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../core/database/prisma.service';
import { decrypt } from '../../shared/utils/crypto.util';

interface SenderRow {
  id: string;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPasswordEncrypted: string;
  smtpEncryption: string;
}

export interface InboxMessage {
  uid: number;
  messageId: string;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  date: Date;
  text: string;
  html: string | null;
  isRead: boolean;
}

export interface Conversation {
  contactEmail: string;
  contactName: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getConversations(): Promise<Conversation[]> {
    const senders = await this.prisma.senderAccount.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, fromEmail: true, fromName: true,
        smtpHost: true, smtpPort: true, smtpUser: true,
        smtpPasswordEncrypted: true, smtpEncryption: true,
      },
    });

    const results: Conversation[] = [];

    await Promise.allSettled(
      senders.map(async (sender: SenderRow) => {
        try {
          const messages = await this.fetchInbox(sender, 50);
          const byContact = new Map<string, InboxMessage[]>();

          for (const msg of messages) {
            const key = msg.from.address.toLowerCase();
            if (!byContact.has(key)) byContact.set(key, []);
            byContact.get(key)!.push(msg);
          }

          for (const [email, msgs] of byContact) {
            const sorted = msgs.sort((a, b) => b.date.getTime() - a.date.getTime());
            const last = sorted[0];
            const snippet = this.stripHtml(last.text || last.html || '').slice(0, 120);

            results.push({
              contactEmail: email,
              contactName: last.from.name || email,
              senderId: sender.id,
              senderEmail: sender.fromEmail,
              senderName: sender.fromName,
              lastMessage: snippet,
              lastMessageAt: last.date,
              unreadCount: msgs.filter((m) => !m.isRead).length,
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch inbox for ${sender.fromEmail}: ${err instanceof Error ? err.message : err}`);
        }
      }),
    );

    return results.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  async getThread(senderId: string, contactEmail: string): Promise<InboxMessage[]> {
    const sender = await this.prisma.senderAccount.findUnique({
      where: { id: senderId },
      select: {
        id: true, fromEmail: true, fromName: true,
        smtpHost: true, smtpPort: true, smtpUser: true,
        smtpPasswordEncrypted: true, smtpEncryption: true,
      },
    });
    if (!sender) return [];

    const received = await this.fetchInbox(sender, 200);
    const fromContact = received.filter(
      (m) => m.from.address.toLowerCase() === contactEmail.toLowerCase(),
    );

    // Fetch bodies for received messages
    const receivedUids = fromContact.map((m) => m.uid);
    const bodyMap = await this.fetchInboxBodies(sender, receivedUids);
    for (const msg of fromContact) {
      msg.text = bodyMap.get(msg.uid) ?? '';
    }

    const sent = await this.fetchSent(sender, contactEmail);

    const all = [...fromContact, ...sent].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    return all;
  }

  async markRead(senderId: string, uid: number): Promise<void> {
    const sender = await this.prisma.senderAccount.findUnique({
      where: { id: senderId },
      select: {
        id: true, fromEmail: true, fromName: true,
        smtpHost: true, smtpPort: true, smtpUser: true,
        smtpPasswordEncrypted: true, smtpEncryption: true,
      },
    });
    if (!sender) return;

    const client = this.createClient(sender as SenderRow);
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
    } finally {
      await client.logout().catch(() => null);
    }
  }

  // ── private helpers ─────────────────────────────────────────────────

  // Fetch only envelopes — fast, no body download
  private async fetchInbox(sender: SenderRow, limit: number): Promise<InboxMessage[]> {
    const client = this.createClient(sender);
    const messages: InboxMessage[] = [];

    try {
      await client.connect();
      const mailbox = await client.mailboxOpen('INBOX');
      const total = mailbox.exists;
      if (!total) return [];

      const from = Math.max(1, total - limit + 1);
      for await (const msg of client.fetch(`${from}:*`, {
        uid: true, flags: true, envelope: true,
      })) {
        messages.push({
          uid: msg.uid,
          messageId: msg.envelope?.messageId ?? '',
          subject: msg.envelope?.subject ?? '(no subject)',
          from: {
            name: msg.envelope?.from?.[0]?.name ?? '',
            address: msg.envelope?.from?.[0]?.address ?? '',
          },
          to: (msg.envelope?.to ?? []).map((t: any) => ({
            name: t.name ?? '',
            address: t.address ?? '',
          })),
          date: msg.envelope?.date ?? new Date(),
          text: msg.envelope?.subject ?? '',
          html: null,
          isRead: (msg.flags ?? new Set()).has('\\Seen'),
        });
      }
    } finally {
      await client.logout().catch(() => null);
    }

    return messages;
  }

  // Fetch full bodies for a specific thread — used only when opening a conversation
  private async fetchInboxBodies(sender: SenderRow, uids: number[]): Promise<Map<number, string>> {
    const client = this.createClient(sender);
    const bodyMap = new Map<number, string>();
    if (!uids.length) return bodyMap;

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      for await (const msg of client.fetch(uids, {
        uid: true, bodyParts: ['TEXT'],
      }, { uid: true })) {
        const textPart = (msg.bodyParts?.get('text')) as Buffer | undefined;
        const raw = textPart?.toString('utf-8') ?? '';
        bodyMap.set(msg.uid, this.cleanMimeBody(raw));
      }
    } finally {
      await client.logout().catch(() => null);
    }

    return bodyMap;
  }

  private async fetchSent(sender: SenderRow, contactEmail: string): Promise<InboxMessage[]> {
    const client = this.createClient(sender);
    const messages: InboxMessage[] = [];
    const sentFolders = ['Sent', 'Sent Items', 'INBOX.Sent'];

    try {
      await client.connect();
      const list = await client.list();
      const sentFolder = list.find((f) =>
        sentFolders.some((n) => f.path.toLowerCase().includes(n.toLowerCase())),
      );
      if (!sentFolder) return [];

      const mailbox = await client.mailboxOpen(sentFolder.path);
      const total = mailbox.exists;
      if (!total) return [];

      const from = Math.max(1, total - 200 + 1);
      // Collect matching envelopes first (fast)
      const matched: Array<{ uid: number; env: any }> = [];
      for await (const msg of client.fetch(`${from}:*`, {
        uid: true, flags: true, envelope: true,
      })) {
        const toAddresses = (msg.envelope?.to ?? []).map((t: any) =>
          (t.address ?? '').toLowerCase(),
        );
        if (!toAddresses.includes(contactEmail.toLowerCase())) continue;
        matched.push({ uid: msg.uid, env: msg.envelope });
      }

      // Bulk fetch bodies for matched messages
      if (matched.length > 0) {
        const bodyMap = new Map<number, string>();
        for await (const msg of client.fetch(matched.map((m) => m.uid), {
          uid: true, bodyParts: ['TEXT'],
        }, { uid: true })) {
          const textPart = (msg.bodyParts?.get('text')) as Buffer | undefined;
          const raw = textPart?.toString('utf-8') ?? '';
          bodyMap.set(msg.uid, this.cleanMimeBody(raw));
        }

        for (const { uid, env } of matched) {
          messages.push({
            uid,
            messageId: env?.messageId ?? '',
            subject: env?.subject ?? '(no subject)',
            from: { name: sender.fromName, address: sender.fromEmail },
            to: (env?.to ?? []).map((t: any) => ({ name: t.name ?? '', address: t.address ?? '' })),
            date: env?.date ?? new Date(),
            text: bodyMap.get(uid) ?? '',
            html: null,
            isRead: true,
          });
        }
      }
    } catch (err) {
      this.logger.debug(`No Sent folder for ${sender.fromEmail}: ${err}`);
    } finally {
      await client.logout().catch(() => null);
    }

    return messages;
  }

  private createClient(sender: SenderRow): ImapFlow {
    const encKey = this.config.getOrThrow('ENCRYPTION_KEY');
    const password = decrypt(sender.smtpPasswordEncrypted, encKey);
    const imapHost = sender.smtpHost === 'mail.senior-dev.cloud' || sender.smtpHost === 'localhost'
      ? 'host.docker.internal'
      : sender.smtpHost;

    return new ImapFlow({
      host: imapHost,
      port: 143,
      secure: false,
      auth: { user: sender.smtpUser, pass: password },
      logger: false,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }

  async sendReply(dto: {
    senderId: string;
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;
  }): Promise<{ sent: boolean }> {
    const sender = await this.prisma.senderAccount.findUnique({
      where: { id: dto.senderId },
      select: {
        fromName: true, fromEmail: true, replyTo: true,
        smtpHost: true, smtpPort: true, smtpUser: true,
        smtpPasswordEncrypted: true, smtpEncryption: true,
      },
    });
    if (!sender) throw new Error('Sender not found');

    const encKey = this.config.getOrThrow('ENCRYPTION_KEY');
    const password = decrypt(sender.smtpPasswordEncrypted, encKey);

    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpEncryption === 'TLS',
      auth: { user: sender.smtpUser, pass: password },
      tls: { rejectUnauthorized: false },
    });

    const subject = dto.subject.toLowerCase().startsWith('re:')
      ? dto.subject
      : `Re: ${dto.subject}`;

    await transporter.sendMail({
      from: `"${sender.fromName}" <${sender.fromEmail}>`,
      to: dto.to,
      replyTo: sender.replyTo || sender.fromEmail,
      subject,
      text: dto.body,
      ...(dto.inReplyTo ? { inReplyTo: dto.inReplyTo, references: dto.inReplyTo } : {}),
    });

    return { sent: true };
  }

  // ── MIME parsing ─────────────────────────────────────────────────────

  private cleanMimeBody(raw: string): string {
    if (!raw) return '';

    // Try to extract text/plain from multipart
    const boundaryMatch = raw.match(/boundary="?([^"\s;]+)"?/i);
    if (boundaryMatch) {
      const b = boundaryMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = raw.split(new RegExp(`--${b}(?:--)?`));
      for (const part of parts) {
        if (!/content-type:\s*text\/plain/i.test(part)) continue;
        const bodyStart = part.search(/\r?\n\r?\n/);
        if (bodyStart === -1) continue;
        const encoding = (part.match(/content-transfer-encoding:\s*(\S+)/i) || [])[1] || '';
        const body = part.slice(bodyStart).replace(/^\r?\n/, '');
        return encoding.toLowerCase() === 'quoted-printable'
          ? this.decodeQP(body).trim()
          : body.trim();
      }
    }

    // Not multipart — strip headers if present, then decode
    const bodyStart = raw.search(/\r?\n\r?\n/);
    if (bodyStart > 0 && /^content-/im.test(raw.slice(0, bodyStart))) {
      const headers = raw.slice(0, bodyStart);
      const body = raw.slice(bodyStart).replace(/^\r?\n/, '');
      const encoding = (headers.match(/content-transfer-encoding:\s*(\S+)/i) || [])[1] || '';
      return encoding.toLowerCase() === 'quoted-printable'
        ? this.decodeQP(body).trim()
        : body.trim();
    }

    return this.decodeQP(raw).trim();
  }

  private decodeQP(text: string): string {
    return text
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
