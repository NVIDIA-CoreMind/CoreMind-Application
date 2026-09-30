import { coremindClient } from './client';
import {
  AITestResponse,
  AIUsageResponse,
  SafeSettingsResponse,
} from './types';

export class SettingsService {
  /**
   * Health readiness check probe.
   */
  public async checkHealth(): Promise<{ status: string; service?: string; version?: string }> {
    return coremindClient.get<{ status: string; service?: string; version?: string }>('/health');
  }

  /**
   * Safe, non-secret backend runtime settings.
   */
  public async getSettings(): Promise<SafeSettingsResponse> {
    return coremindClient.get<SafeSettingsResponse>('/v1/settings');
  }

  /**
   * Triggers test prompt to Nebius / NVIDIA Nemotron AI backend.
   */
  public async testAi(): Promise<AITestResponse> {
    return coremindClient.post<AITestResponse>('/v1/ai/test');
  }

  /**
   * Queries AI token usage metrics.
   */
  public async getAiUsage(): Promise<AIUsageResponse> {
    return coremindClient.get<AIUsageResponse>('/v1/ai/usage');
  }
}

export const settingsService = new SettingsService();
