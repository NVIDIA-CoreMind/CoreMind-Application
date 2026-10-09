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
