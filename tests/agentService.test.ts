import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AgentService,
  StandardAIProvider,
  AIProvider,
  AIProviderError,
  resolveModelIdentifier,
} from '../src/main/services/agentService';

// Every variable the provider reads. Cleared per test so results do not depend on the developer's shell.
const PROVIDER_ENV_VARS = [
  'COREMIND_API_KEY',
  'NEBIUS_API_KEY',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'COREMIND_MODEL',
  'COREMIND_API_ENDPOINT',
];
import {
  AgentMessage,
  AgentContext,
  AgentResponse,
} from '../src/shared/types/ipc';

describe('AgentService & AI Provider Architecture', () => {
  let tempWorkspace: string;
  let savedEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    savedEnv = Object.fromEntries(PROVIDER_ENV_VARS.map((name) => [name, process.env[name]]));
    for (const name of PROVIDER_ENV_VARS) delete process.env[name];
    tempWorkspace = await fs.mkdtemp(path.join(process.cwd(), '.coremind-agent-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempWorkspace, { recursive: true, force: true });
    } catch {
      // ignore
    }
    for (const name of PROVIDER_ENV_VARS) {
      if (savedEnv[name] === undefined) delete process.env[name];
      else process.env[name] = savedEnv[name];
    }
    vi.unstubAllGlobals();
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

  const sampleMessages: AgentMessage[] = [{ id: '1', role: 'user', content: 'Ping', timestamp: Date.now() }];

  function stubProviderResponse(response: Response): void {
    vi.stubGlobal('fetch', vi.fn(async () => response));
  }

  function configuredService(): AgentService {
    const provider = new StandardAIProvider();
    provider.setConfig({ apiKey: 'test-key', baseUrl: 'https://example.test/v1' });
    return new AgentService(provider);
  }

  it('refuses to call any provider when the user has not configured a key', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await new AgentService().sendMessage(sampleMessages);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('NOT_CONFIGURED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a successful result when the provider replies with text', async () => {
    stubProviderResponse(
      new Response(JSON.stringify({ choices: [{ message: { content: 'PONG' } }] }), { status: 200 })
    );

    const result = await configuredService().sendMessage(sampleMessages);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message.content).toBe('PONG');
  });

  it('reports a provider HTTP failure as a failed result instead of reply text', async () => {
    stubProviderResponse(new Response('invalid api key', { status: 401 }));

    const result = await configuredService().sendMessage(sampleMessages);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('HTTP_401');
      expect(result.error.message).toContain('401');
    }
  });

  it('treats an empty model reply as a failure', async () => {
    stubProviderResponse(new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }));

    const result = await configuredService().sendMessage(sampleMessages);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('EMPTY_RESPONSE');
  });

  it('resolves Nebius model names to exact identifiers and rejects unknown ones', () => {
    expect(resolveModelIdentifier('NVIDIA Nemotron 3 Ultra', 'nebius')).toBe('nvidia/Nemotron-3-Ultra-550b-a55b');
    expect(resolveModelIdentifier('nvidia/nemotron-3-super-120b-a12b', 'nebius')).toBe(
      'nvidia/nemotron-3-super-120b-a12b'
    );
    expect(() => resolveModelIdentifier('nvidia/llama-3.3-nemotron-super-49b-v1', 'nebius')).toThrow(AIProviderError);
  });

  it('passes non-Nebius model names through unchanged', () => {
    expect(resolveModelIdentifier('gemini-2.5-pro', 'gemini')).toBe('gemini-2.5-pro');
  });
});
