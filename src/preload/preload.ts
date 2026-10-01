import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  IpcResult,
  SystemInfo,
  TerminalSpawnOptions,
  AgentMessage,
  AgentContext,
  AgentResponse,
  AgentStatus,
  AgentToolAction,
} from '../shared/types/ipc';
import { FileNode, FileSearchResult } from '../shared/types/file';

export interface CoreMindAPI {
  // File System
  openDirectoryDialog: () => Promise<IpcResult<string | null>>;
  stat: (filePath: string, rootPath: string) => Promise<IpcResult<import('../shared/types/file').FileStat>>;
  readDirectory: (dirPath: string, rootPath: string) => Promise<IpcResult<FileNode[]>>;
  readFile: (filePath: string, rootPath: string) => Promise<IpcResult<string>>;
  writeFile: (filePath: string, content: string, rootPath: string) => Promise<IpcResult<void>>;
  createFile: (filePath: string, rootPath: string) => Promise<IpcResult<void>>;
  createDirectory: (dirPath: string, rootPath: string) => Promise<IpcResult<void>>;
  rename: (oldPath: string, newPath: string, rootPath: string) => Promise<IpcResult<void>>;
  delete: (targetPath: string, rootPath: string) => Promise<IpcResult<void>>;
  searchFiles: (query: string, rootPath: string) => Promise<IpcResult<FileSearchResult[]>>;

  // Terminal
  createTerminal: (id: string, options?: TerminalSpawnOptions) => Promise<IpcResult<boolean>>;
  terminalWrite: (id: string, data: string) => Promise<void>;
  terminalResize: (id: string, cols: number, rows: number) => Promise<void>;
  closeTerminal: (id: string) => Promise<void>;
  onTerminalData: (callback: (payload: { id: string; data: string }) => void) => () => void;
  onTerminalExit: (callback: (payload: { id: string; exitCode: number }) => void) => () => void;

  // AI Agent
  sendAgentMessage: (messages: AgentMessage[], context?: AgentContext) => Promise<IpcResult<AgentResponse>>;
  getAgentStatus: () => Promise<IpcResult<AgentStatus>>;
  executeAgentTool: (action: AgentToolAction, rootPath: string) => Promise<IpcResult<unknown>>;

  // Workspace events
  onOpenWorkspacePath: (callback: (path: string) => void) => () => void;

  // System & Window
  getSystemInfo: () => Promise<IpcResult<SystemInfo>>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // External & Auth
  openAuthWindow: (authUrl: string) => Promise<IpcResult<any>>;
  openExternalUrl: (url: string) => Promise<void>;
}

const api: CoreMindAPI = {
  // File System
  openDirectoryDialog: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_DIRECTORY_DIALOG),
  stat: (filePath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_STAT, { filePath, rootPath }),
  readDirectory: (dirPath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_READ_DIRECTORY, { dirPath, rootPath }),
  readFile: (filePath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, { filePath, rootPath }),
  writeFile: (filePath, content, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, { filePath, content, rootPath }),
  createFile: (filePath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_CREATE_FILE, { filePath, rootPath }),
  createDirectory: (dirPath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_CREATE_DIRECTORY, { dirPath, rootPath }),
  rename: (oldPath, newPath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_RENAME, { oldPath, newPath, rootPath }),
  delete: (targetPath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_DELETE, { targetPath, rootPath }),
  searchFiles: (query, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SEARCH, { query, rootPath }),

  // Terminal
  createTerminal: (id, options) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, { id, options }),
  terminalWrite: (id, data) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, { id, data }),
  terminalResize: (id, cols, rows) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, { id, cols, rows }),
  closeTerminal: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CLOSE, { id }),
  onTerminalData: (callback) => {
    const handler = (_event: unknown, payload: { id: string; data: string }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, handler);
  },
  onTerminalExit: (callback) => {
    const handler = (_event: unknown, payload: { id: string; exitCode: number }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_EXIT, handler);
  },

  // AI Agent
  sendAgentMessage: (messages, context) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_SEND_MESSAGE, { messages, context }),
  getAgentStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_STATUS),
  executeAgentTool: (action, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_EXECUTE_TOOL, { action, rootPath }),

  // Workspace events
  onOpenWorkspacePath: (callback) => {
    const handler = (_event: unknown, path: string) => callback(path);
    ipcRenderer.on('workspace:open-path', handler);
    return () => ipcRenderer.removeListener('workspace:open-path', handler);
  },

  // System & Window
  getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SYSTEM_INFO),
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_CLOSE),

  // External & Auth
  openAuthWindow: (authUrl: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_OPEN_WINDOW, { authUrl }),
  openExternalUrl: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_URL, { url }),
};

contextBridge.exposeInMainWorld('coreMindAPI', api);
