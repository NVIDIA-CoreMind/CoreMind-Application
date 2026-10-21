/**
 * True when the page runs inside the Electron desktop shell, which exposes the preload bridge.
 * In a regular browser this is false, and the app shows the download page instead.
 */
export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  // Development-only escape hatch, so the editor can be previewed in a browser: ?ide=1
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('ide')) return true;
  return Boolean(window.coreMindAPI);
}
