import { api, extractData } from './client';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; role: string };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(extractData<AuthResponse>),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }).then(extractData<AuthResponse>),
  me: () => api.get('/auth/me').then(extractData),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};
