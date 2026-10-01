import { app, BrowserWindow, nativeImage, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { logger } from '../services/logger';
import { clearAuthorizedWorkspace } from '../services/workspaceAuthorization';
import { stopWorkspaceWatch } from '../services/workspaceWatcher';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isAllowedMainNavigation(value: string, devServerUrl?: string): boolean {
  try {
    const url = new URL(value);
    if (devServerUrl) return url.origin === new URL(devServerUrl).origin;
    if (url.protocol !== 'file:') return false;
    const distDirectory = path.resolve(__dirname, '../dist');
    const targetPath = fileURLToPath(url);
    const relative = path.relative(distDirectory, targetPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function getAppIcon(): Electron.NativeImage | undefined {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
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
      const img = nativeImage.createFromPath(candidate);
      if (!img.isEmpty()) {
        return img;
      }
    }
  }
  return undefined;
}

export function createMainWindow(): BrowserWindow {
  logger.info('Initializing CoreMind Main Window');

  const preloadPathCjs = path.join(__dirname, 'preload.cjs');
  const preloadPathMjs = path.join(__dirname, 'preload.mjs');
  const preloadPath = fs.existsSync(preloadPathCjs) ? preloadPathCjs : preloadPathMjs;
  logger.info('Preload path resolved', { preloadPath });

  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    title: 'CoreMind',
    icon: appIcon,
    backgroundColor: '#0F1117',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
    show: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    logger.info('Main window ready to show');
    mainWindow?.show();
  });

  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    logger.info(`[Renderer] ${message}`, { sourceId, line });
  });
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedMainNavigation(url, devServerUrl)) {
      event.preventDefault();
      logger.warn('Blocked untrusted main window navigation');
    }
  });

  mainWindow.on('closed', () => {
    stopWorkspaceWatch(mainWindow?.webContents.id ?? -1);
    clearAuthorizedWorkspace(mainWindow?.webContents.id ?? -1);
    mainWindow = null;
    logger.info('Main window closed');
  });

  // Load URL or file depending on environment
  if (devServerUrl) {
    logger.info('Loading Dev Server URL', { url: devServerUrl });
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    logger.info('Loading production index.html', { indexPath });
    mainWindow.loadFile(indexPath);
  }

  return mainWindow;
}
