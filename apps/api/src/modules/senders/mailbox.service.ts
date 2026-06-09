import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSSH } from 'node-ssh';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class MailboxService {
  private readonly logger = new Logger(MailboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async getSSH(): Promise<NodeSSH> {
    const host = this.config.get<string>('SSH_HOST');
    const password = this.config.get<string>('SSH_PASSWORD');

    if (!host || !password) {
      throw new BadRequestException(
        'Server SSH credentials not configured. Set SSH_HOST and SSH_PASSWORD environment variables.',
      );
    }

    const ssh = new NodeSSH();
    await ssh.connect({
      host,
      port: parseInt(this.config.get('SSH_PORT', '22')),
      username: this.config.get('SSH_USER', 'root'),
      password,
      readyTimeout: 15000,
    });
    return ssh;
  }

  private escapeShellArg(str: string): string {
    return "'" + str.replace(/'/g, "'\\''") + "'";
  }

  async provisionMailbox(
    senderId: string,
    password: string,
  ): Promise<{ message: string }> {
    const sender = await this.prisma.senderAccount.findUniqueOrThrow({
      where: { id: senderId },
    });

    const email = sender.fromEmail.toLowerCase(); // Dovecot normalises to lowercase
    const atIdx = email.indexOf('@');
    if (atIdx < 1) throw new BadRequestException('Invalid email in sender account');

    const localPart = email.slice(0, atIdx);
    const domain = email.slice(atIdx + 1);

    const ssh = await this.getSSH();
    try {
      // Hash password
      const hashResult = await ssh.execCommand(
        `doveadm pw -s SHA512-CRYPT -p ${this.escapeShellArg(password)}`,
      );
      const hash = hashResult.stdout.trim();
      if (!hash) {
        throw new BadRequestException(
          `Failed to hash password: ${hashResult.stderr}`,
        );
      }

      // Add or update dovecot users
      // Use grep -q + && / || to get clean "found"/"notfound" (grep -c exits 1 on no match
      // which causes "|| echo 0" to append a second "0", making stdout "0\n0" ≠ "0")
      const checkDov = await ssh.execCommand(
        `grep -q "^${email}:" /etc/dovecot/users && echo found || echo notfound`,
      );
      if (checkDov.stdout.trim() !== 'found') {
        await ssh.execCommand(
          `echo ${this.escapeShellArg(`${email}:${hash}`)} >> /etc/dovecot/users`,
        );
      } else {
        // Update password for existing entry
        const escapedEmail = email.replace(/[[\\.^$|?*+(){}]/g, '\\$&').replace(/@/g, '\\@');
        await ssh.execCommand(
          `sed -i 's|^${escapedEmail}:.*|${email}:${hash}|' /etc/dovecot/users`,
        );
      }

      // Add to postfix vmailbox if not present
      const checkVm = await ssh.execCommand(
        `grep -q "^${email} " /etc/postfix/vmailbox && echo found || echo notfound`,
      );
      if (checkVm.stdout.trim() !== 'found') {
        await ssh.execCommand(
          `echo ${this.escapeShellArg(`${email} ${domain}/${localPart}/`)} >> /etc/postfix/vmailbox`,
        );
        await ssh.execCommand('postmap /etc/postfix/vmailbox');
      }

      // Create Maildir structure
      const maildir = `/var/mail/vhosts/${domain}/${localPart}`;
      for (const dir of [maildir, `${maildir}/cur`, `${maildir}/new`, `${maildir}/tmp`]) {
        await ssh.execCommand(`install -d -o vmail -g vmail -m 700 ${dir}`);
      }

      // Reload services
      await ssh.execCommand('doveadm reload');
      await ssh.execCommand('postfix reload');

      this.logger.log(`Provisioned mailbox for ${email}`);
      return { message: `Mailbox ${email} created successfully` };
    } finally {
      ssh.dispose();
    }
  }

  async removeMailbox(
    senderId: string,
    deleteFiles = false,
  ): Promise<{ message: string }> {
    const sender = await this.prisma.senderAccount.findUniqueOrThrow({
      where: { id: senderId },
    });

    const email = sender.fromEmail.toLowerCase();
    const atIdx = email.indexOf('@');
    if (atIdx < 1) throw new BadRequestException('Invalid email in sender account');

    const localPart = email.slice(0, atIdx);
    const domain = email.slice(atIdx + 1);

    const ssh = await this.getSSH();
    try {
      const escapedEmail = email.replace(/[[\\.^$|?*+(){}]/g, '\\$&').replace(/@/g, '\\@');

      // Remove from dovecot users
      await ssh.execCommand(`sed -i '/^${escapedEmail}:/d' /etc/dovecot/users`);

      // Remove from postfix vmailbox
      await ssh.execCommand(`sed -i '/^${escapedEmail} /d' /etc/postfix/vmailbox`);
      await ssh.execCommand('postmap /etc/postfix/vmailbox');

      if (deleteFiles) {
        await ssh.execCommand(
          `rm -rf /var/mail/vhosts/${domain}/${localPart}`,
        );
      }

      // Reload services
      await ssh.execCommand('doveadm reload');
      await ssh.execCommand('postfix reload');

      this.logger.log(`Removed mailbox for ${email} (deleteFiles=${deleteFiles})`);
      return {
        message: `Mailbox ${email} removed${deleteFiles ? ' (email files deleted)' : ''}`,
      };
    } finally {
      ssh.dispose();
    }
  }
}
