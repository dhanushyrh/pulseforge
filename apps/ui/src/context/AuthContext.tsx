import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, type AuthUser } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string | undefined, inviteCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE = {
  access:  'pf_access_token',
  refresh: 'pf_refresh_token',
  user:    'pf_user',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeTokens = (access: string, refresh: string, u: AuthUser) => {
    localStorage.setItem(STORAGE.access, access);
    localStorage.setItem(STORAGE.refresh, refresh);
    localStorage.setItem(STORAGE.user, JSON.stringify(u));
    setAccessToken(access);
    setUser(u);
  };

  const clearTokens = () => {
    localStorage.removeItem(STORAGE.access);
    localStorage.removeItem(STORAGE.refresh);
    localStorage.removeItem(STORAGE.user);
    setAccessToken(null);
    setUser(null);
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const storedRefresh = localStorage.getItem(STORAGE.refresh);
    if (!storedRefresh) return null;
    try {
      const data = await authApi.refresh(storedRefresh);
      storeTokens(data.accessToken, data.refreshToken, data.user);
      return data.accessToken;
    } catch {
      clearTokens();
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const storedAccess = localStorage.getItem(STORAGE.access);
      if (!storedAccess) { setIsLoading(false); return; }
      try {
        const me = await authApi.me(storedAccess);
        setAccessToken(storedAccess);
        setUser(me);
      } catch {
        const newToken = await refreshAccessToken();
        if (!newToken) clearTokens();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [refreshAccessToken]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    storeTokens(data.accessToken, data.refreshToken, data.user);
    navigate('/browse');
  };

  const register = async (
    email: string,
    password: string,
    name: string | undefined,
    inviteCode: string,
  ) => {
    const data = await authApi.register(email, password, name, inviteCode);
    storeTokens(data.accessToken, data.refreshToken, data.user);
    navigate('/browse');
  };

  const logout = async () => {
    const access = localStorage.getItem(STORAGE.access);
    const refresh = localStorage.getItem(STORAGE.refresh);
    if (access && refresh) {
      try { await authApi.logout(access, refresh); } catch { /* best effort */ }
    }
    clearTokens();
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
