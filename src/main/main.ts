import { app, BrowserWindow } from 'electron';
import { createMainWindow, getMainWindow } from './windows/mainWindow';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { logger } from './services/logger';

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
    registerIpcHandlers();
    createMainWindow();

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
  });
}
