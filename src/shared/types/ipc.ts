export interface IpcError {
  code: string;
  message: string;
  details?: unknown;
}

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError };


export interface TerminalSpawnOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  osVersion: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
}

// AI Agent Interfaces
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentContext {
  workspacePath: string | null;
  activeFile: string | null;
  activeFileContent: string | null;
  selectedCode?: string | null;
  terminalOutput?: string | null;
}

export interface AgentToolAction {
  tool: 'readFile' | 'writeFile' | 'createFile' | 'createFolder' | 'rename' | 'delete' | 'terminal';
  params: Record<string, unknown>;
  status?: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
}

export interface AgentResponse {
  message: AgentMessage;
  suggestedActions?: AgentToolAction[];
}

export interface AgentStatus {
  configured: boolean;
  providerName: string;
  modelName?: string;
  instructions?: string;
}

export const IPC_CHANNELS = {
  // File System
  FILE_OPEN_DIRECTORY_DIALOG: 'file:open-directory-dialog',
  FILE_READ_DIRECTORY: 'file:read-directory',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_CREATE_FILE: 'file:create-file',
  FILE_CREATE_DIRECTORY: 'file:create-directory',
  FILE_RENAME: 'file:rename',
  FILE_DELETE: 'file:delete',
  FILE_SEARCH: 'file:search',
  FILE_STAT: 'file:stat',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',

  // AI Agent
  AGENT_SEND_MESSAGE: 'agent:send-message',
  AGENT_GET_STATUS: 'agent:get-status',
  AGENT_EXECUTE_TOOL: 'agent:execute-tool',

  // App & Window
  APP_GET_SYSTEM_INFO: 'app:get-system-info',
  APP_WINDOW_MINIMIZE: 'app:window-minimize',
  APP_WINDOW_MAXIMIZE: 'app:window-maximize',
  APP_WINDOW_CLOSE: 'app:window-close',

  // External & Auth
  AUTH_OPEN_WINDOW: 'auth:open-window',
  OPEN_EXTERNAL_URL: 'app:open-external-url',
} as const;
