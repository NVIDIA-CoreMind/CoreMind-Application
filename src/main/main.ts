import { app, BrowserWindow, nativeImage } from 'electron';
import { createMainWindow, getMainWindow } from './windows/mainWindow';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { setupApplicationMenu } from './menu';
import { terminalService } from './services/terminalService';
import { logger } from './services/logger';

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { isMac, isWindows } from './platform/platform';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getAppIconPath(): string {
  const iconName = isWindows() ? 'icon.ico' : 'icon.png';
  const candidates = [
    path.join(__dirname, '../assets', iconName),
    path.join(__dirname, '../assets/icon.png'),
    path.join(process.resourcesPath, 'assets', iconName),
    path.join(process.resourcesPath, 'assets/icon.png'),
    path.join(app.getAppPath(), 'assets', iconName),
    path.join(app.getAppPath(), 'assets/icon.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(__dirname, '../assets/icon.png');
}

app.name = !app.isPackaged ? 'CoreMind Dev' : 'CoreMind';

if (isWindows()) {
  app.setAppUserModelId('com.coremind.ide');
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in main process', { error: error?.stack || error });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection in main process', { reason });
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.warn('Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    logger.info('CoreMind app is ready. Initializing subsystems...');

    // On macOS, packaged apps natively manage their Dock icon from the bundle's icon.icns.
    // Dynamically calling app.dock.setIcon() in production causes a size/resolution discrepancy
    // between the closed/pinned dock state and the running state.
    // Therefore, only set dock icon dynamically during development mode.
    if (!app.isPackaged && isMac() && app.dock) {
      const iconPath = getAppIconPath();
      if (fs.existsSync(iconPath)) {
        try {
          const image = nativeImage.createFromPath(iconPath);
          if (!image.isEmpty()) {
            app.dock.setIcon(image);
          }
        } catch (error) {
          logger.warn('Failed to set dock icon dynamically', { error });
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
    if (!isMac()) {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    logger.info('CoreMind shutting down.');
    terminalService.closeAllSessions();
  });
}

