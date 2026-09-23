import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, IpcResult, SystemInfo } from '../shared/types/ipc';
import { FileNode, FileSearchResult } from '../shared/types/file';
import { GitStatusResult } from '../shared/types/git';

export interface CoreMindAPI {
  // File System
  openDirectoryDialog: () => Promise<IpcResult<string | null>>;
  readDirectory: (dirPath: string, rootPath: string) => Promise<IpcResult<FileNode[]>>;
  readFile: (filePath: string, rootPath: string) => Promise<IpcResult<string>>;
  writeFile: (filePath: string, content: string, rootPath: string) => Promise<IpcResult<void>>;
  createFile: (filePath: string, rootPath: string) => Promise<IpcResult<void>>;
  createDirectory: (dirPath: string, rootPath: string) => Promise<IpcResult<void>>;
  rename: (oldPath: string, newPath: string, rootPath: string) => Promise<IpcResult<void>>;
  delete: (targetPath: string, rootPath: string) => Promise<IpcResult<void>>;
  searchFiles: (query: string, rootPath: string) => Promise<IpcResult<FileSearchResult[]>>;

  // Git
  getGitStatus: (rootPath: string) => Promise<IpcResult<GitStatusResult>>;
  getGitDiff: (filePath: string, rootPath: string) => Promise<IpcResult<string>>;

  // System & Window
  getSystemInfo: () => Promise<IpcResult<SystemInfo>>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
}

const api: CoreMindAPI = {
  openDirectoryDialog: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_DIRECTORY_DIALOG),
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

  getGitStatus: (rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_STATUS, { rootPath }),
  getGitDiff: (filePath, rootPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_DIFF, { filePath, rootPath }),

  getSystemInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SYSTEM_INFO),
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_CLOSE),
};

contextBridge.exposeInMainWorld('coreMindAPI', api);
