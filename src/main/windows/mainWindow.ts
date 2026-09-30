import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { logger } from '../services/logger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

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
      sandbox: false,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    logger.info('Main window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    logger.info('Main window closed');
  });

  // Load URL or file depending on environment
  if (process.env.VITE_DEV_SERVER_URL) {
    logger.info('Loading Dev Server URL', { url: process.env.VITE_DEV_SERVER_URL });
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    logger.info('Loading production index.html', { indexPath });
    mainWindow.loadFile(indexPath);
  }

  return mainWindow;
}
