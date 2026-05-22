export interface HealthMetrics {
  bounceRate: number;
  complaintRate: number;
  openRate: number;
  smtpOnline: boolean;
  warmupStage?: number;
}

export function calculateHealthScore(metrics: HealthMetrics): number {
  let score = 100;

  // Bounce rate penalties
  if (metrics.bounceRate > 0.1) score -= 40;
  else if (metrics.bounceRate > 0.05) score -= 20;
  else if (metrics.bounceRate > 0.02) score -= 10;

  // Complaint rate penalties
  if (metrics.complaintRate > 0.005) score -= 30;
  else if (metrics.complaintRate > 0.001) score -= 15;
  else if (metrics.complaintRate > 0.0005) score -= 5;

  // Open rate bonuses/penalties
  if (metrics.openRate < 0.05) score -= 20;
  else if (metrics.openRate < 0.15) score -= 10;
  else if (metrics.openRate > 0.3) score += 5;

  // SMTP connectivity
  if (!metrics.smtpOnline) score -= 30;

  return Math.max(0, Math.min(100, score));
}

export function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

export function getHealthColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'blue';
  if (score >= 40) return 'yellow';
  if (score >= 20) return 'orange';
  return 'red';
}
