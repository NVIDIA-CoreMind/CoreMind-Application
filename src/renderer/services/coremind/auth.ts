import { coremindClient } from './client';
import {
  AuthTokens,
  GoogleAuthUrlResponse,
  GoogleLoginRequest,
  User,
  UserProfileUpdateRequest,
} from './types';

export class AuthService {
  /**
   * Retrieves Google OAuth authorization URL.
   */
  public async getGoogleAuthUrl(
    redirectUri?: string,
    state?: string
  ): Promise<GoogleAuthUrlResponse> {
    const params = new URLSearchParams();
    if (redirectUri) params.append('redirect_uri', redirectUri);
    if (state) params.append('state', state);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return coremindClient.get<GoogleAuthUrlResponse>(`/v1/auth/google/url${queryString}`);
  }

  /**
   * Exchanges Google ID token or Auth code for CoreMind access/refresh JWT tokens.
   */
  public async loginWithGoogle(payload: GoogleLoginRequest): Promise<AuthTokens> {
    const tokens = await coremindClient.post<AuthTokens>('/v1/auth/google', payload);
    coremindClient.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    return tokens;
  }

  /**
   * Gets current user profile (requires auth).
   */
  public async getCurrentUser(): Promise<User> {
    return coremindClient.get<User>('/v1/auth/me');
  }

  /**
   * Updates user name / avatar URL.
   */
  public async updateProfile(payload: UserProfileUpdateRequest): Promise<User> {
    return coremindClient.patch<User>('/v1/auth/profile', payload);
  }

  /**
   * Refreshes access token using refresh token.
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const tokens = await coremindClient.post<AuthTokens>('/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
    coremindClient.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    return tokens;
  }

  /**
   * Logs out user and revokes tokens.
   */
  public async logout(): Promise<{ status: string; message: string }> {
    try {
      const res = await coremindClient.post<{ status: string; message: string }>('/v1/auth/logout');
      coremindClient.clearTokens();
      return res;
    } catch {
      coremindClient.clearTokens();
      return { status: 'ok', message: 'Logged out locally' };
    }
  }
}

export const authService = new AuthService();
