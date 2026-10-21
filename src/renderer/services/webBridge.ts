/**
 * Browser stand-in for the Electron preload bridge (window.coreMindAPI).
 *
 * The IDE was written for the desktop shell. Desktop-only capabilities (files, terminal,
 * native dialogs, windows, virtual devices) resolve to a "desktop only" result, so the
 * interface renders without errors. Sign-in uses window.open plus session polling, which
 * the login page already implements, so those two methods are left undefined on purpose.
 */

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

/** Installs the stand-in only when the real desktop bridge is absent. */
export function installWebBridge(): void {
  if (typeof window !== 'undefined' && !window.coreMindAPI) {
    (window as unknown as { coreMindAPI: unknown }).coreMindAPI = createWebBridge();
  }
}
