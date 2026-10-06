import React from 'react';
import {
  Sun,
  Moon,
  PanelLeft,
  Terminal,
  Bot,
} from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';
import { useUiStore } from '../stores/uiStore';
import { isMacClient, isWindowsClient, getShortcutDisplay } from '../../shared/utils/shortcuts';
import { TitleBarMenu } from './TitleBarMenu';

export const AppMenuBar: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const {
    isSidebarOpen,
    toggleSidebar,
    isTerminalOpen,
    toggleTerminal,
    isRightPanelOpen,
    toggleRightPanel,
  } = useUiStore();

  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : isWindowsClient();

  // On macOS and Windows, AppMenuBar is not rendered.
  // On macOS, menus are in system bar and quick icons are in TitleBar.
  // On Windows, menus and quick icons are unified into the single Windows TitleBar.
  if (isMac || isWindows) {
    return null;
  }

  return (
    <div
      className="app-no-drag"
      style={{
        height: '30px',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        fontSize: '12px',
        userSelect: 'none',
        position: 'relative',
        zIndex: 45,
        flexShrink: 0,
      }}
    >
      {/* Left: Application Menus (File, Edit, View, Window) */}
      <TitleBarMenu />

      {/* Right: Toolbar Quick Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={toggleSidebar}
          title={`Toggle Primary Sidebar (${getShortcutDisplay('toggleSidebar', isMac)})`}
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: isSidebarOpen ? 'var(--text-primary)' : 'var(--text-muted)',
            backgroundColor: isSidebarOpen ? 'var(--bg-active)' : 'transparent',
          }}
        >
          <PanelLeft size={14} />
        </button>

        <button
          onClick={toggleTerminal}
          title={`Toggle Terminal (${getShortcutDisplay('toggleTerminal', isMac)})`}
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: isTerminalOpen ? 'var(--text-primary)' : 'var(--text-muted)',
            backgroundColor: isTerminalOpen ? 'var(--bg-active)' : 'transparent',
          }}
        >
          <Terminal size={14} />
        </button>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
          style={{ padding: '5px', borderRadius: '4px', color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button
          onClick={toggleRightPanel}
          title="Toggle CoreMind AI Agent"
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: isRightPanelOpen ? 'var(--accent)' : 'var(--text-muted)',
            backgroundColor: isRightPanelOpen ? 'var(--accent-bg)' : 'transparent',
          }}
        >
          <Bot size={14} />
        </button>
      </div>
    </div>
  );
};
