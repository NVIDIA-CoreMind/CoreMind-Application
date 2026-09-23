import { app, BrowserWindow } from 'electron';
import { createMainWindow, getMainWindow } from './windows/mainWindow';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { setupApplicationMenu } from './menu';
import { terminalService } from './services/terminalService';
import { logger } from './services/logger';

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.name = 'CoreMind';

// macOS single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.warn('Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    logger.info('CoreMind app is ready. Initializing subsystems...');

    if (process.platform === 'darwin' && app.dock) {
      const iconPath = path.join(__dirname, '../assets/icon.png');
      if (fs.existsSync(iconPath)) {
        try {
          app.dock.setIcon(iconPath);
        } catch {
          // continue if dock icon cannot be set dynamically
        }
      }
    }

    registerIpcHandlers();
    createMainWindow();
    setupApplicationMenu();

    app.on('activate', () => {
      // On macOS re-create a window in the app when the dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    logger.info('All windows closed.');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    logger.info('CoreMind shutting down.');
    terminalService.closeAllSessions();
  });
}
