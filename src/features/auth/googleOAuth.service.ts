import { authService as coremindAuthService } from '@/services/coremind/auth';
import { backendConfig } from '@/services/coremind/config';
import { AuthTokens, OAuthResult } from './auth.types';

export class GoogleOAuthService {
  /**
   * Retrieves Google OAuth authorization configuration and URL from the backend.
   */
  public async getAuthorizationUrl(redirectUri?: string, state?: string) {
    try {
      const response = await coremindAuthService.getGoogleAuthUrl(redirectUri, state);
      if (!response?.auth_url) {
        throw new Error(
          'CoreMind backend did not return an authorization URL. Verify that GOOGLE_CLIENT_ID and client credentials are configured.'
        );
      }
      return response;
    } catch (err: unknown) {
      const error = err as Error;
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ECONNREFUSED')
      ) {
        const url = backendConfig.getHttpUrl();
        throw new Error(
          `Unable to reach CoreMind backend service at ${url}. Ensure the service is active or use Development Bypass.`
        );
      }
      throw error;
    }
  }

  /**
   * Starts the Google OAuth 2.0 authorization code / token flow in a secure desktop window.
   */
  public async startOAuthFlow(redirectUri?: string): Promise<OAuthResult> {
    try {
      // 1. Get OAuth authorization URL from backend
      const authData = await this.getAuthorizationUrl(redirectUri);

      // 2. Open desktop OAuth authentication window
      if (typeof window !== 'undefined' && window.coreMindAPI?.openAuthWindow) {
        const result = await window.coreMindAPI.openAuthWindow(authData.auth_url);

        if (!result.success) {
          const isCancelled = result.error?.code === 'AUTH_CANCELLED';
          return {
            success: false,
            cancelled: isCancelled,
            error: isCancelled
              ? 'Authentication was cancelled.'
              : result.error?.message || 'Authentication window failed to load.',
          };
        }

        const data = result.data;
        if (!data) {
          return {
            success: false,
            error: 'No authentication parameters received from callback.',
          };
        }

        // Handle error responses from OAuth provider
        if (data.error) {
          return {
            success: false,
            error: data.error_description || data.error || 'Authentication rejected by Google.',
          };
        }

        // Check state verification if provided
        if (authData.state && data.state && authData.state !== data.state) {
          return {
            success: false,
            error: 'OAuth state mismatch verification failed. Please try again.',
          };
        }

        // Direct token return (e.g., from backend callback redirect)
        if (data.access_token) {
          const tokens: AuthTokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || '',
            token_type: data.token_type || 'Bearer',
            expires_in: data.expires_in ? Number(data.expires_in) : 3600,
            user: {
              id: data.user_id || 'google-user',
              email: data.email || '',
              name: data.name || 'Google User',
              avatar_url: data.avatar_url || null,
              provider: 'google',
              role: data.role || 'user',
              created_at: data.created_at || new Date().toISOString(),
            },
          };
          return { success: true, tokens };
        }

        // Authorization Code flow: Exchange authorization code with backend
        if (data.code) {
          const tokens = await coremindAuthService.loginWithGoogle({
            code: data.code,
            redirect_uri: redirectUri,
          });
          return { success: true, tokens };
        }

        return {
          success: false,
          error: 'No authorization code or access token found in OAuth callback response.',
        };
      }

      // 3. Fallback for non-Electron browser environments
      if (typeof window !== 'undefined') {
        window.open(authData.auth_url, '_blank', 'width=540,height=700');
      }
      return {
        success: false,
        error: 'Browser popup opened. Complete login in browser.',
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during Google authentication.',
      };
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();
