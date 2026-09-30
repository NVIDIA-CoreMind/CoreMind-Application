import { coremindClient } from './client';
import {
  DirectToolResponse,
  SandboxExecuteResponse,
  SandboxInstance,
} from './types';

export class ToolsService {
  /**
   * Fast file search via backend tool.
   */
  public async search(projectPath: string, query: string): Promise<DirectToolResponse> {
    return coremindClient.post<DirectToolResponse>('/v1/tools/search', {
      tool: 'search_files',
      args: { query },
      project_path: projectPath,
    });
  }

  /**
   * Live web search via backend tool.
   */
  public async webSearch(projectPath: string, query: string): Promise<DirectToolResponse> {
    return coremindClient.post<DirectToolResponse>('/v1/tools/web-search', {
      tool: 'web_search',
      args: { query },
      project_path: projectPath,
    });
  }

  /**
   * Surgical file reading with offset and line boundaries.
   */
  public async read(
    projectPath: string,
    filePath: string,
    startLine?: number,
    endLine?: number
  ): Promise<DirectToolResponse> {
    const args: Record<string, any> = { file_path: filePath };
    if (startLine !== undefined) args.start_line = startLine;
    if (endLine !== undefined) args.end_line = endLine;

    return coremindClient.post<DirectToolResponse>('/v1/tools/read', {
      tool: 'read_file',
      args,
      project_path: projectPath,
    });
  }

  /**
   * Direct file write / overwrite.
   */
  public async write(projectPath: string, filePath: string, content: string): Promise<DirectToolResponse> {
    return coremindClient.post<DirectToolResponse>('/v1/tools/write', {
      tool: 'write_file',
      args: { file_path: filePath, content },
      project_path: projectPath,
    });
  }

  /**
   * Direct search-and-replace edit.
   */
  public async edit(
    projectPath: string,
    filePath: string,
    targetContent: string,
    replacementContent: string
  ): Promise<DirectToolResponse> {
    return coremindClient.post<DirectToolResponse>('/v1/tools/edit', {
      tool: 'edit_file',
      args: {
        file_path: filePath,
        target_content: targetContent,
        replacement_content: replacementContent,
      },
      project_path: projectPath,
    });
  }

  /**
   * Spawns an isolated sandbox execution environment.
   */
  public async createSandbox(projectPath: string): Promise<SandboxInstance> {
    return coremindClient.post<SandboxInstance>('/v1/sandbox/create', { project_path: projectPath });
  }

  /**
   * Executes code safely within sandbox.
   */
  public async executeSandbox(
    sandboxId: string,
    command: string,
    timeoutMs: number = 30000
  ): Promise<SandboxExecuteResponse> {
    return coremindClient.post<SandboxExecuteResponse>('/v1/sandbox/execute', {
      sandbox_id: sandboxId,
      command,
      timeout_ms: timeoutMs,
    });
  }

  /**
   * Destroys sandbox instance.
   */
  public async destroySandbox(sandboxId: string): Promise<{ status: string; sandbox_id: string }> {
    return coremindClient.post<{ status: string; sandbox_id: string }>('/v1/sandbox/destroy', {
      sandbox_id: sandboxId,
    });
  }
}

export const toolsService = new ToolsService();
