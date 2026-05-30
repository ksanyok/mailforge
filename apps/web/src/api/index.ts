import { api, extractData } from './client';

export { api, extractData };
export * from './auth';
export * from './contacts';

export const listsApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/lists', { params }).then(extractData),
  findOne: (id: string) => api.get(`/lists/${id}`).then(extractData),
  create: (data: unknown) => api.post('/lists', data).then(extractData),
  update: (id: string, data: unknown) => api.patch(`/lists/${id}`, data).then(extractData),
  remove: (id: string) => api.delete(`/lists/${id}`).then(extractData),
  members: (id: string, params?: Record<string, unknown>) =>
    api.get(`/lists/${id}/members`, { params }).then(extractData),
  addMembers: (id: string, contactIds: string[]) =>
    api.post(`/lists/${id}/members`, { contactIds }).then(extractData),
  removeMembers: (id: string, contactIds: string[]) =>
    api.delete(`/lists/${id}/members`, { data: { contactIds } }).then(extractData),
};

export const tagsApi = {
  findAll: () => api.get('/tags').then(extractData),
  create: (data: unknown) => api.post('/tags', data).then(extractData),
  update: (id: string, data: unknown) => api.patch(`/tags/${id}`, data).then(extractData),
  remove: (id: string) => api.delete(`/tags/${id}`).then(extractData),
};

export const importsApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/imports', { params }).then(extractData),
  findOne: (id: string) => api.get(`/imports/${id}`).then(extractData),
  upload: (formData: FormData) =>
    api.post('/imports', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(extractData),
  errors: (id: string) => api.get(`/imports/${id}/errors`).then(extractData),
};

export const suppressionsApi = {
  findAll: (params?: Record<string, unknown>) =>
    api.get('/suppressions', { params }).then(extractData),
  create: (data: unknown) => api.post('/suppressions', data).then(extractData),
  remove: (id: string) => api.delete(`/suppressions/${id}`).then(extractData),
  check: (email: string) => api.get(`/suppressions/check/${email}`).then(extractData),
};

export const sendersApi = {
  findAll: () => api.get('/senders').then(extractData),
  findOne: (id: string) => api.get(`/senders/${id}`).then(extractData),
  create: (data: unknown) => api.post('/senders', data).then(extractData),
  update: (id: string, data: unknown) => api.patch(`/senders/${id}`, data).then(extractData),
  remove: (id: string) => api.delete(`/senders/${id}`).then(extractData),
  testConnection: (id: string) => api.post(`/senders/${id}/test`).then(extractData),
  resetStatus: (id: string) => api.post(`/senders/${id}/reset-status`).then(extractData),
  healthLogs: (id: string) => api.get(`/senders/${id}/health-logs`).then(extractData),
};

export const warmupApi = {
  findAll: () => api.get('/warmup').then(extractData),
  findOne: (senderId: string) => api.get(`/warmup/${senderId}`).then(extractData),
  upsertRule: (senderId: string, data: unknown) =>
    api.put(`/warmup/${senderId}/rule`, data).then(extractData),
  logs: (senderId: string, params?: Record<string, unknown>) =>
    api.get(`/warmup/${senderId}/logs`, { params }).then(extractData),
};

export const templatesApi = {
  findAll: (params?: Record<string, unknown>) =>
    api.get('/templates', { params }).then(extractData),
  findOne: (id: string) => api.get(`/templates/${id}`).then(extractData),
  create: (data: unknown) => api.post('/templates', data).then(extractData),
  update: (id: string, data: unknown) => api.patch(`/templates/${id}`, data).then(extractData),
  remove: (id: string) => api.delete(`/templates/${id}`).then(extractData),
};

export const campaignsApi = {
  findAll: (params?: Record<string, unknown>) =>
    api.get('/campaigns', { params }).then(extractData),
  findOne: (id: string) => api.get(`/campaigns/${id}`).then(extractData),
  create: (data: unknown) => api.post('/campaigns', data).then(extractData),
  update: (id: string, data: unknown) => api.patch(`/campaigns/${id}`, data).then(extractData),
  remove: (id: string) => api.delete(`/campaigns/${id}`).then(extractData),
  dispatch: (id: string) => api.post(`/campaigns/${id}/dispatch`).then(extractData),
  pause: (id: string) => api.post(`/campaigns/${id}/pause`).then(extractData),
  resume: (id: string) => api.post(`/campaigns/${id}/resume`).then(extractData),
  cancel: (id: string) => api.post(`/campaigns/${id}/cancel`).then(extractData),
  events: (id: string, params?: Record<string, unknown>) =>
    api.get(`/campaigns/${id}/events`, { params }).then(extractData),
};

export const deliverabilityApi = {
  findAll: (params?: Record<string, unknown>) =>
    api.get('/deliverability', { params }).then(extractData),
  bySender: (senderId: string) => api.get(`/deliverability/${senderId}`).then(extractData),
  runChecks: (senderId: string) => api.post(`/deliverability/${senderId}/check`).then(extractData),
};

export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard').then(extractData),
  dailyMetrics: (days?: number) =>
    api.get('/analytics/daily', { params: { days } }).then(extractData),
  campaignFunnel: (campaignId: string) =>
    api.get(`/analytics/funnel/${campaignId}`).then(extractData),
  senderComparison: () => api.get('/analytics/senders').then(extractData),
};

export const notificationsApi = {
  findAll: (params?: Record<string, unknown>) =>
    api.get('/notifications', { params }).then(extractData),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then(extractData),
  markAllRead: () => api.patch('/notifications/read-all').then(extractData),
  unreadCount: () => api.get('/notifications/unread-count').then(extractData),
};

export const recommendationsApi = {
  findAll: (params?: Record<string, unknown>) =>
    api.get('/recommendations', { params }).then(extractData),
  dismiss: (id: string) => api.patch(`/recommendations/${id}/dismiss`).then(extractData),
  markRead: (id: string) => api.patch(`/recommendations/${id}/read`).then(extractData),
};

export const settingsApi = {
  findAll: () => api.get('/settings').then(extractData),
  get: (key: string) => api.get(`/settings/${key}`).then(extractData),
  set: (key: string, value: string) => api.put(`/settings/${key}`, { value }).then(extractData),
  bulkUpdate: (settings: { key: string; value: string }[]) =>
    api.put('/settings', settings).then(extractData),
};

export const activityApi = {
  findAll: (params?: Record<string, unknown>) =>
    api.get('/activity', { params }).then(extractData),
};

export const usersApi = {
  findAll: (params?: Record<string, unknown>) => api.get('/users', { params }).then(extractData),
  findOne: (id: string) => api.get(`/users/${id}`).then(extractData),
  update: (id: string, data: unknown) => api.patch(`/users/${id}`, data).then(extractData),
  remove: (id: string) => api.delete(`/users/${id}`).then(extractData),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`).then(extractData),
};

export const inboxApi = {
  conversations: () => api.get('/inbox/conversations').then(extractData),
  thread: (senderId: string, contactEmail: string) =>
    api.get('/inbox/thread', { params: { senderId, contactEmail } }).then(extractData),
  markRead: (senderId: string, uid: number) =>
    api.post('/inbox/read', null, { params: { senderId, uid } }).then(extractData),
};
