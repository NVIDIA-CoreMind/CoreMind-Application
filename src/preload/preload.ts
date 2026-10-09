import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  IpcResult,
  SystemInfo,
  TerminalSpawnOptions,
  ShellInfo,
  AgentMessage,
  AgentContext,
  AgentResponse,
  AgentStatus,
  AgentToolAction,
  AgentTaskRequest,
  AgentTaskSummary,
  AgentStreamEvent,
  ExecuteCommandResult,
  WorkspaceFileChange,
} from '../shared/types/ipc';
import { FileNode, FileSearchResult, FileStat } from '../shared/types/file';
import { GitStatusResult, GitBranchInfo } from '../shared/types/git';
import { PlatformInfo, PlatformType } from '../shared/types/platform';

const currentPlatformName: PlatformType =
  process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux';

export interface CoreMindFilesAPI {
  openDirectoryDialog: (mode?: 'open' | 'create') => Promise<IpcResult<string | null>>;
  watchWorkspace: () => Promise<IpcResult<boolean>>;
  onWorkspaceFilesChanged: (callback: (changes: WorkspaceFileChange[]) => void) => () => void;
  restoreWorkspace: (workspacePath: string) => Promise<IpcResult<string | null>>;
  stat: (filePath: string, rootPath: string) => Promise<IpcResult<FileStat>>;
  readDirectory: (dirPath: string, rootPath: string) => Promise<IpcResult<FileNode[]>>;
  readFile: (filePath: string, rootPath: string) => Promise<IpcResult<string>>;
  writeFile: (filePath: string, content: string, rootPath: string) => Promise<IpcResult<void>>;
  createFile: (filePath: string, rootPath: string) => Promise<IpcResult<void>>;
  createDirectory: (dirPath: string, rootPath: string) => Promise<IpcResult<void>>;
  rename: (oldPath: string, newPath: string, rootPath: string) => Promise<IpcResult<void>>;
  delete: (targetPath: string, rootPath: string) => Promise<IpcResult<void>>;
  copyItem: (srcPath: string, destPath: string, rootPath: string) => Promise<IpcResult<void>>;
  revealInExplorer: (targetPath: string) => Promise<IpcResult<void>>;
  searchFiles: (query: string, rootPath: string) => Promise<IpcResult<FileSearchResult[]>>;
}

export interface CoreMindTerminalAPI {
  create: (id: string, options?: TerminalSpawnOptions) => Promise<IpcResult<boolean>>;
  write: (id: string, data: string) => Promise<void>;
  resize: (id: string, cols: number, rows: number) => Promise<void>;
  close: (id: string) => Promise<void>;
  onData: (callback: (payload: { id: string; data: string }) => void) => () => void;
  onExit: (callback: (payload: { id: string; exitCode: number }) => void) => () => void;
  getAvailableShells: () => Promise<IpcResult<ShellInfo[]>>;
  executeCommand: (command: string, options?: { timeoutMs?: number; cwd?: string }) => Promise<IpcResult<ExecuteCommandResult>>;
}

export interface CoreMindGitAPI {
  getStatus: () => Promise<IpcResult<GitStatusResult>>;
  getDiff: (filePath?: string) => Promise<IpcResult<string>>;
  add: (files: string[]) => Promise<IpcResult<void>>;
  commit: (message: string) => Promise<IpcResult<string>>;
  getBranches: () => Promise<IpcResult<GitBranchInfo>>;
  checkout: (branch: string) => Promise<IpcResult<void>>;
  pull: () => Promise<IpcResult<string>>;
  push: () => Promise<IpcResult<string>>;
}

export interface CoreMindPlatformAPI {
  name: PlatformType;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  getInfo: () => Promise<IpcResult<PlatformInfo>>;
}

export interface CoreMindWindowAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  setTitleBarOverlay: (overlay: { color: string; symbolColor: string; height?: number }) => Promise<void>;
}

export interface CoreMindAPI extends CoreMindFilesAPI {
  // Direct terminal methods (backwards-compat)
  createTerminal: (id: string, options?: TerminalSpawnOptions) => Promise<IpcResult<boolean>>;
  terminalWrite: (id: string, data: string) => Promise<void>;
  terminalResize: (id: string, cols: number, rows: number) => Promise<void>;
  closeTerminal: (id: string) => Promise<void>;
  onTerminalData: (callback: (payload: { id: string; data: string }) => void) => () => void;
  onTerminalExit: (callback: (payload: { id: string; exitCode: number }) => void) => () => void;
  getAvailableShells: () => Promise<IpcResult<ShellInfo[]>>;
  executeCommand: (command: string, options?: { timeoutMs?: number; cwd?: string }) => Promise<IpcResult<ExecuteCommandResult>>;

  // AI Agent
  sendAgentMessage: (messages: AgentMessage[], context?: AgentContext) => Promise<IpcResult<AgentResponse>>;
  getAgentStatus: () => Promise<IpcResult<AgentStatus>>;
  executeAgentTool: (action: AgentToolAction, rootPath: string) => Promise<IpcResult<unknown>>;
  runAgentTask: (request: AgentTaskRequest) => Promise<IpcResult<AgentTaskSummary>>;
  cancelAgentTask: () => Promise<IpcResult<void>>;
  onAgentStreamEvent: (callback: (event: AgentStreamEvent) => void) => () => void;


