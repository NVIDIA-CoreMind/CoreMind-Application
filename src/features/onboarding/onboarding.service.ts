import { ThemeMode, useThemeStore } from '@/stores/themeStore';

export const ONBOARDING_COMPLETED_KEY = 'coremind:onboarding_completed';
export const ONBOARDING_THEME_KEY = 'coremind:theme';
export const ONBOARDING_DEV_BYPASS_KEY = 'coremind:dev_bypass';

export class OnboardingService {
  /**
   * Checks whether the user has completed the onboarding wizard.
   */
  public isOnboardingCompleted(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
      return completed === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Marks onboarding as completed in local persistence.
   */
  public markOnboardingCompleted(): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {
      // storage unavailable
    }
  }

  /**
   * Resets onboarding state, enabling the wizard on next launch or navigation.
   */
  public resetOnboarding(): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      localStorage.removeItem(ONBOARDING_DEV_BYPASS_KEY);
    } catch {
      // storage unavailable
    }
  }

  /**
   * Checks whether development bypass mode was activated.
   */
  public isDevBypassed(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem(ONBOARDING_DEV_BYPASS_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Activates or deactivates development bypass.
   */
  public setDevBypass(bypass: boolean): void {
    try {
      if (typeof window === 'undefined') return;
      if (bypass) {
        localStorage.setItem(ONBOARDING_DEV_BYPASS_KEY, 'true');
        this.markOnboardingCompleted();
      } else {
        localStorage.removeItem(ONBOARDING_DEV_BYPASS_KEY);
      }
    } catch {
      // storage unavailable
    }
  }

  /**
   * Detects if the current environment is development.
   */
  public isDevEnvironment(): boolean {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      return true;
    }
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      return isLocalhost || import.meta.env?.DEV === true;
    }
    return false;
  }

  /**
   * Retrieves the saved theme preference.
   */
  public getSavedTheme(): ThemeMode {
    return useThemeStore.getState().theme;
  }

  /**
   * Saves and applies the theme preference immediately.
   */
  public saveTheme(theme: ThemeMode): void {
    useThemeStore.getState().setTheme(theme);
  }
}

export const onboardingService = new OnboardingService();
