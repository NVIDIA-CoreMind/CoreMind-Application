import { useAuthStore } from '@/stores/authStore';
import { googleOAuthService } from './googleOAuth.service';
import { AuthTokens, User } from './auth.types';

export class FeatureAuthService {
  /**
   * Initializes authentication state from persistent storage and validates current token.
   */
  public async initAuth(): Promise<void> {
    await useAuthStore.getState().initAuth();
  }

  /**
   * Initiates Google OAuth authentication flow.
   */
  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    const oAuthResult = await googleOAuthService.startOAuthFlow();

    if (oAuthResult.success && oAuthResult.tokens) {
      await useAuthStore.getState().setAuthTokens(oAuthResult.tokens);
      return { success: true };
    }

    if (oAuthResult.error) {
      return { success: false, error: oAuthResult.error };
    }

    // Try fallback via store directly
    const storeSuccess = await useAuthStore.getState().loginWithGoogle();
    const storeError = useAuthStore.getState().error;
    return {
      success: storeSuccess,
      error: storeSuccess ? undefined : (storeError || 'Google authentication failed.'),
    };
  }

  /**
   * Opens Google OAuth consent URL directly in Google Chrome.
   */
  public async openInGoogleChrome(): Promise<{ success: boolean; authUrl?: string; state?: string; error?: string }> {
    try {
      const res = await googleOAuthService.openInGoogleChrome();
      return res;
    } catch (err: unknown) {
      const error = err as Error;
      return { success: false, error: error.message };
    }
  }

  /**
   * Checks whether the user has completed Google authentication in Chrome.
   */
  public async checkPendingSession(state?: string): Promise<boolean> {
    const { authService } = await import('@/services/coremind/auth');
    const tokens = await authService.getPendingOAuthSession(state);
    if (tokens) {
      await useAuthStore.getState().setAuthTokens(tokens);
      return true;
    }
    return false;
  }

  /**
   * Bypasses authentication for development and local testing.
   */
  public bypassDevAuth(): void {
    useAuthStore.getState().loginDevBypass();
  }

  /**
   * Signs out user and clears all credentials.
   */
  public async signOut(): Promise<void> {
    await useAuthStore.getState().logout();
  }

  /**
   * Retrieves currently authenticated user profile.
   */
  public getCurrentUser(): User | null {
    return useAuthStore.getState().user;
  }

  /**
   * Checks whether the user is authenticated.
   */
  public isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }

  /**
   * Returns current auth tokens.
   */
  public getTokens(): AuthTokens | null {
    return useAuthStore.getState().tokens;
  }
}

export const featureAuthService = new FeatureAuthService();
