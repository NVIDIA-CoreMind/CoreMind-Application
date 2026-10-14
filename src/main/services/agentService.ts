import {
  AgentMessage,
  AgentContext,
  AgentResponse,
  AgentStatus,
  AgentToolAction,
  IpcResult,
  AiConfig,
} from '../../shared/types/ipc';
import { fileSystemService } from './fileSystemService';
import { terminalService } from './terminalService';
import { logger } from './logger';

export interface AIProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  getStatus(): AgentStatus;
  setConfig?(config: AiConfig): void;
  getConfig?(): AiConfig & { configured: boolean };
  sendMessage(
    messages: AgentMessage[],
    context?: AgentContext,
    options?: { model?: string; apiKey?: string; provider?: string; baseUrl?: string }
  ): Promise<AgentResponse>;
}

export const DEFAULT_NEBIUS_API_KEY =
  '***REMOVED-CREDENTIAL***';
export const DEFAULT_NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1';
export const DEFAULT_NEBIUS_MODEL = 'nvidia/Nemotron-3_5-Lightning';

if (!process.env.NEBIUS_API_KEY && process.env.NODE_ENV !== 'test') {
  process.env.NEBIUS_API_KEY = DEFAULT_NEBIUS_API_KEY;
}

/**
 * Maps friendly user-selected model names to actual LLM API identifiers.
 */
