/**
 * Browser stand-in for the Electron preload bridge (window.coreMindAPI).
 *
 * The IDE was written for the desktop shell. Workspace files go through the File System Access
 * API (webFileSystem.ts), so a folder opened in Chrome or Edge can be browsed and edited. Other
 * desktop-only capabilities (terminal, git, devices, native windows) resolve to a "desktop only"
 * result, so the interface renders without errors. Sign-in uses window.open plus session polling,
 * which the login page already implements, so those two methods are left undefined on purpose.
 */

import * as webFiles from './webFileSystem';

type BridgeResult = { success: false; error: { code: string; message: string } };

const DESKTOP_ONLY: BridgeResult = {
  success: false,
  error: {
    code: 'DESKTOP_ONLY',
    message: 'This feature is available in the CoreMind desktop app.',
  },
};

// Left undefined in the browser, so the existing window.open and polling fallbacks run.
const ABSENT_IN_BROWSER = new Set(['openAuthWindow', 'openInChrome']);

type Platform = 'macos' | 'windows' | 'linux';

function detectPlatform(): Platform {
  const hint = `${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`.toLowerCase();
  if (hint.includes('mac')) return 'macos';
  if (hint.includes('win')) return 'windows';
  return 'linux';
}

/** A proxy whose every member is an async function that reports the desktop-only result. */
function desktopOnlyNamespace(): Record<string, unknown> {
  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return async () => DESKTOP_ONLY;
    },
  });
}

/** Workspace file methods of window.coreMindAPI, implemented on the File System Access API. */
const WEB_FILE_API = {
  openDirectoryDialog: () => webFiles.pickFolder(),
  restoreWorkspace: (path: string) => webFiles.restoreFolder(path),
  watchWorkspace: async () => ({ success: true, data: true }),
  stat: (path: string, rootPath: string) => webFiles.statEntry(path, rootPath),
  readDirectory: (dirPath: string, rootPath: string) => webFiles.readDirectory(dirPath, rootPath),
  readFile: (path: string, rootPath: string) => webFiles.readFileText(path, rootPath),
  readImage: (path: string, rootPath: string) => webFiles.readImageFile(path, rootPath),
  openImageDialog: () => webFiles.pickImage(),
  writeFile: (path: string, content: string, rootPath: string) => webFiles.writeFileText(path, content, rootPath),
  createFile: (path: string, rootPath: string) => webFiles.createFile(path, rootPath),
  createDirectory: (path: string, rootPath: string) => webFiles.createDirectory(path, rootPath),
  rename: (oldPath: string, newPath: string, rootPath: string) => webFiles.renameEntry(oldPath, newPath, rootPath),
  delete: (path: string, rootPath: string) => webFiles.deleteEntry(path, rootPath),
  copyItem: (src: string, dest: string, rootPath: string) => webFiles.copyEntryTo(src, dest, rootPath),
  searchFiles: (query: string, rootPath: string) => webFiles.searchFiles(query, rootPath),
};

export function createWebBridge(): Record<string, unknown> {
  const name = detectPlatform();
  const platform = {
    name,
    isMac: name === 'macos',
    isWindows: name === 'windows',
    isLinux: name === 'linux',
    getInfo: async () => DESKTOP_ONLY,
  };

  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      if (ABSENT_IN_BROWSER.has(prop)) return undefined;
      if (Object.hasOwn(WEB_FILE_API, prop)) return WEB_FILE_API[prop as keyof typeof WEB_FILE_API];
      if (prop === 'platform') return platform;
      if (prop === 'virtualMobile') return desktopOnlyNamespace();
      if (prop === 'openExternalUrl') {
        return async (url: string) => {
          window.open(url, '_blank', 'noopener,noreferrer');
        };
      }
      // Subscriptions take a callback and return an unsubscribe function.
      if (prop.startsWith('on')) return () => () => undefined;
      return async () => DESKTOP_ONLY;
    },
  });
}

let webBridgeInstalled = false;

/** Installs the stand-in only when the real desktop bridge is absent. */
export function installWebBridge(): void {
  if (typeof window !== 'undefined' && !window.coreMindAPI) {
    (window as unknown as { coreMindAPI: unknown }).coreMindAPI = createWebBridge();
    webBridgeInstalled = true;
  }
}

/**
 * True when this page runs in a browser. window.coreMindAPI is always set after installWebBridge,
 * so check this flag rather than the bridge object itself.
 */
export function isWebBridgeInstalled(): boolean {
  return webBridgeInstalled;
}
