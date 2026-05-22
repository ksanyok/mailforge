import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function healthColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

export function healthBg(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

export const STATUS_COLORS: Record<string, string> = {
  SUBSCRIBED: 'bg-green-100 text-green-800',
  UNSUBSCRIBED: 'bg-gray-100 text-gray-800',
  BOUNCED: 'bg-red-100 text-red-800',
  COMPLAINED: 'bg-orange-100 text-orange-800',
  SUPPRESSED: 'bg-purple-100 text-purple-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  SENDING: 'bg-indigo-100 text-indigo-800',
  SENT: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PENDING: 'bg-gray-100 text-gray-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  PASS: 'bg-green-100 text-green-800',
  FAIL: 'bg-red-100 text-red-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};
