import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string, key: string): string {
  const iv = randomBytes(16);
  const derivedKey = scryptSync(key, 'mailforge-salt', 32);
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedText: string, key: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const derivedKey = scryptSync(key, 'mailforge-salt', 32);
  const decipher = createDecipheriv(
    ALGORITHM,
    derivedKey,
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return (
    decipher.update(Buffer.from(encryptedHex, 'hex')).toString('utf8') +
    decipher.final('utf8')
  );
}
