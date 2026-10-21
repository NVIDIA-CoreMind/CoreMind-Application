import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DesktopDownloadBanner } from './components/DesktopDownloadBanner';
import { isDesktopApp } from './services/runtime';
import { installWebBridge } from './services/webBridge';
import './index.css';

// Decide before the browser stand-in is installed: a browser visit gets the banner.
const showDownloadBanner = !isDesktopApp();
installWebBridge();

// The same app runs in both places. In a browser, desktop-only features report that they need the app.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    {showDownloadBanner && <DesktopDownloadBanner />}
  </React.StrictMode>
);
