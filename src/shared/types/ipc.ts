export interface IpcError {
  code: string;
  message: string;
  details?: unknown;
}

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError };

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

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',

  // App & Window
  APP_GET_SYSTEM_INFO: 'app:get-system-info',
  APP_WINDOW_MINIMIZE: 'app:window-minimize',
  APP_WINDOW_MAXIMIZE: 'app:window-maximize',
  APP_WINDOW_CLOSE: 'app:window-close',
} as const;

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
