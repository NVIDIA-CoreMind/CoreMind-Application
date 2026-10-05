import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron';
import os from 'node:os';
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
} from '../../shared/types/ipc';
import { FileNode, FileSearchResult } from '../../shared/types/file';
import { fileSystemService } from '../services/fileSystemService';
import { terminalService } from '../services/terminalService';
import { agentService } from '../services/agentService';
import { gitService } from '../services/gitService';
import { logger } from '../services/logger';
import { getMainWindow } from '../windows/mainWindow';
import { startWorkspaceWatch } from '../services/workspaceWatcher';
import { authorizeWorkspace, getAuthorizedWorkspace, restoreWorkspace } from '../services/workspaceAuthorization';
import { isMac, getPlatform, getPlatformInfo } from '../platform/platform';
import { platformWindow } from '../platform/window/platformWindow';

function getWorkspaceForSender(senderId: number): string | null {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.webContents.id !== senderId) {
    return null;
  }
  return getAuthorizedWorkspace(senderId) ?? null;
}

function noWorkspaceError(): IpcResult<never> {
  return {
    success: false,
    error: {
      code: 'NO_AUTHORIZED_WORKSPACE',
      message: 'Open a workspace before performing file operations.',
    },
  };
}

function isAllowedAuthUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === 'accounts.google.com') return true;
    const configuredOrigin = process.env.COREMIND_AUTH_ORIGIN;
    if (configuredOrigin && url.origin === new URL(configuredOrigin).origin) return true;
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