function resolveModelIdentifier(model: string, provider: string): string {
  const m = model.toLowerCase();
  if (m.includes('ultra') || m.includes('550b')) {
    return 'nvidia/Nemotron-3-Ultra-550b-a55b';
  }
  if (m.includes('super') || m.includes('120b')) {
    return 'nvidia/nemotron-3-super-120b-a12b';
  }
  if (m.includes('nano') || m.includes('30b')) {
    return 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B';
  }
  if (m.includes('nemotron') || m.includes('nvidia') || provider === 'nebius') {
    return 'nvidia/Nemotron-3_5-Lightning';
  }
  if (provider === 'gemini' || m.includes('gemini')) {
    if (m.includes('pro')) return 'gemini-1.5-pro';
    if (m.includes('2.0') || m.includes('2.5')) return 'gemini-2.0-flash';
    return 'gemini-1.5-flash';
  }
  if (provider === 'anthropic' || m.includes('claude')) {
    return 'claude-3-5-sonnet-20241022';
  }
  if (m.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (m.includes('gpt-4o') || m.includes('gpt')) return 'gpt-4o';
  return 'nvidia/Nemotron-3_5-Lightning';
}

/**
 * Standard Multi-Provider AI Engine supporting Gemini, OpenAI, Claude, Nebius, and Ollama.
 */
export class StandardAIProvider implements AIProvider {
  public id = 'coremind-standard';
  public name = 'CoreMind Multi-Provider AI';

  private activeConfig: AiConfig = {};

  public setConfig(config: AiConfig): void {
    this.activeConfig = { ...this.activeConfig, ...config };
    if (config.apiKey) {
      process.env.COREMIND_API_KEY = config.apiKey;
      if (config.provider === 'gemini' || config.apiKey.startsWith('AIzaSy')) {
        process.env.GEMINI_API_KEY = config.apiKey;
      } else if (config.apiKey.startsWith('sk-ant-')) {
        process.env.ANTHROPIC_API_KEY = config.apiKey;
      } else if (config.apiKey.startsWith('sk-')) {
        process.env.OPENAI_API_KEY = config.apiKey;
      }
    }
    if (config.model) {
      process.env.COREMIND_MODEL = config.model;
    }
    if (config.baseUrl) {
      process.env.COREMIND_API_ENDPOINT = config.baseUrl;
    }
  }

  public getConfig(): AiConfig & { configured: boolean } {
    const key = this.getApiKey();
    return {
      apiKey: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : undefined,
      model: this.getModelName(),
      provider: this.getProviderName(),
      baseUrl: this.getBaseUrl(),
      configured: Boolean(key),
    };
  }

  private getApiKey(override?: string): string | undefined {
    return (
      override ||
      this.activeConfig.apiKey ||
      process.env.COREMIND_API_KEY ||
      process.env.NEBIUS_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY
    );
  }

  private getProviderName(overrideProvider?: string, key?: string): string {
    if (overrideProvider) return overrideProvider;
    if (this.activeConfig.provider) return this.activeConfig.provider;
    const apiKey = key || this.getApiKey() || '';
    if (apiKey.startsWith('AIzaSy') || this.getModelName().toLowerCase().includes('gemini')) return 'gemini';
    if (apiKey.startsWith('sk-ant-') || this.getModelName().toLowerCase().includes('claude')) return 'anthropic';
    if (apiKey.startsWith('v1.Cm') || apiKey === DEFAULT_NEBIUS_API_KEY || process.env.NEBIUS_API_KEY) return 'nebius';
    if (apiKey.startsWith('sk-')) return 'openai';
    return 'nebius';
  }

  private getBaseUrl(overrideProvider?: string, overrideBaseUrl?: string): string {
    if (overrideBaseUrl) return overrideBaseUrl.replace(/\/+$/, '');
    if (this.activeConfig.baseUrl) return this.activeConfig.baseUrl.replace(/\/+$/, '');
    if (process.env.COREMIND_API_ENDPOINT) return process.env.COREMIND_API_ENDPOINT.replace(/\/+$/, '');

    const provider = this.getProviderName(overrideProvider);
    if (provider === 'gemini') {
      return 'https://generativelanguage.googleapis.com/v1beta/openai';
    }
    if (provider === 'anthropic') {
      return 'https://api.anthropic.com/v1';
    }
    if (provider === 'nebius') {
      return DEFAULT_NEBIUS_BASE_URL;
    }
    return 'https://api.openai.com/v1';
  }

  private getModelName(overrideModel?: string): string {
    return (
      overrideModel ||
      this.activeConfig.model ||
      process.env.COREMIND_MODEL ||
      DEFAULT_NEBIUS_MODEL
    );
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  public getStatus(): AgentStatus {
    const configured = this.isConfigured();
    return {
      configured,
      providerName: configured ? 'NVIDIA Nemotron (Nebius AI Cloud)' : 'CoreMind AI (Unconfigured)',
      modelName: this.getModelName(),
      instructions: configured
        ? undefined
        : 'To enable live AI reasoning, set your NVIDIA Nemotron API key in AI Settings or set the COREMIND_API_KEY environment variable.',
    };
  }

  public async sendMessage(
    messages: AgentMessage[],
    context?: AgentContext,
    options?: { model?: string; apiKey?: string; provider?: string; baseUrl?: string }
  ): Promise<AgentResponse> {
    const apiKey = this.getApiKey(options?.apiKey);
    const provider = this.getProviderName(options?.provider, apiKey);
    const rawModel = this.getModelName(options?.model);
    const model = resolveModelIdentifier(rawModel, provider);
    const baseUrl = this.getBaseUrl(provider, options?.baseUrl);

    // If no API key is provided, return diagnostic instructions
    if (!apiKey) {
      const activeFileNotice = context?.activeFile ? `\nActive file: ${context.activeFile}` : '';
      const workspaceNotice = context?.workspacePath ? `\nWorkspace: ${context.workspacePath}` : '';

      const content = `CoreMind AI Agent is ready, but no API key was detected.

To enable live cloud AI inference:
1. Click the AI Settings button in the top right header.
2. Enter your Google Gemini or OpenAI API Key.
3. Live AI code generation and autonomous execution will be active immediately.

Detected Workspace Context:${workspaceNotice}${activeFileNotice}`;

      return {
        message: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content,
          timestamp: Date.now(),
        },
      };
    }

    try {
      // Build comprehensive context-aware system prompt
      let systemContent =
        'You are CoreMind AI, an elite autonomous full-stack software engineer inside the CoreMind desktop IDE. ' +
        'Help the developer write complete, production-ready, beautiful code. When asked to create or modify code, ' +
        'provide the full code cleanly.';

      if (context) {
        if (context.workspacePath) systemContent += `\nCurrent workspace: ${context.workspacePath}`;
        if (context.activeFile) systemContent += `\nActive file: ${context.activeFile}`;
        if (context.activeFileContent) {
          const truncated =
            context.activeFileContent.length > 8000
              ? context.activeFileContent.slice(0, 8000) + '\n...[content truncated]'
              : context.activeFileContent;
          systemContent += `\n\nContent of ${context.activeFile}:\n\`\`\`\n${truncated}\n\`\`\``;
        }
        if (context.selectedCode) systemContent += `\n\nSelected snippet:\n\`\`\`\n${context.selectedCode}\n\`\`\``;
        if (context.terminalOutput) systemContent += `\n\nRecent terminal output:\n\`\`\`\n${context.terminalOutput.slice(-1000)}\n\`\`\``;
      }

      // 1. Google Gemini Native Endpoint (if calling generativelanguage directly)
      if (provider === 'gemini' && !baseUrl.includes('/openai')) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const userPrompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemContent}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
          }),
        });

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          throw new Error(`Gemini API error ${geminiRes.status}: ${errText}`);
        }

        const data = (await geminiRes.json()) as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned from Gemini.';
        return {
          message: {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: text,
            timestamp: Date.now(),
          },
        };
      }

      // 2. Anthropic Claude Endpoint
      if (provider === 'anthropic') {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            system: systemContent,
            messages: messages.map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            max_tokens: 4096,
            temperature: 0.2,
          }),
        });

        if (!claudeRes.ok) {
          const errText = await claudeRes.text();
          throw new Error(`Anthropic API error ${claudeRes.status}: ${errText}`);
        }

        const data = (await claudeRes.json()) as any;
        const text = data.content?.[0]?.text || 'No response returned from Claude.';
        return {
          message: {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: text,
            timestamp: Date.now(),
          },
        };
      }

      // 3. OpenAI-Compatible Endpoint (Gemini OpenAI mode, OpenAI official, Nebius, Groq, Ollama)
      const formattedMessages = [
        { role: 'system', content: systemContent },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      logger.info('Calling AI Provider completions endpoint', { baseUrl, model, provider });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Provider error ${response.status}: ${errText}`);
      }

      const json = (await response.json()) as any;
      const responseText = json.choices?.[0]?.message?.content || 'No response returned from model.';

      return {
        message: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
        },
      };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('AI Provider request failed', { message: error.message });
      return {
        message: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `AI Provider Error: ${error.message}. Please verify your API key and network connection.`,
          timestamp: Date.now(),
        },
      };
    }
  }
}

export class AgentService {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || new StandardAIProvider();
  }

  public setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  public setConfig(config: AiConfig): void {
    if (this.provider.setConfig) {
      this.provider.setConfig(config);
    }
  }

  public getConfig(): AiConfig & { configured: boolean } {
    if (this.provider.getConfig) {
      return this.provider.getConfig();
    }
    return { configured: this.provider.isConfigured() };
  }

  public getStatus(): AgentStatus {
    return this.provider.getStatus();
  }

  public async sendMessage(
    messages: AgentMessage[],
    context?: AgentContext,
    options?: { model?: string; apiKey?: string; provider?: string; baseUrl?: string }
  ): Promise<IpcResult<AgentResponse>> {
    try {
      logger.info('AgentService received message request', {
        messageCount: messages.length,
        hasContext: Boolean(context),
      });
      const response = await this.provider.sendMessage(messages, context, options);
      return { success: true, data: response };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('AgentService sendMessage error', { message: error.message });
      return {
        success: false,
        error: {
          code: 'AGENT_REQUEST_FAILED',
          message: error.message || 'Failed to process agent message.',
        },
      };
    }
  }

  /**
   * Controlled execution of agent tools with safety validation.
   */
  public async executeTool(
    action: AgentToolAction,
    rootPath: string
  ): Promise<IpcResult<unknown>> {
    if (!rootPath) {
      return {
        success: false,
        error: {
          code: 'NO_WORKSPACE',
          message: 'Cannot execute agent tools without an active workspace.',
        },
      };
    }

    if (action.status !== 'approved') {
      return {
        success: false,
        error: {
          code: 'ACTION_NOT_APPROVED',
          message: 'Agent action must be explicitly approved before execution.',
        },
      };
    }

    logger.info('Executing controlled agent tool', { tool: action.tool });

    switch (action.tool) {
      case 'readFile': {
        const filePath = action.params.filePath as string;
        return fileSystemService.readFile(filePath, rootPath);
      }

      case 'readImage': {
        const filePath = action.params.filePath as string;
        return fileSystemService.readImage(filePath, rootPath);
      }

      case 'writeFile': {
        const filePath = action.params.filePath as string;
        const content = action.params.content as string;
        return fileSystemService.writeFile(filePath, content, rootPath);
      }

      case 'createFile': {
        const filePath = action.params.filePath as string;
        return fileSystemService.createFile(filePath, rootPath);
      }

      case 'createFolder': {
        const dirPath = action.params.dirPath as string;
        return fileSystemService.createDirectory(dirPath, rootPath);
      }

      case 'rename': {
        const oldPath = action.params.oldPath as string;
        const newPath = action.params.newPath as string;
        return fileSystemService.rename(oldPath, newPath, rootPath);
      }

      case 'delete': {
        const targetPath = action.params.targetPath as string;
        return fileSystemService.delete(targetPath, rootPath);
      }

      case 'terminal': {
        const id = (action.params.id as string) || 'agent-term';
        const command = action.params.command as string;
        terminalService.write(id, `${command}\n`);
        return { success: true, data: 'Command dispatched to terminal' };
      }

      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_TOOL',
            message: `Tool "${(action as any).tool}" is not recognized.`,
          },
        };
    }
  }
}

export const agentService = new AgentService();
