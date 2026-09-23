import React, { useEffect } from 'react';
import { IDELayout } from './layouts/IDELayout';
import { useTabsStore } from './stores/tabsStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useUiStore } from './stores/uiStore';

export const App: React.FC = () => {
  const { saveActiveTab, closeTab, activeTabId } = useTabsStore();
  const { rootPath } = useWorkspaceStore();
  const {
    toggleSidebar,
    toggleTerminal,
    setActiveSidebarTab,
    setCommandPaletteOpen,
    setQuickOpenOpen,
    isCommandPaletteOpen,
    isQuickOpenOpen,
  } = useUiStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd+Shift+P: Command Palette
      if (cmdOrCtrl && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }

      // Cmd+Shift+F: Search Project
      if (cmdOrCtrl && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setActiveSidebarTab('search');
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
    saveActiveTab,
    closeTab,
    toggleSidebar,
    toggleTerminal,
    setActiveSidebarTab,
    setCommandPaletteOpen,
    setQuickOpenOpen,
    isCommandPaletteOpen,
    isQuickOpenOpen,
  ]);

  return <IDELayout />;
};

export default App;
