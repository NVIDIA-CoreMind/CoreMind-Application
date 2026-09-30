import React, { useEffect } from 'react';
import { IDELayout } from './layouts/IDELayout';
import { useTabsStore } from './stores/tabsStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useUiStore } from './stores/uiStore';
import { useBackendStore } from './stores/backendStore';
import { useAuthStore } from './stores/authStore';

export const App: React.FC = () => {
  const { saveActiveTab, closeTab, activeTabId } = useTabsStore();
  const { rootPath, openFolderDialog, openWorkspacePath, restoreLastWorkspace } = useWorkspaceStore();
  const {
    toggleSidebar,
    toggleTerminal,
    setCommandPaletteOpen,
    setQuickOpenOpen,
    isCommandPaletteOpen,
    isQuickOpenOpen,
  } = useUiStore();

  // Initialize CoreMind Backend WebSocket and Auth session on startup
  useEffect(() => {
    useBackendStore.getState().init();
    useAuthStore.getState().initAuth();
  }, []);

  // Restore previous workspace on startup
  useEffect(() => {
    restoreLastWorkspace();
  }, [restoreLastWorkspace]);

  // Listen for Open Folder events from native macOS application menu
  useEffect(() => {
    const unsub = window.coreMindAPI?.onOpenWorkspacePath?.((path) => {
      if (path) {
        openWorkspacePath(path);
      }
    });
    return () => unsub?.();
  }, [openWorkspacePath]);

  // Window drag & drop for opening folders from Finder
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const dropped = e.dataTransfer.files[0];
        const filePath = (dropped as any).path;
        if (filePath) {
          openWorkspacePath(filePath);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [openWorkspacePath]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd+O: Open Folder
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        openFolderDialog();
        return;
      }

      // Cmd+Shift+P: Command Palette
      if (cmdOrCtrl && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }

      // Cmd+Shift+A or Cmd+L: Toggle Agent Panel
      if ((cmdOrCtrl && e.shiftKey && (e.key === 'a' || e.key === 'A')) || (cmdOrCtrl && !e.shiftKey && (e.key === 'l' || e.key === 'L'))) {
        e.preventDefault();
        useUiStore.getState().toggleRightPanel();
        return;
      }

      // Cmd+P: Quick Open
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setQuickOpenOpen(!isQuickOpenOpen);
        return;
      }

      // Cmd+S: Save File
      if (cmdOrCtrl && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (rootPath) {
          saveActiveTab(rootPath);
        }
        return;
      }

      // Cmd+W: Close Tab
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
        return;
      }

      // Cmd+B: Toggle Sidebar
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Cmd+J: Toggle Terminal
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        toggleTerminal();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    rootPath,
    activeTabId,
    openFolderDialog,
    saveActiveTab,
    closeTab,
    toggleSidebar,
    toggleTerminal,
    setCommandPaletteOpen,
    setQuickOpenOpen,
    isCommandPaletteOpen,
    isQuickOpenOpen,
  ]);

  return <IDELayout />;
};

export default App;
