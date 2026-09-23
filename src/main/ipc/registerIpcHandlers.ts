import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import os from 'node:os';
import { IPC_CHANNELS, IpcResult, SystemInfo } from '../../shared/types/ipc';
import { FileNode, FileSearchResult } from '../../shared/types/file';
import { GitStatusResult } from '../../shared/types/git';
import { fileSystemService } from '../services/fileSystemService';
import { gitService } from '../services/gitService';
import { logger } from '../services/logger';

export function registerIpcHandlers(): void {
  logger.info('Registering IPC Handlers');

  // 1. Directory Open Dialog
  ipcMain.handle(
    IPC_CHANNELS.FILE_OPEN_DIRECTORY_DIALOG,
    async (): Promise<IpcResult<string | null>> => {
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const result = await dialog.showOpenDialog(focusedWindow || undefined as any, {
          title: 'Open Project Folder',
          properties: ['openDirectory', 'createDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: true, data: null };
        }

        const selectedPath = result.filePaths[0];
        logger.info('User selected directory', { selectedPath });
        return { success: true, data: selectedPath };
      } catch (err: unknown) {
        const error = err as Error;
        logger.error('Failed to open directory dialog', { message: error.message });
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

  // 10. Git Status
  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_STATUS,
    async (
      _event,
      { rootPath }: { rootPath: string }
    ): Promise<IpcResult<GitStatusResult>> => {
      return gitService.getStatus(rootPath);
    }
  );

  // 11. Git Diff
  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_DIFF,
    async (
      _event,
      { filePath, rootPath }: { filePath: string; rootPath: string }
    ): Promise<IpcResult<string>> => {
      return gitService.getDiff(filePath, rootPath);
    }
  );

  // 12. App & System Info
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
