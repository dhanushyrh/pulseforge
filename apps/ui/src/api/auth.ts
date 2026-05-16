import axios from 'axios';

const api = axios.create({ baseURL: '/v1' });

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthTokens> => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  register: async (
    email: string,
    password: string,
    name: string | undefined,
    inviteCode: string,
  ): Promise<AuthTokens> => {
    const { data } = await api.post('/auth/register', { email, password, name, inviteCode });
    return data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data;
  },

  logout: async (accessToken: string, refreshToken: string): Promise<void> => {
    await api.post(
      '/auth/logout',
      { refreshToken },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },

  me: async (accessToken: string): Promise<AuthUser> => {
    const { data } = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },

  generateInvite: async (
    accessToken: string,
    plan: 'free' | 'pro',
    expiresAt?: string,
  ) => {
    const { data } = await api.post(
      '/auth/invite',
      { plan, expiresAt },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return data;
  },
};
