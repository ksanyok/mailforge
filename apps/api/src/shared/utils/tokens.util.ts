import { randomBytes } from 'crypto';

export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateUnsubscribeToken(): string {
  return randomBytes(24).toString('base64url');
}
