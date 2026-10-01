import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AgentService,
  StandardAIProvider,
  AIProvider,
} from '../src/main/services/agentService';
import {
  AgentMessage,
  AgentContext,
  AgentResponse,
} from '../src/shared/types/ipc';

describe('AgentService & AI Provider Architecture', () => {
  let tempWorkspace: string;

  beforeEach(async () => {
    tempWorkspace = await fs.mkdtemp(path.join(process.cwd(), '.coremind-agent-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempWorkspace, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('unconfigured provider returns diagnostic status and context instead of fake AI responses', async () => {
    // Ensure no API keys in env for this test
    const oldKey = process.env.COREMIND_API_KEY;
    delete process.env.COREMIND_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEBIUS_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const provider = new StandardAIProvider();
      expect(provider.isConfigured()).toBe(false);

      const status = provider.getStatus();
      expect(status.configured).toBe(false);
      expect(status.instructions).toContain('COREMIND_API_KEY');

      const messages: AgentMessage[] = [
        { id: '1', role: 'user', content: 'Create a login form', timestamp: Date.now() },
      ];
      const context: AgentContext = {
        workspacePath: tempWorkspace,
        activeFile: 'Login.tsx',
        activeFileContent: 'export const Login = () => {};',
      };

      const response = await provider.sendMessage(messages, context);
      expect(response.message.content).toContain('no API key was detected');
      expect(response.message.content).toContain(tempWorkspace);
      expect(response.message.content).toContain('Login.tsx');
    } finally {
      if (oldKey) process.env.COREMIND_API_KEY = oldKey;
    }
  });

  it('custom modular AIProvider can be injected into AgentService', async () => {
    class MockProvider implements AIProvider {
      id = 'mock-provider';
      name = 'Mock AI';
      isConfigured() {
        return true;
      }
      getStatus() {
        return { configured: true, providerName: 'Mock AI' };
      }
      async sendMessage(
        messages: AgentMessage[],
        context?: AgentContext
      ): Promise<AgentResponse> {
        return {
          message: {
            id: 'mock-1',
            role: 'assistant',
            content: `Echo: ${messages[0].content} in ${context?.activeFile}`,
            timestamp: Date.now(),
          },
        };
      }
    }

    const agentService = new AgentService(new MockProvider());
    expect(agentService.getStatus().configured).toBe(true);

    const result = await agentService.sendMessage(
      [{ id: '1', role: 'user', content: 'Refactor code', timestamp: Date.now() }],
      {
        workspacePath: tempWorkspace,
        activeFile: 'App.tsx',
        activeFileContent: 'const a = 1;',
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message.content).toBe('Echo: Refactor code in App.tsx');
    }
  });

  it('controlled tool execution prevents actions outside workspace', async () => {
    const agentService = new AgentService();

    // Rejects when no workspace
    const noWorkspaceResult = await agentService.executeTool(
      {
        tool: 'createFile',
        params: { filePath: '/etc/evil.txt' },
        status: 'approved',
      },
      ''
    );
    expect(noWorkspaceResult.success).toBe(false);

    // Rejects path traversal outside workspace
    const traversalResult = await agentService.executeTool(
      {
        tool: 'createFile',
        params: { filePath: path.join(tempWorkspace, '../../evil.txt') },
        status: 'approved',
      },
      tempWorkspace
    );
    expect(traversalResult.success).toBe(false);

    // Allows valid safe operations within workspace
    const safeFilePath = path.join(tempWorkspace, 'safe.ts');
    const safeResult = await agentService.executeTool(
      {
        tool: 'createFile',
        params: { filePath: safeFilePath },
        status: 'approved',
      },
      tempWorkspace
    );
    expect(safeResult.success).toBe(true);
    expect(await fs.stat(safeFilePath)).toBeDefined();
  });

  it('rejects unapproved agent actions', async () => {
    const agentService = new AgentService();
    const result = await agentService.executeTool(
      {
        tool: 'createFile',
        params: { filePath: path.join(tempWorkspace, 'unapproved.ts') },
        status: 'pending',
      },
      tempWorkspace
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ACTION_NOT_APPROVED');
  });
});
