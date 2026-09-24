import {
  AgentMessage,
  AgentContext,
  AgentResponse,
  AgentStatus,
  AgentToolAction,
  IpcResult,
} from '../../shared/types/ipc';
import { fileSystemService } from './fileSystemService';
import { terminalService } from './terminalService';
import { logger } from './logger';

export interface AIProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  getStatus(): AgentStatus;
  sendMessage(
    messages: AgentMessage[],
    context?: AgentContext
  ): Promise<AgentResponse>;
}

/**
 * Standard HTTP AI Provider supporting OpenAI / Nebius / Gemini compatible endpoints.
 */
export class StandardAIProvider implements AIProvider {
  public id = 'coremind-standard';
  public name = 'CoreMind AI Provider';

  private getApiKey(): string | undefined {
    return (
      process.env.COREMIND_API_KEY ||
      process.env.NEBIUS_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY
    );
  }

  private getBaseUrl(): string {
    if (process.env.COREMIND_API_ENDPOINT) {
      return process.env.COREMIND_API_ENDPOINT;
    }
    if (process.env.NEBIUS_API_KEY) {
      return 'https://api.studio.nebius.ai/v1';
    }
    return 'https://api.openai.com/v1';
  }

  private getModelName(): string {
    return (
      process.env.COREMIND_MODEL ||
      process.env.NEBIUS_MODEL ||
      'meta-llama/Meta-Llama-3.1-70B-Instruct'
    );
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  public getStatus(): AgentStatus {
    const configured = this.isConfigured();
    return {
      configured,
      providerName: configured ? 'CoreMind Live AI' : 'CoreMind AI (Unconfigured)',
      modelName: this.getModelName(),
      instructions: configured
        ? undefined
        : 'To enable live AI inference, set COREMIND_API_KEY, NEBIUS_API_KEY, or OPENAI_API_KEY.',
    };
  }

  public async sendMessage(
    messages: AgentMessage[],
    context?: AgentContext
  ): Promise<AgentResponse> {
    const apiKey = this.getApiKey();

    // If no API key is provided, respond with clear diagnostic instructions rather than a fake response
    if (!apiKey) {
      const activeFileNotice = context?.activeFile
        ? `\nActive file: ${context.activeFile}`
        : '';
      const workspaceNotice = context?.workspacePath
        ? `\nWorkspace: ${context.workspacePath}`
        : '';

      const content = `CoreMind AI Agent is ready, but no API key was detected in the environment.

To enable live AI inference, set your API key in the environment or terminal:
  export COREMIND_API_KEY="your-api-key"
  (or NEBIUS_API_KEY, OPENAI_API_KEY)

Real Context Detected by CoreMind:${workspaceNotice}${activeFileNotice}

Once configured, the agent will analyze your workspace and assist with coding, debugging, and refactoring.`;

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
      const baseUrl = this.getBaseUrl();
      const model = this.getModelName();

      // Build system prompt incorporating structured workspace context
      let systemContent =
        'You are CoreMind AI, an intelligent coding agent inside the CoreMind desktop IDE. ' +
        'Help the developer write, refactor, and understand code accurately and concisely.';

      if (context) {
        if (context.workspacePath) {
          systemContent += `\nCurrent workspace: ${context.workspacePath}`;
        }
        if (context.activeFile) {
          systemContent += `\nCurrently opened file: ${context.activeFile}`;
        }
        if (context.activeFileContent) {
          // Send bounded snippet of active file (up to 8000 characters)
          const truncated =
            context.activeFileContent.length > 8000
              ? context.activeFileContent.slice(0, 8000) + '\n...[content truncated]'
              : context.activeFileContent;
          systemContent += `\n\nContent of ${context.activeFile}:\n\`\`\`\n${truncated}\n\`\`\``;
        }
        if (context.selectedCode) {
          systemContent += `\n\nSelected snippet:\n\`\`\`\n${context.selectedCode}\n\`\`\``;
        }
        if (context.terminalOutput) {
          systemContent += `\n\nRecent terminal output:\n\`\`\`\n${context.terminalOutput.slice(-1000)}\n\`\`\``;
        }
      }

      const formattedMessages = [
        { role: 'system', content: systemContent },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      logger.info('Calling AI Provider endpoint', { baseUrl, model });

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
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Provider HTTP error ${response.status}: ${errText}`);
      }

      const json = (await response.json()) as any;
      const responseText =
        json.choices?.[0]?.message?.content || 'No response returned from model.';

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
          content: `AI Provider Error: ${error.message}. Please check your network connection and API key configuration.`,
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

  public getStatus(): AgentStatus {
    return this.provider.getStatus();
  }

  public async sendMessage(
    messages: AgentMessage[],
    context?: AgentContext
  ): Promise<IpcResult<AgentResponse>> {
    try {
      logger.info('AgentService received message request', {
        messageCount: messages.length,
        hasContext: Boolean(context),
      });
      const response = await this.provider.sendMessage(messages, context);
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

    logger.info('Executing controlled agent tool', { tool: action.tool });

    switch (action.tool) {
      case 'readFile': {
        const filePath = action.params.filePath as string;
        return fileSystemService.readFile(filePath, rootPath);
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
