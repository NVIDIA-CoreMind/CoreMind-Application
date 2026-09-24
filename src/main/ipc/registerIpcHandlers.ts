import { ipcMain, dialog, app, BrowserWindow } from 'electron';
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
import { logger } from '../services/logger';

export function registerIpcHandlers(): void {
  logger.info('Registering IPC Handlers');

  // 1. Directory Open Dialog
  ipcMain.handle(
    IPC_CHANNELS.FILE_OPEN_DIRECTORY_DIALOG,
    async (): Promise<IpcResult<string | null>> => {
      try {
        if (process.platform === 'darwin') {
          app.focus({ steal: true });
        }
        const result = await dialog.showOpenDialog({
          title: 'Open Project Folder',
          buttonLabel: 'Select Folder',
          properties: ['openDirectory', 'createDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          logger.info('User cancelled folder picker');
          return { success: true, data: null };
        }

        const selectedPath = result.filePaths[0];
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

  // 2. Read Directory Tree
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ_DIRECTORY,
    async (
      _event,
      { dirPath, rootPath }: { dirPath: string; rootPath: string }
    ): Promise<IpcResult<FileNode[]>> => {
      return fileSystemService.readDirectory(dirPath, rootPath);
    }
  );

  // 3. Read File
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ,
    async (
      _event,
      { filePath, rootPath }: { filePath: string; rootPath: string }
    ): Promise<IpcResult<string>> => {
      return fileSystemService.readFile(filePath, rootPath);
    }
  );

  // 4. Write File
  ipcMain.handle(
    IPC_CHANNELS.FILE_WRITE,
    async (
      _event,
      {
        filePath,
        content,
        rootPath,
      }: {
        filePath: string;
        content: string;
        rootPath: string;
      }
    ): Promise<IpcResult<void>> => {
      return fileSystemService.writeFile(filePath, content, rootPath);
    }
  );

  // 5. Create File
  ipcMain.handle(
    IPC_CHANNELS.FILE_CREATE_FILE,
    async (
      _event,
      { filePath, rootPath }: { filePath: string; rootPath: string }
    ): Promise<IpcResult<void>> => {
      return fileSystemService.createFile(filePath, rootPath);
    }
  );

  // 6. Create Directory
  ipcMain.handle(
    IPC_CHANNELS.FILE_CREATE_DIRECTORY,
    async (
      _event,
      { dirPath, rootPath }: { dirPath: string; rootPath: string }
    ): Promise<IpcResult<void>> => {
      return fileSystemService.createDirectory(dirPath, rootPath);
    }
  );

  // 7. Rename
  ipcMain.handle(
    IPC_CHANNELS.FILE_RENAME,
    async (
      _event,
      {
        oldPath,
        newPath,
        rootPath,
      }: {
        oldPath: string;
        newPath: string;
        rootPath: string;
      }
    ): Promise<IpcResult<void>> => {
      return fileSystemService.rename(oldPath, newPath, rootPath);
    }
  );

  // 8. Delete
  ipcMain.handle(
    IPC_CHANNELS.FILE_DELETE,
    async (
      _event,
      { targetPath, rootPath }: { targetPath: string; rootPath: string }
    ): Promise<IpcResult<void>> => {
      return fileSystemService.delete(targetPath, rootPath);
    }
  );

  // 9. Search Files
  ipcMain.handle(
    IPC_CHANNELS.FILE_SEARCH,
    async (
      _event,
      { query, rootPath }: { query: string; rootPath: string }
    ): Promise<IpcResult<FileSearchResult[]>> => {
      return fileSystemService.searchFiles(query, rootPath);
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
      const success = terminalService.createSession(
        id,
        options,
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

  // 14. App & System Info
  ipcMain.handle(
    IPC_CHANNELS.APP_GET_SYSTEM_INFO,
    async (): Promise<IpcResult<SystemInfo>> => {
      return {
        success: true,
        data: {
          platform: 'macOS',
          arch: process.arch,
          osVersion: os.release(),
          appVersion: app.getVersion(),
          electronVersion: process.versions.electron,
          nodeVersion: process.versions.node,
        },
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
      _event,
      { action, rootPath }: { action: AgentToolAction; rootPath: string }
    ): Promise<IpcResult<unknown>> => {
      return agentService.executeTool(action, rootPath);
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
    const win = BrowserWindow.getFocusedWindow();
    win?.close();
  });
}
