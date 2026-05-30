import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { PrismaService } from '../../core/database/prisma.service';
import { decrypt } from '../../shared/utils/crypto.util';

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
      where: { status: { not: 'INACTIVE' } },
      select: {
        id: true, fromEmail: true, fromName: true,
        smtpHost: true, smtpPort: true, smtpUser: true,
        smtpPasswordEncrypted: true, smtpEncryption: true,
      },
    });

    const results: Conversation[] = [];

    await Promise.allSettled(
      senders.map(async (sender) => {
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
        smtpHost: true, smtpPort: true, smtpUser: true,
        smtpPasswordEncrypted: true, smtpEncryption: true,
      },
    });
    if (!sender) return;

    const client = this.createClient(sender);
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
    } finally {
      await client.logout().catch(() => null);
    }
  }

  // ── private helpers ─────────────────────────────────────────────────

  private async fetchInbox(sender: any, limit: number): Promise<InboxMessage[]> {
    const client = this.createClient(sender);
    const messages: InboxMessage[] = [];

    try {
      await client.connect();
      const mailbox = await client.mailboxOpen('INBOX');
      const total = mailbox.exists;
      if (!total) return [];

      const from = Math.max(1, total - limit + 1);
      for await (const msg of client.fetch(`${from}:*`, {
        uid: true, flags: true, envelope: true, bodyStructure: true,
        source: false,
      })) {
        try {
          const full = await client.fetchOne(String(msg.uid), {
            bodyParts: ['TEXT'],
          }, { uid: true });

          const textPart = full?.bodyParts?.get('text') as Buffer | undefined;
          const rawText = textPart?.toString('utf-8') ?? '';

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
            text: rawText,
            html: null,
            isRead: (msg.flags ?? new Set()).has('\\Seen'),
          });
        } catch {
          // skip malformed messages
        }
      }
    } finally {
      await client.logout().catch(() => null);
    }

    return messages;
  }

  private async fetchSent(sender: any, contactEmail: string): Promise<InboxMessage[]> {
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
      for await (const msg of client.fetch(`${from}:*`, {
        uid: true, flags: true, envelope: true,
      })) {
        const toAddresses = (msg.envelope?.to ?? []).map((t: any) =>
          (t.address ?? '').toLowerCase(),
        );
        if (!toAddresses.includes(contactEmail.toLowerCase())) continue;

        try {
          const full = await client.fetchOne(String(msg.uid), {
            bodyParts: ['TEXT'],
          }, { uid: true });

          const textPart = full?.bodyParts?.get('text') as Buffer | undefined;
          const rawText = textPart?.toString('utf-8') ?? '';

          messages.push({
            uid: msg.uid,
            messageId: msg.envelope?.messageId ?? '',
            subject: msg.envelope?.subject ?? '(no subject)',
            from: {
              name: sender.fromName,
              address: sender.fromEmail,
            },
            to: (msg.envelope?.to ?? []).map((t: any) => ({
              name: t.name ?? '',
              address: t.address ?? '',
            })),
            date: msg.envelope?.date ?? new Date(),
            text: rawText,
            html: null,
            isRead: true,
          });
        } catch {
          // skip
        }
      }
    } catch (err) {
      this.logger.debug(`No Sent folder for ${sender.fromEmail}: ${err}`);
    } finally {
      await client.logout().catch(() => null);
    }

    return messages;
  }

  private createClient(sender: any): ImapFlow {
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
    });
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
