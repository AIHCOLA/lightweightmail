import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  phone: string | null;
  phone_verified: boolean;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  loginAsGuest: () => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

const STORAGE_KEY = 'tempmail_auth';
const GUEST_KEY = 'tempmail_session_id';

export type { AuthState };

export const AuthContext = createContext<AuthState>({
  user: null, accessToken: null, refreshToken: null,
  isLoading: true, isAuthenticated: false, isGuest: false,
  login: () => {}, loginAsGuest: () => {}, logout: () => {},
  setTokens: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.user && data.refreshToken) {
          setUser(data.user);
          setRefreshToken(data.refreshToken);
          // Access token is NOT stored — will be refreshed on first API call
        }
      } catch { /* Invalid stored data */ }
    }
    setIsLoading(false);
  }, []);

  const persistAuth = useCallback((u: AuthUser | null, _accessToken: string | null, rt: string | null) => {
    if (u && rt) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, refreshToken: rt }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback((u: AuthUser, at: string, rt: string) => {
    setUser(u);
    setAccessToken(at);
    setRefreshToken(rt);
    setIsGuest(false);
    persistAuth(u, at, rt);
  }, [persistAuth]);

  const loginAsGuest = useCallback(() => {
    setIsGuest(true);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsGuest(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GUEST_KEY);
  }, []);

  const setTokens = useCallback((at: string, rt: string) => {
    setAccessToken(at);
    setRefreshToken(rt);
    if (user) persistAuth(user, at, rt);
  }, [user, persistAuth]);

  return (
    <AuthContext.Provider
      value={{
        user, accessToken, refreshToken,
        isLoading, isAuthenticated: !!user,
        isGuest,
        login, loginAsGuest, logout, setTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
