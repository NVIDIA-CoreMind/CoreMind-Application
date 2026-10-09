import { ThemeMode, useThemeStore } from '@/stores/themeStore';
import { OnboardingStep } from './onboarding.types';

export const ONBOARDING_COMPLETED_KEY = 'coremind:onboarding_completed';
export const ONBOARDING_THEME_KEY = 'coremind:theme';
export const ONBOARDING_DEV_BYPASS_KEY = 'coremind:dev_bypass';
export const ONBOARDING_STEP_KEY = 'coremind:onboarding_step';

export type OnboardingStateListener = (completed: boolean, step: OnboardingStep) => void;

export class OnboardingService {
  private listeners: Set<OnboardingStateListener> = new Set();

  /**
   * Subscribes to onboarding state changes (completion state and active step).
   */
  public subscribe(listener: OnboardingStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifies all registered listeners of an onboarding state transition.
   */
  public notify(completed: boolean, step: OnboardingStep = 1): void {
    this.listeners.forEach((listener) => {
      try {
        listener(completed, step);
      } catch (err) {
        console.error('[OnboardingService] Listener execution error:', err);
      }
    });
  }

  /**
   * Gets the step to display when onboarding opens.
   */
  public getInitialStep(): OnboardingStep {
    try {
      if (typeof window === 'undefined') return 1;
      const stepStr = localStorage.getItem(ONBOARDING_STEP_KEY);
      if (stepStr === '3') return 3;
      if (stepStr === '2') return 2;
      return 1;
    } catch {
      return 1;
    }
  }

  /**
   * Sets the initial step for the next onboarding render.
   */
  public setInitialStep(step: OnboardingStep): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(ONBOARDING_STEP_KEY, String(step));
    } catch {
      // storage unavailable
    }
  }

  /**
   * Clears saved initial step.
   */
  public clearInitialStep(): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(ONBOARDING_STEP_KEY);
    } catch {
      // storage unavailable
    }
  }

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
      this.clearInitialStep();
      this.notify(true, 1);
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
      this.clearInitialStep();
      this.notify(false, 1);
    } catch {
      // storage unavailable
    }
  }

  /**
   * Performs an application sign out transition directly to the "Continue with Google" onboarding page (Step 3).
   */
  public signOutAndNavigateToGoogle(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
        localStorage.removeItem(ONBOARDING_DEV_BYPASS_KEY);
        this.setInitialStep(3);
        window.dispatchEvent(new CustomEvent('coremind:signout'));
      }
      this.notify(false, 3);
    } catch {
      this.notify(false, 3);
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
