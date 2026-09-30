import { create } from 'zustand';
import { backendConfig } from '../services/coremind/config';
import { coremindWs, WsConnectionStatus } from '../services/coremind/websocket';
import { settingsService } from '../services/coremind/settings';
import {
  AITestResponse,
  AIUsageResponse,
  SafeSettingsResponse,
} from '../services/coremind/types';

interface BackendStore {
  wsStatus: WsConnectionStatus;
  isHealthy: boolean;
  httpUrl: string;
  wsUrl: string;
  serviceInfo: { service?: string; version?: string } | null;
  aiTestResult: AITestResponse | null;
  isTestingAi: boolean;
  aiUsage: AIUsageResponse | null;
  safeSettings: SafeSettingsResponse | null;
  lastCheckTime: number | null;
  error: string | null;

  init: () => void;
  checkHealth: () => Promise<boolean>;
  testAiConnection: () => Promise<boolean>;
  fetchAiUsage: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  setHttpUrl: (url: string) => void;
  setWsUrl: (url: string) => void;
  reconnect: () => void;
  resetConfig: () => void;
}

export const useBackendStore = create<BackendStore>((set, get) => ({
  wsStatus: coremindWs.getStatus(),
  isHealthy: false,
  httpUrl: backendConfig.getHttpUrl(),
  wsUrl: backendConfig.getWsUrl(),
  serviceInfo: null,
  aiTestResult: null,
  isTestingAi: false,
  aiUsage: null,
  safeSettings: null,
  lastCheckTime: null,
  error: null,

  init: () => {
    // Subscribe to WebSocket connection status changes
    coremindWs.onStatusChange((status) => {
      set({ wsStatus: status });
      if (status === 'connected') {
        get().checkHealth();
      }
    });

    // Subscribe to config URL updates
    backendConfig.subscribe((config) => {
      set({ httpUrl: config.httpUrl, wsUrl: config.wsUrl });
    });

    // Connect WebSocket
    coremindWs.connect();

    // Check HTTP health initially
    get().checkHealth();

    // Fetch non-secret settings in background
    get().fetchSettings();

    // Periodically re-probe backend health and reconnect WS if offline
    setInterval(() => {
      const state = get();
      if (!state.isHealthy || state.wsStatus !== 'connected') {
        state.checkHealth();
        if (state.wsStatus === 'disconnected' || state.wsStatus === 'error') {
          coremindWs.connect();
        }
      }
    }, 3000);
  },

  checkHealth: async (): Promise<boolean> => {
    try {
      const res = await settingsService.checkHealth();
      const healthy = res?.status === 'ok';
      set({
        isHealthy: healthy,
        serviceInfo: { service: res.service, version: res.version },
        lastCheckTime: Date.now(),
        error: null,
      });
      return healthy;
    } catch (err: unknown) {
      const error = err as Error;
      set({
        isHealthy: false,
        lastCheckTime: Date.now(),
        error: error.message || 'Cannot reach CoreMind backend',
      });
      return false;
    }
  },

  testAiConnection: async (): Promise<boolean> => {
    set({ isTestingAi: true, error: null });
    try {
      const res = await settingsService.testAi();
      set({ aiTestResult: res, isTestingAi: false });
      // Also refresh usage stats
      get().fetchAiUsage();
      return res.status === 'ok';
    } catch (err: unknown) {
      const error = err as Error;
      set({
        isTestingAi: false,
        error: `AI Test Failed: ${error.message}`,
        aiTestResult: null,
      });
      return false;
    }
  },

  fetchAiUsage: async () => {
    try {
      const res = await settingsService.getAiUsage();
      set({ aiUsage: res });
    } catch {
      // ignore
    }
  },

  fetchSettings: async () => {
    try {
      const res = await settingsService.getSettings();
      set({ safeSettings: res });
    } catch {
      // ignore
    }
  },

  setHttpUrl: (url: string) => {
    backendConfig.setHttpUrl(url);
    get().checkHealth();
  },

  setWsUrl: (url: string) => {
    backendConfig.setWsUrl(url);
    coremindWs.reconnect();
  },

  reconnect: () => {
    coremindWs.reconnect();
    get().checkHealth();
  },

  resetConfig: () => {
    backendConfig.resetToDefaults();
    coremindWs.reconnect();
    get().checkHealth();
  },
}));
