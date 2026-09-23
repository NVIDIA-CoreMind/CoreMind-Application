import { BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../services/logger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function createMainWindow(): BrowserWindow {
  logger.info('Initializing CoreMind Main Window');

  const preloadPath = path.join(__dirname, 'preload.mjs');
  logger.info('Preload path resolved', { preloadPath });

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1100,
    minHeight: 700,
    title: 'CoreMind',
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
