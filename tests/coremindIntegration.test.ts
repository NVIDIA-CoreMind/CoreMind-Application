import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreMindClient } from '../src/renderer/services/coremind/client';
import { CoreMindApiError } from '../src/renderer/services/coremind/errors';
import { backendConfig } from '../src/renderer/services/coremind/config';
import { CoreMindWebSocketService } from '../src/renderer/services/coremind/websocket';

describe('CoreMind Backend Integration Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    backendConfig.resetToDefaults();
  });

  describe('Configuration Manager', () => {
    it('defaults to port 43110 for HTTP and WebSocket', () => {
      expect(backendConfig.getHttpUrl()).toBe('http://127.0.0.1:43110');
      expect(backendConfig.getWsUrl()).toBe('ws://127.0.0.1:43110/ws');
    });

    it('updates URLs dynamically and trims trailing slashes', () => {
      backendConfig.setHttpUrl('http://127.0.0.1:43110/');
      backendConfig.setWsUrl('ws://127.0.0.1:43110/ws/');
      expect(backendConfig.getHttpUrl()).toBe('http://127.0.0.1:43110');
      expect(backendConfig.getWsUrl()).toBe('ws://127.0.0.1:43110/ws');
    });
  });

  describe('CoreMind HTTP Client & Error Handling', () => {
    it('constructs typed CoreMindApiError with details', () => {
      const err = new CoreMindApiError(401, {
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
        details: { expired_at: '2026-09-30T10:00:00Z' },
      });
      expect(err.code).toBe('AUTH_TOKEN_EXPIRED');
      expect(err.isAuthExpired()).toBe(true);
      expect(err.isUnauthorized()).toBe(true);
      expect(err.details?.expired_at).toBe('2026-09-30T10:00:00Z');
    });

    it('attaches Bearer token to headers when token is set', async () => {
      const client = new CoreMindClient();
      client.setTokens({ accessToken: 'test-token-xyz' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      } as any);

      await client.get('/health');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:43110/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-xyz',
          }),
        })
      );
    });

    it('throws CoreMindApiError on HTTP error status', async () => {
      const client = new CoreMindClient();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent task does not exist',
          },
        }),
      } as any);

      await expect(client.get('/v1/agent/nonexistent')).rejects.toThrow('Agent task does not exist');
    });
  });

  describe('CoreMind WebSocket Service', () => {
    it('initializes with disconnected state', () => {
      const wsService = new CoreMindWebSocketService();
      expect(wsService.getStatus()).toBe('disconnected');
      expect(wsService.isConnected()).toBe(false);
    });

    it('registers and triggers event listeners', () => {
      const wsService = new CoreMindWebSocketService();
      const listener = vi.fn();
      const unsub = wsService.on('task.started', listener);

      (wsService as any).dispatchEvent({
        type: 'task.started',
        timestamp: '2026-09-30T10:00:00Z',
        data: { task_id: 'task_1', title: 'Test Task' },
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task.started',
          data: { task_id: 'task_1', title: 'Test Task' },
        })
      );

      unsub();
      (wsService as any).dispatchEvent({
        type: 'task.started',
        timestamp: '2026-09-30T10:00:00Z',
        data: { task_id: 'task_2' },
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