  // Workspace events
  onOpenWorkspacePath: (callback: (path: string) => void) => () => void;

  // System & Window
  getSystemInfo: () => Promise<IpcResult<SystemInfo>>;
  getPlatform: () => Promise<IpcResult<PlatformInfo>>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  setTitleBarOverlay: (overlay: { color: string; symbolColor: string; height?: number }) => Promise<void>;

  // External & Auth
  openAuthWindow: (authUrl: string) => Promise<IpcResult<any>>;
  openExternalUrl: (url: string) => Promise<void>;

  // Structured Namespaces (Section 11)
  files: CoreMindFilesAPI;
  terminal: CoreMindTerminalAPI;
  git: CoreMindGitAPI;
  platform: CoreMindPlatformAPI;
  window: CoreMindWindowAPI;
}

const filesAPI: CoreMindFilesAPI = {
  openDirectoryDialog: (mode) => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_DIRECTORY_DIALOG, mode),
  watchWorkspace: () => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_WATCH),
  onWorkspaceFilesChanged: (callback) => {
    const handler = (_event: unknown, changes: WorkspaceFileChange[]) => callback(changes);
    ipcRenderer.on(IPC_CHANNELS.WORKSPACE_FILES_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WORKSPACE_FILES_CHANGED, handler);
  },
  restoreWorkspace: (workspacePath) => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_RESTORE, workspacePath),
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
  copyItem: (srcPath, destPath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_COPY, { srcPath, destPath, rootPath }),
  revealInExplorer: (targetPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_REVEAL_IN_EXPLORER, { targetPath }),
  searchFiles: (query, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SEARCH, { query, rootPath }),
};

const terminalAPI: CoreMindTerminalAPI = {
  create: (id, options) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, { id, options }),
  write: (id, data) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, { id, data }),
  resize: (id, cols, rows) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, { id, cols, rows }),
  close: (id) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CLOSE, { id }),
  onData: (callback) => {
    const handler = (_event: unknown, payload: { id: string; data: string }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, handler);
  },
  onExit: (callback) => {
    const handler = (_event: unknown, payload: { id: string; exitCode: number }) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_EXIT, handler);
  },
  getAvailableShells: () => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_GET_SHELLS),
  executeCommand: (command, options) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_EXECUTE_COMMAND, { command, options }),
};

const gitAPI: CoreMindGitAPI = {
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS),
  getDiff: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF, { filePath }),
  add: (files) => ipcRenderer.invoke(IPC_CHANNELS.GIT_ADD, { files }),
  commit: (message) => ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, { message }),
  getBranches: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCHES),
  checkout: (branch) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT, { branch }),
  pull: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_PULL),
  push: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_PUSH),
};

const platformAPI: CoreMindPlatformAPI = {
  name: currentPlatformName,
  isMac: currentPlatformName === 'macos',
  isWindows: currentPlatformName === 'windows',
  isLinux: currentPlatformName === 'linux',
  getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORM),
};

const windowAPI: CoreMindWindowAPI = {
  minimize: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_MAXIMIZE),
  close: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_CLOSE),
  setTitleBarOverlay: (overlay) => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_SET_TITLE_BAR_OVERLAY, overlay),
};

const api: CoreMindAPI = {
  ...filesAPI,

  // Direct Terminal APIs
  createTerminal: terminalAPI.create,
  terminalWrite: terminalAPI.write,
  terminalResize: terminalAPI.resize,
  closeTerminal: terminalAPI.close,
  onTerminalData: terminalAPI.onData,
  onTerminalExit: terminalAPI.onExit,
  getAvailableShells: terminalAPI.getAvailableShells,
  executeCommand: terminalAPI.executeCommand,

  // AI Agent
  sendAgentMessage: (messages, context) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_SEND_MESSAGE, { messages, context }),
  getAgentStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_STATUS),
  executeAgentTool: (action, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_EXECUTE_TOOL, { action, rootPath }),
  runAgentTask: (request) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_RUN_TASK, request),
  cancelAgentTask: () =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_CANCEL_TASK),
  onAgentStreamEvent: (callback) => {
    const handler = (_event: unknown, streamEvent: AgentStreamEvent) => callback(streamEvent);
    ipcRenderer.on(IPC_CHANNELS.AGENT_STREAM_EVENT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_STREAM_EVENT, handler);
  },


  // Workspace events
  onOpenWorkspacePath: (callback) => {
    const handler = (_event: unknown, path: string) => callback(path);
    ipcRenderer.on('workspace:open-path', handler);
    return () => ipcRenderer.removeListener('workspace:open-path', handler);
  },

  // System & Window
  getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SYSTEM_INFO),
  getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORM),
  minimizeWindow: windowAPI.minimize,
  maximizeWindow: windowAPI.maximize,
  closeWindow: windowAPI.close,
  setTitleBarOverlay: windowAPI.setTitleBarOverlay,

  // External & Auth
  openAuthWindow: (authUrl: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_OPEN_WINDOW, { authUrl }),
  openExternalUrl: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_URL, { url }),

  // Structured Namespaces
  files: filesAPI,
  terminal: terminalAPI,
  git: gitAPI,
  platform: platformAPI,
  window: windowAPI,
};

contextBridge.exposeInMainWorld('coreMindAPI', api);
