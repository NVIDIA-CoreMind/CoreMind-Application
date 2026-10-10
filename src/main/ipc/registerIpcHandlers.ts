import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron';
import os from 'node:os';
import { execFile } from 'node:child_process';
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
  AgentTaskRequest,
  AgentTaskSummary,
  AgentStreamEvent,
  ExecuteCommandResult,
} from '../../shared/types/ipc';
import { FileNode, FileSearchResult } from '../../shared/types/file';
import { fileSystemService } from '../services/fileSystemService';
import { terminalService } from '../services/terminalService';
import { agentService } from '../services/agentService';
import { executionEngine } from '../services/executionEngine';
import { gitService } from '../services/gitService';
import { logger } from '../services/logger';
import { getMainWindow } from '../windows/mainWindow';
import { startWorkspaceWatch } from '../services/workspaceWatcher';
import { authorizeWorkspace, getAuthorizedWorkspace, restoreWorkspace } from '../services/workspaceAuthorization';
import { isMac, getPlatform, getPlatformInfo } from '../platform/platform';
import { platformWindow } from '../platform/window/platformWindow';

const activeTasks = new Map<number, AbortController>();


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

  // 8b. Copy
  ipcMain.handle(
    IPC_CHANNELS.FILE_COPY,
    async (
      event,
      { srcPath, destPath }: { srcPath: string; destPath: string; rootPath?: string }
    ): Promise<IpcResult<void>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      return rootPath ? fileSystemService.copy(srcPath, destPath, rootPath) : noWorkspaceError();
    }
  );

  // 8c. Reveal in File Explorer / Finder
  ipcMain.handle(
    IPC_CHANNELS.FILE_REVEAL_IN_EXPLORER,
    async (
      _event,
      { targetPath }: { targetPath: string }
    ): Promise<IpcResult<void>> => {
      try {
        shell.showItemInFolder(targetPath);
        return { success: true, data: undefined };
      } catch (err: unknown) {
        const error = err as Error;
        return {
          success: false,
          error: {
            code: 'REVEAL_FAILED',
            message: error.message || 'Failed to reveal item in file manager.',
          },
        };
      }
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

  // 13c. Terminal Execute Command
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_EXECUTE_COMMAND,
    async (
      event,
      { command, options }: { command: string; options?: { timeoutMs?: number; cwd?: string } }
    ): Promise<IpcResult<ExecuteCommandResult>> => {
      const rootPath = getWorkspaceForSender(event.sender.id);
      const cwd = options?.cwd || rootPath || process.cwd();
      const res = await terminalService.executeCommand({
        command,
        cwd,
        timeoutMs: options?.timeoutMs,
      });
      return { success: true, data: res };
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

  // 18. AI Agent - Autonomous Run Task
  ipcMain.handle(
    IPC_CHANNELS.AGENT_RUN_TASK,
    async (
      event,
      request: AgentTaskRequest
    ): Promise<IpcResult<AgentTaskSummary>> => {
      const senderId = event.sender.id;
      let rootPath = getWorkspaceForSender(senderId);
      if (!rootPath && request.workspacePath) {
        rootPath = authorizeWorkspace(senderId, request.workspacePath);
      }
      if (!rootPath) {
        return noWorkspaceError();
      }

      // Security restriction: enforce workspace path to authorized workspace
      request.workspacePath = rootPath;

      // Abort any currently running task for this sender
      activeTasks.get(senderId)?.abort();
      const abortController = new AbortController();
      activeTasks.set(senderId, abortController);

      try {
        logger.info('Starting autonomous agent task', { prompt: request.prompt, rootPath });
        const summary = await executionEngine.runTask(
          request,
          {
            signal: abortController.signal,
            onEvent: (streamEvent: AgentStreamEvent) => {
              if (!event.sender.isDestroyed()) {
                event.sender.send(IPC_CHANNELS.AGENT_STREAM_EVENT, streamEvent);
              }
            },
          }
        );
        return { success: true, data: summary };
      } catch (err: unknown) {
        const error = err as Error;
        logger.error('Agent task execution error', { message: error.message });
        return {
          success: false,
          error: {
            code: 'AGENT_TASK_FAILED',
            message: error.message || 'Execution failed.',
          },
        };
      } finally {
        if (activeTasks.get(senderId) === abortController) {
          activeTasks.delete(senderId);
        }
      }
    }
  );

  // 19. AI Agent - Cancel Task
  ipcMain.handle(
    IPC_CHANNELS.AGENT_CANCEL_TASK,
    async (event): Promise<IpcResult<void>> => {
      const senderId = event.sender.id;
      const controller = activeTasks.get(senderId);
      if (controller) {
        controller.abort();
        activeTasks.delete(senderId);
        logger.info('Cancelled agent task for sender', { senderId });
      }
      return { success: true, data: undefined };
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

        const handleAuthNavigation = (event: Electron.Event, navUrl: string) => {
          try {
            const callbackUrl = new URL(navUrl);
            const isCallback =
              (callbackUrl.origin === initialUrl.origin || callbackUrl.hostname === 'localhost' || callbackUrl.hostname === '127.0.0.1') &&
              (callbackUrl.pathname === '/v1/auth/google/callback' || callbackUrl.pathname.endsWith('/auth/google/callback'));
            if (isCallback) {
              event.preventDefault();
              if (!resolved) {
                resolved = true;
                authWin.close();
                resolve({ success: true, data: Object.fromEntries(callbackUrl.searchParams) });
              }
            }
          } catch {
            // ignore non-URL navigations
          }
        };

        authWin.webContents.on('will-navigate', handleAuthNavigation);
        authWin.webContents.on('will-redirect', handleAuthNavigation);

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

  ipcMain.handle(
    IPC_CHANNELS.AUTH_OPEN_IN_CHROME,
    async (_event, { url }: { url: string }): Promise<IpcResult<{ opened: boolean }>> => {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return {
          success: false,
          error: { code: 'INVALID_URL', message: 'URL must start with http:// or https://' },
        };
      }

      return new Promise((resolve) => {
        const platform = process.platform;
        if (platform === 'darwin') {
          execFile('open', ['-a', 'Google Chrome', url], (err) => {
            if (err) {
              logger.warn(`Failed to open Google Chrome via open -a, falling back to default browser: ${err.message}`);
              void shell.openExternal(url).then(() => {
                resolve({ success: true, data: { opened: true } });
              }).catch((fallbackErr: unknown) => {
                resolve({
                  success: false,
                  error: { code: 'OPEN_FAILED', message: (fallbackErr as Error).message || 'Failed to open URL' },
                });
              });
            } else {
              resolve({ success: true, data: { opened: true } });
            }
          });
        } else if (platform === 'win32') {
          execFile('cmd.exe', ['/c', 'start', 'chrome', url], (err) => {
            if (err) {
              void shell.openExternal(url).then(() => {
                resolve({ success: true, data: { opened: true } });
              }).catch((fallbackErr: unknown) => {
                resolve({
                  success: false,
                  error: { code: 'OPEN_FAILED', message: (fallbackErr as Error).message || 'Failed to open URL' },
                });
              });
            } else {
              resolve({ success: true, data: { opened: true } });
            }
          });
        } else {
          // Linux
          execFile('google-chrome', [url], (err) => {
            if (err) {
              void shell.openExternal(url).then(() => {
                resolve({ success: true, data: { opened: true } });
              }).catch((fallbackErr: unknown) => {
                resolve({
                  success: false,
                  error: { code: 'OPEN_FAILED', message: (fallbackErr as Error).message || 'Failed to open URL' },
                });
              });
            } else {
              resolve({ success: true, data: { opened: true } });
            }
          });
        }
      });
    }
  );
}
