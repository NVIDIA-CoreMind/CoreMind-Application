import { useState } from 'react';
import { X } from 'lucide-react';
import './DesktopDownloadBanner.css';

const MAC_DOWNLOAD_URL =
  import.meta.env.VITE_DOWNLOAD_MAC_URL ||
  'https://github.com/NVIDIA-CoreMind/CoreMind-Application/releases';

const DISMISSED_KEY = 'coremind:desktop-banner-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Shown only in the browser. Explains what the desktop app adds and links to the installer.
 * The close button hides it, and the choice is remembered in this browser.
 */
export function DesktopDownloadBanner() {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage is unavailable, so the banner only hides for this page view.
    }
    setDismissed(true);
  };

  return (
    <aside className="dl-banner" role="region" aria-label="Get the desktop app">
      <p className="dl-banner-text">
        <strong>Browser preview.</strong> Folders open in Chrome or Edge. The terminal, Git, and device tools run in the desktop app.
      </p>
      <a className="dl-banner-button" href={MAC_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
        Download for desktop
      </a>
      <button
        type="button"
        className="dl-banner-close"
        onClick={dismiss}
        aria-label="Dismiss the desktop download banner"
        title="Dismiss"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </aside>
  );
}
