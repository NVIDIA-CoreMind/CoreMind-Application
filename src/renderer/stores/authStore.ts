import { create } from 'zustand';
import { AuthTokens, User } from '../services/coremind/types';
import { authService } from '../services/coremind/auth';
import { coremindClient } from '../services/coremind/client';

const STORAGE_KEY_AUTH = 'coremind_auth';

interface AuthStore {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  setAuthTokens: (tokens: AuthTokens) => Promise<void>;
  updateUserProfile: (data: { name?: string; avatar_url?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initAuth: async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUTH);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthTokens;
        if (parsed.access_token) {
          coremindClient.setTokens({
            accessToken: parsed.access_token,
            refreshToken: parsed.refresh_token,
          });
          set({
            tokens: parsed,
            user: parsed.user || null,
            isAuthenticated: true,
          });

          // Verify token against /v1/auth/me in background
          try {
            const userProfile = await authService.getCurrentUser();
            set({ user: userProfile, isAuthenticated: true });
          } catch (err: unknown) {
            const error = err as Error;
            console.warn('[CoreMind Auth] Token validation error on startup:', error.message);
          }
        }
      }
    } catch {
      // ignore parsing errors
    }
  },

  setAuthTokens: async (tokens: AuthTokens) => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(tokens));
      coremindClient.setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      set({
        tokens,
        user: tokens.user || null,
        isAuthenticated: true,
        error: null,
      });

      // Fetch fresh me profile
      try {
        const userProfile = await authService.getCurrentUser();
        set({ user: userProfile });
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
    }
  },

  loginWithGoogle: async (): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const authUrlData = await authService.getGoogleAuthUrl();
      if (!authUrlData?.auth_url) {
        throw new Error('Backend did not return a valid Google OAuth URL.');
      }

      // Check if Electron popup window is available
      if (window.coreMindAPI?.openAuthWindow) {
        const res = await window.coreMindAPI.openAuthWindow(authUrlData.auth_url);
        if (res.success && res.data?.access_token) {
          await get().setAuthTokens(res.data);
          set({ isLoading: false });
          return true;
        } else if (!res.success) {
          set({
            isLoading: false,
            error: res.error?.message || 'Google sign-in was cancelled.',
          });
          return false;
        }
      }

      // Fallback for standard browser
      window.open(authUrlData.auth_url, '_blank', 'width=520,height=680');
      set({ isLoading: false });
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ isLoading: false, error: error.message || 'Google sign-in failed.' });
      return false;
    }
  },

  updateUserProfile: async (data: { name?: string; avatar_url?: string }): Promise<boolean> => {
    try {
      const updated = await authService.updateProfile(data);
      set({ user: updated });
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      coremindClient.clearTokens();
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
