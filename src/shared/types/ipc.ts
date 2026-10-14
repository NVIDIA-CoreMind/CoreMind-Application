export interface IpcError {
  code: string;
  message: string;
  details?: unknown;
}

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError };


export interface WorkspaceFileChange {
  path: string;
  type: 'changed' | 'deleted';
}

export interface TerminalSpawnOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
  shell?: string;
  shellArgs?: string[];
}

export interface ShellInfo {
  name: string;
  path: string;
  args?: string[];
  isDefault: boolean;
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

export interface ImageReadResult {
  dataUrl: string;
  base64: string;
  mimeType: string;
  size: number;
  name: string;
  filePath: string;
}

export interface AgentToolAction {
  tool: 'readFile' | 'readImage' | 'writeFile' | 'createFile' | 'createFolder' | 'rename' | 'delete' | 'terminal';
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

// Execution Engine Interfaces
export interface ExecuteCommandOptions {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  maxBufferBytes?: number;
}

export interface ExecuteCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  killed: boolean;
}

export interface AiConfig {
  apiKey?: string;
  model?: string;
  provider?: string;
  baseUrl?: string;
}

export interface AgentTaskRequest {
  prompt: string;
  workspacePath: string;
  model?: string;
  apiKey?: string;
  provider?: string;
  baseUrl?: string;
  context?: AgentContext;
  history?: Array<{ role: string; content: string }>;
}

export interface AgentTaskSummary {
  implemented: string;
  filesChanged: Array<{ file: string; action?: 'created' | 'modified'; lines?: number }>;
  commandsExecuted: string[];
  testsPassed: boolean;
  notes?: string;
}

export type AgentStreamEvent =
  | { type: 'explanation'; text: string }
  | { type: 'status'; text: string; step?: string }
  | { type: 'thought'; text: string }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_end'; tool: string; result: unknown }
  | { type: 'terminal_output'; command: string; data: string; stream: 'stdout' | 'stderr' }
  | { type: 'terminal_command_end'; command: string; exitCode: number }
  | { type: 'file_change'; file: string; action: 'created' | 'modified' | 'deleted'; lines?: number; additions?: number; deletions?: number }
  | { type: 'file_read'; file: string; startLine?: number; endLine?: number }
  | { type: 'search'; query: string; resultsCount?: number }
  | { type: 'test_result'; testName: string; passed: boolean; message?: string }
  | { type: 'error'; message: string; fatal?: boolean }
  | { type: 'complete'; summary: string; filesChanged: Array<{ file: string; action?: 'created' | 'modified'; lines?: number }>; commandsExecuted: string[]; success: boolean };

export const IPC_CHANNELS = {
  // File System
  FILE_OPEN_DIRECTORY_DIALOG: 'file:open-directory-dialog',
  WORKSPACE_RESTORE: 'workspace:restore',
  WORKSPACE_WATCH: 'workspace:watch',
  WORKSPACE_FILES_CHANGED: 'workspace:files-changed',
  FILE_READ_DIRECTORY: 'file:read-directory',
  FILE_READ: 'file:read',
  FILE_READ_IMAGE: 'file:read-image',
  FILE_OPEN_IMAGE_DIALOG: 'file:open-image-dialog',
  FILE_WRITE: 'file:write',
  FILE_CREATE_FILE: 'file:create-file',
  FILE_CREATE_DIRECTORY: 'file:create-directory',
  FILE_RENAME: 'file:rename',
  FILE_DELETE: 'file:delete',
  FILE_SEARCH: 'file:search',
  FILE_STAT: 'file:stat',
  FILE_REVEAL_IN_EXPLORER: 'file:reveal-in-explorer',
  FILE_COPY: 'file:copy',

  // Git Operations
  GIT_STATUS: 'git:status',
  GIT_DIFF: 'git:diff',
  GIT_ADD: 'git:add',
  GIT_COMMIT: 'git:commit',
  GIT_BRANCHES: 'git:branches',
  GIT_CHECKOUT: 'git:checkout',
  GIT_PULL: 'git:pull',
  GIT_PUSH: 'git:push',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',
  TERMINAL_GET_SHELLS: 'terminal:get-shells',
  TERMINAL_EXECUTE_COMMAND: 'terminal:execute-command',

  // AI Agent
  AGENT_SEND_MESSAGE: 'agent:send-message',
  AGENT_GET_STATUS: 'agent:get-status',
  AGENT_SET_CONFIG: 'agent:set-config',
  AGENT_GET_CONFIG: 'agent:get-config',
  AGENT_EXECUTE_TOOL: 'agent:execute-tool',
  AGENT_RUN_TASK: 'agent:run-task',
  AGENT_CANCEL_TASK: 'agent:cancel-task',
  AGENT_STREAM_EVENT: 'agent:stream-event',

  // App & Window
  APP_GET_SYSTEM_INFO: 'app:get-system-info',
  APP_GET_PLATFORM: 'app:get-platform',
  APP_WINDOW_MINIMIZE: 'app:window-minimize',
  APP_WINDOW_MAXIMIZE: 'app:window-maximize',
  APP_WINDOW_CLOSE: 'app:window-close',
  APP_WINDOW_SET_TITLE_BAR_OVERLAY: 'app:window-set-title-bar-overlay',

  // External & Auth
  AUTH_OPEN_WINDOW: 'auth:open-window',
  AUTH_OPEN_IN_CHROME: 'auth:open-in-chrome',
  OPEN_EXTERNAL_URL: 'app:open-external-url',

  // Virtual Mobile Device
  VM_GET_SDK_STATUS: 'virtual-mobile:get-sdk-status',
  VM_GET_FLUTTER_SDK_STATUS: 'virtual-mobile:get-flutter-sdk-status',
  VM_LIST_DEVICES: 'virtual-mobile:list-devices',
  VM_LIST_AVDS: 'virtual-mobile:list-avds',
  VM_REFRESH_DEVICES: 'virtual-mobile:refresh-devices',
  VM_START_EMULATOR: 'virtual-mobile:start-emulator',
  VM_STOP_EMULATOR: 'virtual-mobile:stop-emulator',
  VM_GET_EMULATOR_STATE: 'virtual-mobile:get-emulator-state',
  VM_TAKE_SCREENSHOT: 'virtual-mobile:take-screenshot',
  VM_START_LOG_STREAM: 'virtual-mobile:start-log-stream',
  VM_STOP_LOG_STREAM: 'virtual-mobile:stop-log-stream',
  VM_GET_FLUTTER_DEVICES: 'virtual-mobile:get-flutter-devices',
  VM_FLUTTER_RUN: 'virtual-mobile:flutter-run',
  VM_FLUTTER_HOT_RELOAD: 'virtual-mobile:flutter-hot-reload',
  VM_FLUTTER_HOT_RESTART: 'virtual-mobile:flutter-hot-restart',
  VM_FLUTTER_STOP: 'virtual-mobile:flutter-stop',
  VM_GET_FLUTTER_RUN_STATE: 'virtual-mobile:get-flutter-run-state',
  VM_CHECK_FLUTTER_PROJECT: 'virtual-mobile:check-flutter-project',
  VM_SEND_TOUCH: 'virtual-mobile:send-touch',
  VM_SEND_SWIPE: 'virtual-mobile:send-swipe',
  VM_SEND_KEY: 'virtual-mobile:send-key',
  VM_SEND_TEXT: 'virtual-mobile:send-text',
  VM_SET_ORIENTATION: 'virtual-mobile:set-orientation',
  VM_OPEN_ANDROID_STUDIO: 'virtual-mobile:open-android-studio',
  VM_FLUTTER_PUB_GET: 'virtual-mobile:flutter-pub-get',
  VM_START_SCREEN_STREAM: 'virtual-mobile:start-screen-stream',
  VM_STOP_SCREEN_STREAM: 'virtual-mobile:stop-screen-stream',
  VM_EVENT: 'virtual-mobile:event',
} as const;


