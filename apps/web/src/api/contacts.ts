import { api, extractData } from './client';

export const contactsApi = {
  findAll: (params?: Record<string, unknown>) =>
    api.get('/contacts', { params }).then(extractData),
  findOne: (id: string) => api.get(`/contacts/${id}`).then(extractData),
  create: (data: unknown) => api.post('/contacts', data).then(extractData),
  update: (id: string, data: unknown) => api.patch(`/contacts/${id}`, data).then(extractData),
  remove: (id: string) => api.delete(`/contacts/${id}`).then(extractData),
  bulk: (action: string, ids: string[], payload?: unknown) =>
    api.post('/contacts/bulk', { action, ids, ...payload }).then(extractData),
  notes: (id: string) => api.get(`/contacts/${id}/notes`).then(extractData),
  addNote: (id: string, content: string) =>
    api.post(`/contacts/${id}/notes`, { content }).then(extractData),
  verifyEmail: (email: string) =>
    api.post('/contacts/verify-email', { email }).then(extractData),
  verifyList: (listId: string) =>
    api.post(`/contacts/verify-list/${listId}`).then(extractData),
};
