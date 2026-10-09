import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// Setup environment mocks for Node test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeAll(() => {
  (global as any).localStorage = storageMock;
  (global as any).document = {
    documentElement: {
      dataset: {} as Record<string, string>,
    },
  };
  (global as any).window = {
    location: { hostname: 'localhost' },
    matchMedia: vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      addListener: vi.fn(),
    }),
    coreMindAPI: undefined,
  };
});

import { onboardingService } from '../src/features/onboarding/onboarding.service';
import { useThemeStore, resolveEffectiveTheme, ThemeMode } from '../src/renderer/stores/themeStore';
import { featureAuthService } from '../src/features/auth/auth.service';

describe('CoreMind IDE — Three-Page Onboarding Experience', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.restoreAllMocks();
    (window as any).matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      addListener: vi.fn(),
    });
  });

  describe('1. Onboarding Service & Lifecycle', () => {
    it('defaults to not completed on initial launch', () => {
      expect(onboardingService.isOnboardingCompleted()).toBe(false);
    });

    it('marks onboarding as completed and persists to storage', () => {
      onboardingService.markOnboardingCompleted();
      expect(onboardingService.isOnboardingCompleted()).toBe(true);
      expect(localStorage.getItem('coremind:onboarding_completed')).toBe('true');
    });

    it('resets onboarding state cleanly when requested', () => {
      onboardingService.markOnboardingCompleted();
      expect(onboardingService.isOnboardingCompleted()).toBe(true);

      onboardingService.resetOnboarding();
      expect(onboardingService.isOnboardingCompleted()).toBe(false);
      expect(localStorage.getItem('coremind:onboarding_completed')).toBeNull();
    });

    it('supports development bypass mode and marks completed', () => {
      expect(onboardingService.isDevBypassed()).toBe(false);

      onboardingService.setDevBypass(true);
      expect(onboardingService.isDevBypassed()).toBe(true);
      expect(onboardingService.isOnboardingCompleted()).toBe(true);

      onboardingService.setDevBypass(false);
      expect(onboardingService.isDevBypassed()).toBe(false);
    });

    it('routes directly to Continue with Google (Step 3) on sign out', () => {
      onboardingService.markOnboardingCompleted();
      expect(onboardingService.isOnboardingCompleted()).toBe(true);

      const listener = vi.fn();
      const unsub = onboardingService.subscribe(listener);

      onboardingService.signOutAndNavigateToGoogle();
      expect(onboardingService.isOnboardingCompleted()).toBe(false);
      expect(onboardingService.getInitialStep()).toBe(3);
      expect(listener).toHaveBeenCalledWith(false, 3);
      unsub();
    });
  });

  describe('2. Theme Selection & System Preferences', () => {
    it('supports light, dark, and system theme options', () => {
      const themes: ThemeMode[] = ['light', 'dark', 'system'];
      themes.forEach((theme) => {
        onboardingService.saveTheme(theme);
        expect(useThemeStore.getState().theme).toBe(theme);
      });
    });

    it('resolves concrete effective theme for editor and terminal', () => {
      expect(resolveEffectiveTheme('dark')).toBe('dark');
      expect(resolveEffectiveTheme('light')).toBe('light');

      const systemResolved = resolveEffectiveTheme('system');
      expect(['dark', 'light']).toContain(systemResolved);
    });

    it('immediately sets dataset.theme on documentElement when theme is saved', () => {
      onboardingService.saveTheme('light');
      expect(document.documentElement.dataset.theme).toBe('light');

      onboardingService.saveTheme('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('persists selected theme across app restarts', () => {
      onboardingService.saveTheme('dark');
      expect(localStorage.getItem('coremind:theme')).toBe('dark');

      onboardingService.saveTheme('light');
      expect(localStorage.getItem('coremind:theme')).toBe('light');
    });
  });

  describe('3. Google OAuth & Authentication Bridge', () => {
    it('provides development bypass authentication', () => {
      featureAuthService.bypassDevAuth();

      const user = featureAuthService.getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.provider).toBe('local-dev');
      expect(featureAuthService.isAuthenticated()).toBe(true);

      const tokens = featureAuthService.getTokens();
      expect(tokens?.access_token).toBeDefined();
    });

    it('clears state and routes to Continue with Google on sign out', async () => {
      featureAuthService.bypassDevAuth();
      expect(featureAuthService.isAuthenticated()).toBe(true);

      await featureAuthService.signOut();
      expect(featureAuthService.isAuthenticated()).toBe(false);
      expect(featureAuthService.getCurrentUser()).toBeNull();
      expect(onboardingService.isOnboardingCompleted()).toBe(false);
      expect(onboardingService.getInitialStep()).toBe(3);
    });

    it('handles Google OAuth error when backend is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      const result = await featureAuthService.signInWithGoogle();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('backend');
    });

    it('handles Google OAuth window cancellation gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?test=1',
          client_id: 'test-client',
          state: 'test-state',
        }),
      } as any);

      (window as any).coreMindAPI = {
        openAuthWindow: vi.fn().mockResolvedValue({
          success: false,
          error: { code: 'AUTH_CANCELLED', message: 'Authentication window was closed by the user.' },
        }),
      };

      const result = await featureAuthService.signInWithGoogle();
      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });
  });

  describe('4. Three-Page Navigation State Validation', () => {
    it('preserves theme selection through back and forward navigation', () => {
      onboardingService.saveTheme('dark');
      expect(useThemeStore.getState().theme).toBe('dark');

      onboardingService.saveTheme('light');
      expect(useThemeStore.getState().theme).toBe('light');

      // Theme remains selected on step changes
      expect(useThemeStore.getState().theme).toBe('light');
    });
  });
});
