import { app } from 'electron';
import path from 'node:path';

export interface AppPaths {
  userData: string;
  home: string;
  temp: string;
  appData: string;
  documents: string;
}

export function getAppPaths(): AppPaths {
  try {
    return {
      userData: app.getPath('userData'),
      home: app.getPath('home'),
      temp: app.getPath('temp'),
      appData: app.getPath('appData'),
      documents: app.getPath('documents'),
    };
  } catch {
    // If called before app is ready or in test environment
    const home = process.env.USERPROFILE || process.env.HOME || '.';
    return {
      userData: path.join(home, '.coremind'),
      home,
      temp: process.env.TEMP || process.env.TMP || '/tmp',
      appData: process.env.APPDATA || path.join(home, '.config'),
      documents: path.join(home, 'Documents'),
    };
  }
}
