import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { promises as dns } from 'dns';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class DeliverabilityService {
  private readonly logger = new Logger(DeliverabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkSender(senderId: string) {
    const sender = await this.prisma.senderAccount.findUniqueOrThrow({
      where: { id: senderId },
    });

    const domain = sender.fromEmail.split('@')[1];
    const results: Array<{
      checkType: string; status: string; value?: string; recommendation?: string;
    }> = [];

    // SPF check
    try {
      const spfRecords = await dns.resolveTxt(domain);
      const spf = spfRecords.flat().find((r) => r.startsWith('v=spf1'));
      if (spf) {
        results.push({ checkType: 'SPF', status: 'PASS', value: spf });
      } else {
        results.push({
          checkType: 'SPF',
          status: 'FAIL',
          recommendation: `Add a TXT record to ${domain}: v=spf1 include:_spf.${domain} ~all`,
        });
      }
    } catch {
      results.push({ checkType: 'SPF', status: 'UNKNOWN', recommendation: `Could not check SPF for ${domain}` });
    }

    // DMARC check
    try {
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarc = dmarcRecords.flat().find((r) => r.startsWith('v=DMARC1'));
      if (dmarc) {
        results.push({ checkType: 'DMARC', status: 'PASS', value: dmarc });
      } else {
        results.push({
          checkType: 'DMARC',
          status: 'FAIL',
          recommendation: `Add TXT record to _dmarc.${domain}: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
        });
      }
    } catch {
      results.push({
        checkType: 'DMARC',
        status: 'FAIL',
        recommendation: `Add TXT record to _dmarc.${domain}: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
      });
    }

    // MX check
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (mxRecords.length > 0) {
        results.push({ checkType: 'MX', status: 'PASS', value: mxRecords.map((r) => `${r.priority} ${r.exchange}`).join(', ') });
      } else {
        results.push({ checkType: 'MX', status: 'FAIL', recommendation: `Add MX records to ${domain}` });
      }
    } catch {
      results.push({ checkType: 'MX', status: 'UNKNOWN' });
    }

    // DKIM check (common selector patterns)
    let dkimFound = false;
    const selectors = ['default', 'mail', 'google', 'dkim', 'k1', 'smtp'];
    for (const selector of selectors) {
      try {
        const dkimRecords = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
        const dkim = dkimRecords.flat().find((r) => r.startsWith('v=DKIM1'));
        if (dkim) {
          results.push({ checkType: 'DKIM', status: 'PASS', value: `Found with selector: ${selector}` });
          dkimFound = true;
          break;
        }
      } catch {}
    }
    if (!dkimFound) {
      results.push({
        checkType: 'DKIM',
        status: 'FAIL',
        recommendation: `Configure DKIM for ${domain}. Contact your email provider or hosting provider for DKIM setup instructions.`,
      });
    }

    // Save results
    await Promise.all(
      results.map((r) =>
        this.prisma.deliverabilityCheck.create({
          data: {
            senderId,
            checkType: r.checkType as any,
            status: r.status as any,
            value: r.value,
            recommendation: r.recommendation,
          },
        }),
      ),
    );

    // Create recommendations for failures
    const failures = results.filter((r) => r.status === 'FAIL');
    for (const failure of failures) {
      await this.prisma.recommendation.create({
        data: {
          type: `DNS_${failure.checkType}`,
          severity: 'WARNING',
          title: `${failure.checkType} record missing or misconfigured`,
          message: `Your ${failure.checkType} record for ${domain} is not configured correctly. This may affect email deliverability.`,
          actionText: failure.recommendation ?? '',
          resourceType: 'sender',
          resourceId: senderId,
        },
      });
    }

    return results;
  }

  async getChecks(senderId: string) {
    return this.prisma.deliverabilityCheck.findMany({
      where: { senderId },
      orderBy: { checkedAt: 'desc' },
      distinct: ['checkType'],
    });
  }

  async getSummary(senderId: string) {
    const checks = await this.getChecks(senderId);
    const passed = checks.filter((c) => c.status === 'PASS').length;
    const total = checks.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { checks, score, passed, total };
  }

  @Cron('0 6 * * *') // Daily at 6am
  async runDailyChecks() {
    this.logger.log('Running daily deliverability checks...');
    const senders = await this.prisma.senderAccount.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    for (const sender of senders) {
      try {
        await this.checkSender(sender.id);
      } catch (err) {
        this.logger.error(`Deliverability check failed for ${sender.id}:`, err);
      }
    }
  }
}
