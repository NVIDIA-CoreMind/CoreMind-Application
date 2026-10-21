import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DownloadPage } from './components/DownloadPage';
import { isDesktopApp } from './services/runtime';
import './index.css';

// The IDE needs the Electron bridge (files, terminal, native dialogs). A browser gets the download page.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{isDesktopApp() ? <App /> : <DownloadPage />}</React.StrictMode>
);
