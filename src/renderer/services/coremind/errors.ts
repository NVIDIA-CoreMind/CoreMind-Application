import { ApiErrorDetail } from './types';

export class CoreMindApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, any>;

  constructor(status: number, errorDetail: ApiErrorDetail) {
    super(errorDetail.message || `CoreMind API Error (${status})`);
    this.name = 'CoreMindApiError';
    this.status = status;
    this.code = errorDetail.code || 'UNKNOWN_ERROR';
    this.details = errorDetail.details;
  }

  public isAuthExpired(): boolean {
    return this.code === 'AUTH_TOKEN_EXPIRED';
  }

  public isUnauthorized(): boolean {
    return (
      this.status === 401 ||
      this.code === 'AUTH_UNAUTHORIZED' ||
      this.code === 'AUTH_TOKEN_EXPIRED' ||
      this.code === 'AUTH_TOKEN_INVALID'
    );
  }

  public isRateLimited(): boolean {
    return this.status === 429 || this.code === 'AI_RATE_LIMIT';
  }

  public isTimeout(): boolean {
    return this.status === 504 || this.code === 'AI_TIMEOUT';
  }
}
