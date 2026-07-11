/**
 * Free / public mailbox providers. An address on one of these domains is a
 * personal ("free") mailbox, not a corporate one, even if the seller has a site.
 */
export const FREE_MAIL_DOMAINS = new Set<string>([
  // global
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'gmx.com', 'gmx.net',
  'proton.me', 'protonmail.com', 'pm.me', 'zoho.com', 'mail.com', 'tutanota.com',
  'fastmail.com', 'hey.com', 'yandex.com',
  // RU / UA / CIS
  'ukr.net', 'i.ua', 'meta.ua', 'bigmir.net', 'email.ua', 'online.ua',
  'ua.fm', 'mail.ua', 'in.ua', '3g.ua', 'ex.ua', 'sevstar.net',
  'mail.ru', 'inbox.ru', 'list.ru', 'bk.ru', 'internet.ru', 'mail.uk',
  'yandex.ru', 'yandex.ua', 'yandex.by', 'ya.ru', 'rambler.ru', 'lenta.ru',
  'autorambler.ru', 'ro.ru', 'r0.ru', 'km.ru', 'pochta.ru', 'qip.ru',
  // common typos of gmail
  'gmai.com', 'gmial.com', 'gmail.ru', 'gmail.ua', 'gmaill.com', 'gmail.co',
  'gmail.con', 'gmail.cm', 'gmali.com', 'gnail.com', 'ukr.ua',
]);

export type EmailType = 'CORPORATE' | 'FREE';

export interface EmailClassification {
  valid: boolean;
  domain: string | null;
  type: EmailType | null;
  isFree: boolean;
}

const EMAIL_RE = /^[^@\s]+@([^@\s]+\.[^@\s]+)$/;

/** Classify an email address as corporate vs free mailbox. */
export function classifyEmail(email: string | null | undefined): EmailClassification {
  const e = (email ?? '').trim().toLowerCase();
  const m = EMAIL_RE.exec(e);
  if (!m) return { valid: false, domain: null, type: null, isFree: false };
  const domain = m[1];
  const isFree = FREE_MAIL_DOMAINS.has(domain);
  return { valid: true, domain, type: isFree ? 'FREE' : 'CORPORATE', isFree };
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain.trim().toLowerCase());
}
