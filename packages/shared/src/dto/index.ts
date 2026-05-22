import {
  Role, ContactStatus, BounceType, ValidationStatus, ImportStatus, DedupeRule,
  SmtpEncryption, SenderStatus, CampaignStatus, RotationMode, RecipientStatus,
  EventType, TokenType, SuppressionReason, CheckType, CheckStatus,
  RecommendationSeverity, NotificationType,
} from '../enums';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface RefreshDto {
  refreshToken: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

export interface UpdateUserDto {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export interface ContactDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  status: ContactStatus;
  engagementScore: number;
  riskScore: number;
  validationStatus: ValidationStatus;
  sourceType: string | null;
  customFields: Record<string, unknown>;
  unsubscribedAt: string | null;
  bouncedAt: string | null;
  bounceType: BounceType | null;
  complainedAt: string | null;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  lastSentAt: string | null;
  lastOpenedAt: string | null;
  lastClickedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: TagDto[];
}

export interface CreateContactDto {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  customFields?: Record<string, unknown>;
  listIds?: string[];
  tagIds?: string[];
}

export interface UpdateContactDto extends Partial<CreateContactDto> {
  status?: ContactStatus;
}

export interface BulkContactActionDto {
  contactIds: string[];
  action: 'suppress' | 'unsubscribe' | 'delete' | 'addToList' | 'addTag';
  listId?: string;
  tagId?: string;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export interface TagDto {
  id: string;
  name: string;
  color: string;
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

// ─── Contact Lists ────────────────────────────────────────────────────────────

export interface ContactListDto {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactListDto {
  name: string;
  description?: string;
}

// ─── Imports ──────────────────────────────────────────────────────────────────

export interface ImportDto {
  id: string;
  filename: string;
  fileType: string;
  status: ImportStatus;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  listId: string | null;
  dedupeRule: DedupeRule;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateImportDto {
  listId?: string;
  dedupeRule?: DedupeRule;
  columnMapping?: Record<string, string>;
}

// ─── Suppressions ─────────────────────────────────────────────────────────────

export interface SuppressionDto {
  id: string;
  email: string;
  reason: SuppressionReason;
  notes: string | null;
  createdAt: string;
}

export interface CreateSuppressionDto {
  email: string;
  reason?: SuppressionReason;
  notes?: string;
}

// ─── Sender Accounts ──────────────────────────────────────────────────────────

export interface SenderAccountDto {
  id: string;
  name: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: SmtpEncryption;
  smtpUser: string;
  dailyLimit: number;
  hourlyLimit: number;
  perMinuteLimit: number;
  warmupEnabled: boolean;
  warmupStage: number;
  warmupCurrentDailyLimit: number;
  rotationPriority: number;
  rotationWeight: number;
  status: SenderStatus;
  healthScore: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  totalSent: number;
  totalBounced: number;
  totalComplaints: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSenderAccountDto {
  name: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption?: SmtpEncryption;
  smtpUser: string;
  smtpPassword: string;
  dailyLimit?: number;
  hourlyLimit?: number;
  perMinuteLimit?: number;
  warmupEnabled?: boolean;
  rotationPriority?: number;
  rotationWeight?: number;
}

export interface UpdateSenderAccountDto extends Partial<CreateSenderAccountDto> {
  status?: SenderStatus;
}

export interface TestSmtpDto {
  to: string;
}

// ─── Warmup ───────────────────────────────────────────────────────────────────

export interface WarmupRuleDto {
  id: string;
  senderId: string;
  initialDailyVolume: number;
  dailyIncreasePercent: number;
  maxDailyLimit: number;
  minOpenRate: number;
  maxBounceRate: number;
  maxComplaintRate: number;
  cooldownDays: number;
  autoPauseOnCritical: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertWarmupRuleDto {
  initialDailyVolume?: number;
  dailyIncreasePercent?: number;
  maxDailyLimit?: number;
  minOpenRate?: number;
  maxBounceRate?: number;
  maxComplaintRate?: number;
  cooldownDays?: number;
  autoPauseOnCritical?: boolean;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export interface EmailTemplateDto {
  id: string;
  name: string;
  category: string | null;
  htmlContent: string;
  textContent: string | null;
  isSystem: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailTemplateDto {
  name: string;
  category?: string;
  htmlContent: string;
  textContent?: string;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export interface CampaignDto {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  status: CampaignStatus;
  senderId: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openCount: number;
  uniqueOpenCount: number;
  clickCount: number;
  uniqueClickCount: number;
  bounceCount: number;
  complaintCount: number;
  unsubscribeCount: number;
  skipCount: number;
  throttlePerMinute: number;
  rotationMode: RotationMode;
  trackOpens: boolean;
  trackClicks: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  listIds?: string[];
}

export interface CreateCampaignDto {
  name: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;
  senderId?: string;
  listIds?: string[];
  scheduledAt?: string;
  throttlePerMinute?: number;
  rotationMode?: RotationMode;
  trackOpens?: boolean;
  trackClicks?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {}

export interface DispatchCampaignDto {
  sendNow?: boolean;
  scheduledAt?: string;
}

// ─── Campaign Events ──────────────────────────────────────────────────────────

export interface CampaignEventDto {
  id: string;
  campaignId: string;
  contactId: string;
  eventType: EventType;
  url: string | null;
  userAgent: string | null;
  country: string | null;
  deviceType: string | null;
  createdAt: string;
}

// ─── Deliverability ───────────────────────────────────────────────────────────

export interface DeliverabilityCheckDto {
  id: string;
  senderId: string;
  checkType: CheckType;
  status: CheckStatus;
  value: string | null;
  recommendation: string | null;
  checkedAt: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardStatsDto {
  contacts: {
    total: number;
    subscribed: number;
    unsubscribed: number;
    bounced: number;
    complained: number;
    suppressed: number;
  };
  campaigns: {
    total: number;
    active: number;
    sent: number;
  };
  sending: {
    sentToday: number;
    sentLast30Days: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    complaintRate: number;
  };
  senders: {
    total: number;
    active: number;
    averageHealthScore: number;
  };
}

export interface DailyMetricDto {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
}

export interface CampaignFunnelDto {
  total: number;
  queued: number;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export interface RecommendationDto {
  id: string;
  type: string;
  severity: RecommendationSeverity;
  title: string;
  message: string;
  actionText: string | null;
  resourceType: string | null;
  resourceId: string | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface SettingDto {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface UpdateSettingDto {
  value: string;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export interface ActivityLogDto {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { name: string; email: string };
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