export function registerIpcHandlers(): void {
  logger.info('Registering IPC Handlers');

  // 1. Directory Open Dialog
  ipcMain.handle(
    IPC_CHANNELS.FILE_OPEN_DIRECTORY_DIALOG,
    async (event, mode?: unknown): Promise<IpcResult<string | null>> => {
      try {
        if (isMac()) {
          app.focus({ steal: true });
        }

        const result = await dialog.showOpenDialog({
          title: mode === 'create' ? 'Create Project (choose or create a folder)' : 'Open Project Folder',
          buttonLabel: mode === 'create' ? 'Create Project' : 'Select Folder',
          properties: ['openDirectory', 'createDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          logger.info('User cancelled folder picker');
          return { success: true, data: null };
        }

        const selectedPath = authorizeWorkspace(event.sender.id, result.filePaths[0]);
        logger.info('User selected directory', { selectedPath });
        return { success: true, data: selectedPath };
      } catch (err: unknown) {
        const error = err as Error;
        logger.error('Failed to open directory dialog', { message: error.message, stack: error.stack });
        return {
          success: false,
          error: {
            code: 'DIALOG_ERROR',
            message: error.message || 'Failed to open folder picker.',
          },
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKSPACE_RESTORE,
    async (event, workspacePath: unknown): Promise<IpcResult<string | null>> => {
      const mainWindow = getMainWindow();
      if (!mainWindow || mainWindow.webContents.id !== event.sender.id || typeof workspacePath !== 'string') {
        return { success: true, data: null };
      }
      return { success: true, data: restoreWorkspace(event.sender.id, workspacePath) };
    }
  );

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_WATCH, async (event): Promise<IpcResult<boolean>> => {
    const rootPath = getWorkspaceForSender(event.sender.id);
    if (!rootPath) return noWorkspaceError();
    startWorkspaceWatch(event.sender, rootPath);
    return { success: true, data: true };
  });

  // 1b. Stat File/Directory
  ipcMain.handle(
    IPC_CHANNELS.FILE_STAT,
    async (
      event,
      { filePath }: { filePath: string; rootPath: string }
    ) => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.stat(filePath, rootPath) : noWorkspaceError();
    }
  );

  // 2. Read Directory Tree
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ_DIRECTORY,
    async (
      event,
      { dirPath }: { dirPath: string; rootPath: string }
    ): Promise<IpcResult<FileNode[]>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.readDirectory(dirPath, rootPath) : noWorkspaceError();
    }
  );

  // 3. Read File
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ,
    async (
      event,
      { filePath }: { filePath: string; rootPath: string }
    ): Promise<IpcResult<string>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.readFile(filePath, rootPath) : noWorkspaceError();
    }
  );

  // 4. Write File
  ipcMain.handle(
    IPC_CHANNELS.FILE_WRITE,
    async (
      event,
      {
        filePath,
        content,
      }: {
        filePath: string;
        content: string;
        rootPath: string;
      }
    ): Promise<IpcResult<void>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.writeFile(filePath, content, rootPath) : noWorkspaceError();
    }
  );

  // 5. Create File
  ipcMain.handle(
    IPC_CHANNELS.FILE_CREATE_FILE,
    async (
      event,
      { filePath }: { filePath: string; rootPath: string }
    ): Promise<IpcResult<void>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.createFile(filePath, rootPath) : noWorkspaceError();
    }
  );

  // 6. Create Directory
  ipcMain.handle(
    IPC_CHANNELS.FILE_CREATE_DIRECTORY,
    async (
      event,
      { dirPath }: { dirPath: string; rootPath: string }
    ): Promise<IpcResult<void>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.createDirectory(dirPath, rootPath) : noWorkspaceError();
    }
  );

  // 7. Rename
  ipcMain.handle(
    IPC_CHANNELS.FILE_RENAME,
    async (
      event,
      {
        oldPath,
        newPath,
      }: {
        oldPath: string;
        newPath: string;
        rootPath: string;
      }
    ): Promise<IpcResult<void>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.rename(oldPath, newPath, rootPath) : noWorkspaceError();
    }
  );

  // 8. Delete
  ipcMain.handle(
    IPC_CHANNELS.FILE_DELETE,
    async (
      event,
      { targetPath }: { targetPath: string; rootPath: string }
    ): Promise<IpcResult<void>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.delete(targetPath, rootPath) : noWorkspaceError();
    }
  );

  // 9. Search Files
  ipcMain.handle(
    IPC_CHANNELS.FILE_SEARCH,
    async (
      event,
      { query }: { query: string; rootPath: string }
    ): Promise<IpcResult<FileSearchResult[]>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.searchFiles(query, rootPath) : noWorkspaceError();
    }
  );

  // 10. Terminal Create
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_CREATE,
    async (
      event,
      { id, options }: { id: string; options?: TerminalSpawnOptions }
    ): Promise<IpcResult<boolean>> => {
      const sender = event.sender;
      const workspacePath = getWorkspaceForSender(sender.id);
      if (!workspacePath) return noWorkspaceError();
      const success = terminalService.createSession(
        id,
        { ...options, cwd: workspacePath },
        (data: string) => {
          if (!sender.isDestroyed()) {
            sender.send(IPC_CHANNELS.TERMINAL_DATA, { id, data });
          }
        },
        (exitCode: number) => {
          if (!sender.isDestroyed()) {
            sender.send(IPC_CHANNELS.TERMINAL_EXIT, { id, exitCode });
          }
        }
      );

      if (success) {
        return { success: true, data: true };
      }
      return {
        success: false,
        error: {
          code: 'TERMINAL_SPAWN_FAILED',
          message: 'Failed to spawn live terminal shell process.',
        },
      };
    }
  );

  // 11. Terminal Write
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_WRITE,
    async (
      _event,
      { id, data }: { id: string; data: string }
    ): Promise<void> => {
      terminalService.write(id, data);
    }
  );

  // 12. Terminal Resize
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_RESIZE,
    async (
      _event,
      { id, cols, rows }: { id: string; cols: number; rows: number }
    ): Promise<void> => {
      terminalService.resize(id, cols, rows);
    }
  );

  // 13. Terminal Close
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_CLOSE,
    async (
      _event,
      { id }: { id: string }
    ): Promise<void> => {
      terminalService.closeSession(id);
    }
  );

  // 13b. Terminal Get Available Shells
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_GET_SHELLS,
    async (): Promise<IpcResult<import('../../shared/types/ipc').ShellInfo[]>> => {
      return { success: true, data: terminalService.getAvailableShells() };
    }
  );

  // Git Handlers
  ipcMain.handle(
    IPC_CHANNELS.GIT_STATUS,
    async (event): Promise<IpcResult<import('../../shared/types/git').GitStatusResult>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? gitService.getStatus(rootPath) : noWorkspaceError();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_DIFF,
    async (event, { filePath }: { filePath?: string } = {}): Promise<IpcResult<string>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? gitService.getDiff(rootPath, filePath) : noWorkspaceError();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_ADD,
    async (event, { files }: { files: string[] }): Promise<IpcResult<void>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? gitService.add(rootPath, files) : noWorkspaceError();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_COMMIT,
    async (event, { message }: { message: string }): Promise<IpcResult<string>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? gitService.commit(rootPath, message) : noWorkspaceError();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_BRANCHES,
    async (event): Promise<IpcResult<import('../../shared/types/git').GitBranchInfo>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? gitService.getBranches(rootPath) : noWorkspaceError();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_CHECKOUT,
    async (event, { branch }: { branch: string }): Promise<IpcResult<void>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? gitService.checkout(rootPath, branch) : noWorkspaceError();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_PULL,
    async (event): Promise<IpcResult<string>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? gitService.pull(rootPath) : noWorkspaceError();
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GIT_PUSH,
    async (event): Promise<IpcResult<string>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? gitService.push(rootPath) : noWorkspaceError();
    }
  );

  // 14. App & System Info
  ipcMain.handle(
    IPC_CHANNELS.APP_GET_SYSTEM_INFO,
    async (): Promise<IpcResult<SystemInfo>> => {
      const plat = getPlatform();
      const displayPlatform = plat === 'macos' ? 'macOS' : plat === 'windows' ? 'Windows' : 'Linux';
      return {
        success: true,
        data: {
          platform: displayPlatform,
          arch: process.arch,
          osVersion: os.release(),
          appVersion: app.getVersion(),
          electronVersion: process.versions.electron,
          nodeVersion: process.versions.node,
        },
      };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.APP_GET_PLATFORM,
    async (): Promise<IpcResult<import('../../shared/types/platform').PlatformInfo>> => {
      return {
        success: true,
        data: getPlatformInfo(),
      };
    }
  );

  // 15. AI Agent - Send Message
  ipcMain.handle(
    IPC_CHANNELS.AGENT_SEND_MESSAGE,
    async (
      _event,
      { messages, context }: { messages: AgentMessage[]; context?: AgentContext }
    ): Promise<IpcResult<AgentResponse>> => {
      return agentService.sendMessage(messages, context);
    }
  );

  // 16. AI Agent - Get Status
  ipcMain.handle(
    IPC_CHANNELS.AGENT_GET_STATUS,
    async (): Promise<IpcResult<AgentStatus>> => {
      return { success: true, data: agentService.getStatus() };
    }
  );

  // 17. AI Agent - Execute Controlled Tool
  ipcMain.handle(
    IPC_CHANNELS.AGENT_EXECUTE_TOOL,
    async (
      event,
      { action }: { action: AgentToolAction; rootPath: string }
    ): Promise<IpcResult<unknown>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? agentService.executeTool(action, rootPath) : noWorkspaceError();
    }
  );

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.APP_WINDOW_MINIMIZE, () => {
    const win = BrowserWindow.getFocusedWindow();
    win?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.APP_WINDOW_MAXIMIZE, () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.APP_WINDOW_CLOSE, () => {
    const win = BrowserWindow.getFocusedWindow() ?? getMainWindow();
    win?.close();
  });

  ipcMain.handle(
    IPC_CHANNELS.APP_WINDOW_SET_TITLE_BAR_OVERLAY,
    (_event, overlay: { color: string; symbolColor: string; height?: number }) => {
      const win = BrowserWindow.getFocusedWindow() ?? getMainWindow();
      if (win) {
        platformWindow.applyTitleBarOverlay(win, overlay);
      }
    }
  );


  // External & Auth Handlers
  ipcMain.handle(
    IPC_CHANNELS.AUTH_OPEN_WINDOW,
    async (_event, { authUrl }: { authUrl: string }): Promise<IpcResult<Record<string, string>>> => {
      if (!isAllowedAuthUrl(authUrl)) {
        return {
          success: false,
          error: { code: 'AUTH_URL_NOT_ALLOWED', message: 'Authentication URL is not allowed.' },
        };
      }

      const initialUrl = new URL(authUrl);
      logger.info('Opening Google Auth Window', { origin: initialUrl.origin });
      return new Promise((resolve) => {
        let resolved = false;
        const parentWin = getMainWindow();

        const authWin = new BrowserWindow({
          width: 520,
          height: 680,
          title: 'Sign In with Google — CoreMind',
          parent: parentWin || undefined,
          modal: true,
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        });

        authWin.setMenu(null);
        authWin.once('ready-to-show', () => {
          authWin.show();
        });

        authWin.webContents.on('will-navigate', (event, navUrl) => {
          try {
            const callbackUrl = new URL(navUrl);
            if (callbackUrl.origin === initialUrl.origin && callbackUrl.pathname === '/v1/auth/google/callback') {
              event.preventDefault();
              resolved = true;
              authWin.close();
              resolve({ success: true, data: Object.fromEntries(callbackUrl.searchParams) });
            }
          } catch {
            event.preventDefault();
          }
        });

        authWin.on('closed', () => {
          if (!resolved) {
            resolve({
              success: false,
              error: {
                code: 'AUTH_CANCELLED',
                message: 'Authentication window was closed by the user.',
              },
            });
          }
        });

        void authWin.loadURL(authUrl).catch(() => {
          if (!resolved) {
            resolved = true;
            authWin.close();
            resolve({
              success: false,
              error: { code: 'AUTH_LOAD_FAILED', message: 'Unable to load authentication page.' },
            });
          }
        });
      });
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.OPEN_EXTERNAL_URL,
    async (_event, { url }: { url: string }): Promise<void> => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        await shell.openExternal(url);
      }
    }
  );
}
