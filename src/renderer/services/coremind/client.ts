import { backendConfig } from './config';
import { CoreMindApiError } from './errors';
import { ApiErrorResponse, AuthTokens } from './types';

const STORAGE_KEY_AUTH = 'coremind_auth';

export class CoreMindClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(newToken: string | null) => void> = [];

  constructor() {
    this.restoreStoredTokens();
  }

  private restoreStoredTokens(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUTH);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthTokens;
        if (parsed.access_token) {
          this.token = parsed.access_token;
          this.refreshToken = parsed.refresh_token || null;
        }
      }
    } catch {
      // ignore
    }
  }

  public setTokens(tokens: { accessToken: string | null; refreshToken?: string | null }): void {
    this.token = tokens.accessToken;
    if (tokens.refreshToken !== undefined) {
      this.refreshToken = tokens.refreshToken;
    }
  }

  public getAccessToken(): string | null {
    return this.token;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public clearTokens(): void {
    this.token = null;
    this.refreshToken = null;
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {
      // ignore
    }
  }

  private onTokenRefreshed(newToken: string | null): void {
    this.refreshSubscribers.forEach((cb) => cb(newToken));
    this.refreshSubscribers = [];
  }

  private async tryRefreshToken(): Promise<string | null> {
    if (!this.refreshToken) return null;

    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const baseUrl = backendConfig.getHttpUrl();
      const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!res.ok) {
        this.clearTokens();
        this.onTokenRefreshed(null);
        return null;
      }

      const freshTokens: AuthTokens = await res.json();
      this.setTokens({
        accessToken: freshTokens.access_token,
        refreshToken: freshTokens.refresh_token,
      });

      try {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(freshTokens));
      } catch {
        // ignore
      }

      this.onTokenRefreshed(freshTokens.access_token);
      return freshTokens.access_token;
    } catch {
      this.clearTokens();
      this.onTokenRefreshed(null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = backendConfig.getHttpUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError: unknown) {
      // Auto-fallback between localhost and 127.0.0.1
      let fallbackUrl: string | null = null;
      if (baseUrl.includes('localhost')) {
        fallbackUrl = url.replace('localhost', '127.0.0.1');
      } else if (baseUrl.includes('127.0.0.1')) {
        fallbackUrl = url.replace('127.0.0.1', 'localhost');
      }

      if (fallbackUrl) {
        try {
          response = await fetch(fallbackUrl, {
            ...options,
            headers,
          });
          // Update config to working base url
          if (baseUrl.includes('localhost')) {
            backendConfig.setHttpUrl(backendConfig.getHttpUrl().replace('localhost', '127.0.0.1'));
          } else {
            backendConfig.setHttpUrl(backendConfig.getHttpUrl().replace('127.0.0.1', 'localhost'));
          }
        } catch {
          const err = networkError as Error;
          throw new CoreMindApiError(0, {
            code: 'NETWORK_ERROR',
            message: `Failed to connect to CoreMind backend at ${baseUrl}. Ensure backend is running. (${err.message})`,
          });
        }
      } else {
        const err = networkError as Error;
        throw new CoreMindApiError(0, {
          code: 'NETWORK_ERROR',
          message: `Failed to connect to CoreMind backend at ${baseUrl}. Ensure backend is running. (${err.message})`,
        });
      }
    }

    // Handle token expiration & retry
    if (response.status === 401) {
      const errData = (await response.clone().json().catch(() => ({}))) as ApiErrorResponse;
      if (errData?.error?.code === 'AUTH_TOKEN_EXPIRED' && this.refreshToken) {
        const refreshedToken = await this.tryRefreshToken();
        if (refreshedToken) {
          headers['Authorization'] = `Bearer ${refreshedToken}`;
          response = await fetch(url, {
            ...options,
            headers,
          });
        }
      }
    }

    if (!response.ok) {
      let errDetail = {
        code: `HTTP_${response.status}`,
        message: `Request failed with status ${response.status}`,
      };
      try {
        const errJson = (await response.json()) as ApiErrorResponse;
        if (errJson?.error) {
          errDetail = {
            code: errJson.error.code || errDetail.code,
            message: errJson.error.message || errDetail.message,
            ...(errJson.error.details ? { details: errJson.error.details } : {}),
          };
        }
      } catch {
        // failed to parse json error
      }
      throw new CoreMindApiError(response.status, errDetail);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  public get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  /**
   * Real-time streaming chat using Server-Sent Events (/v1/ai/chat/stream).
   * Calls onToken for every received text chunk and returns the accumulated string.
   */
  public async streamChat(
    query: string,
    projectPath: string = '.',
    history: Array<{ role: string; content: string }> = [],
    onToken: (token: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const baseUrl = backendConfig.getHttpUrl();
    const url = `${baseUrl}/v1/ai/chat/stream`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        project_path: projectPath,
        history,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Streaming failed (${response.status}): ${errText || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataPayload = trimmed.replace(/^data:\s*/, '');
          if (dataPayload === '[DONE]') {
            return accumulated;
          }

          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.type === 'token' && typeof parsed.token === 'string') {
              accumulated += parsed.token;
              onToken(parsed.token);
            } else if (parsed.content && typeof parsed.content === 'string') {
              accumulated += parsed.content;
              onToken(parsed.content);
            } else if (parsed.type === 'done') {
              return accumulated;
            }
          } catch {
            if (dataPayload !== '[DONE]') {
              accumulated += dataPayload;
              onToken(dataPayload);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulated;
  }
}

export const coremindClient = new CoreMindClient();

