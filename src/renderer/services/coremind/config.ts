/**
 * CoreMind Backend Configuration Manager
 * Centralized HTTP and WebSocket endpoints with local persistence.
 */

const STORAGE_KEY_HTTP_URL = 'coremind:api-base-url';
const STORAGE_KEY_WS_URL = 'coremind:ws-base-url';

export const DEFAULT_HTTP_BASE_URL = 'http://127.0.0.1:43110';
export const DEFAULT_WS_BASE_URL = 'ws://127.0.0.1:43110/ws';

export interface BackendConfig {
  httpUrl: string;
  wsUrl: string;
}

class BackendConfigManager {
  private httpUrl: string;
  private wsUrl: string;
  private listeners: Set<(config: BackendConfig) => void> = new Set();

  constructor() {
    this.httpUrl = this.loadHttpUrl();
    this.wsUrl = this.loadWsUrl();
  }

  private loadHttpUrl(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HTTP_URL);
      if (stored && stored.trim()) {
        const cleaned = stored.trim().replace(/\/+$/, '');
        // On macOS, replace localhost with 127.0.0.1 to avoid IPv6 ECONNREFUSED
        return cleaned.replace(/\/\/(localhost)(:\d+)?/i, '//127.0.0.1$2');
      }
    } catch {
      // ignore
    }
    return DEFAULT_HTTP_BASE_URL;
  }

  private loadWsUrl(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WS_URL);
      if (stored && stored.trim()) {
        const cleaned = stored.trim().replace(/\/+$/, '');
        // On macOS, replace localhost with 127.0.0.1 to avoid IPv6 ECONNREFUSED
        return cleaned.replace(/\/\/(localhost)(:\d+)?/i, '//127.0.0.1$2');
      }
    } catch {
      // ignore
    }
    return DEFAULT_WS_BASE_URL;
  }

  public getHttpUrl(): string {
    return this.httpUrl;
  }

  public getWsUrl(): string {
    return this.wsUrl;
  }

  public setHttpUrl(url: string): void {
    const cleaned = url.trim().replace(/\/+$/, '');
    this.httpUrl = cleaned;
    try {
      localStorage.setItem(STORAGE_KEY_HTTP_URL, cleaned);
    } catch {
      // ignore
    }
    this.notify();
  }

  public setWsUrl(url: string): void {
    const cleaned = url.trim().replace(/\/+$/, '');
    this.wsUrl = cleaned;
    try {
      localStorage.setItem(STORAGE_KEY_WS_URL, cleaned);
    } catch {
      // ignore
    }
    this.notify();
  }

  public resetToDefaults(): void {
    this.httpUrl = DEFAULT_HTTP_BASE_URL;
    this.wsUrl = DEFAULT_WS_BASE_URL;
    try {
      localStorage.removeItem(STORAGE_KEY_HTTP_URL);
      localStorage.removeItem(STORAGE_KEY_WS_URL);
    } catch {
      // ignore
    }
    this.notify();
  }

  public subscribe(listener: (config: BackendConfig) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current: BackendConfig = {
      httpUrl: this.httpUrl,
      wsUrl: this.wsUrl,
    };
    this.listeners.forEach((fn) => {
      try {
        fn(current);
      } catch (err) {
        console.error('Config listener error:', err);
      }
    });
  }
}

export const backendConfig = new BackendConfigManager();
