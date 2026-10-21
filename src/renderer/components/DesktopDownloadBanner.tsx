import './DesktopDownloadBanner.css';

const MAC_DOWNLOAD_URL =
  import.meta.env.VITE_DOWNLOAD_MAC_URL ||
  'https://github.com/NVIDIA-CoreMind/CoreMind-Application/releases';

/** Shown only in the browser. Explains what the desktop app adds and links to the installer. */
export function DesktopDownloadBanner() {
  return (
    <aside className="dl-banner" role="region" aria-label="Get the desktop app">
      <p className="dl-banner-text">
        <strong>Browser preview.</strong> File access, the terminal, and full AI tools run in the desktop app.
      </p>
      <a className="dl-banner-button" href={MAC_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
        Download for desktop
      </a>
    </aside>
  );
}
