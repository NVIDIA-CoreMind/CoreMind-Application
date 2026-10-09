import {
  User,
  AuthTokens,
  GoogleAuthUrlResponse,
  GoogleLoginRequest,
  UserProfileUpdateRequest,
} from '@/services/coremind/types';

export type {
  User,
  AuthTokens,
  GoogleAuthUrlResponse,
  GoogleLoginRequest,
  UserProfileUpdateRequest,
};

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface OAuthResult {
  success: boolean;
  tokens?: AuthTokens;
  error?: string;
  cancelled?: boolean;
}

export interface GoogleAuthConfig {
  clientId?: string;
  redirectUri?: string;
  authUrl?: string;
  state?: string;
}
