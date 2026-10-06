import React, { useEffect } from 'react';
import {
  PanelLeft,
  Terminal,
  Sun,
  Moon,
  Bot,
} from 'lucide-react';
import { isMacClient, getShortcutDisplay } from '../../shared/utils/shortcuts';
import { formatIdeTitle } from '../../shared/utils/title';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';
import { useThemeStore } from '../stores/themeStore';
import { useUiStore } from '../stores/uiStore';
import coreMindLogo from '../assets/icon.png';

export const TitleBar: React.FC = () => {
  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : !isMac;

  const { rootName } = useWorkspaceStore();
  const { tabs, activeTabId } = useTabsStore();
  const { theme, toggleTheme } = useThemeStore();
  const {
    isSidebarOpen,
    toggleSidebar,
    isTerminalOpen,
    toggleTerminal,
    isRightPanelOpen,
    toggleRightPanel,
  } = useUiStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const workspaceActiveFile = useWorkspaceStore((state) => state.activeFileName);
  const activeFileName = activeTab ? activeTab.fileName : workspaceActiveFile;

  const displayTitle = formatIdeTitle(rootName, activeFileName);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = displayTitle;
    }
  }, [displayTitle]);

  return (
    <div
      className="app-drag"
      style={{
        position: 'relative',
        height: 'var(--titlebar-height, 35px)',
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-color)',
        display: 'grid',
        gridTemplateColumns: 'minmax(80px, 1fr) auto minmax(80px, 1fr)',
        alignItems: 'center',
        paddingLeft: isMac ? '78px' : '12px',
        paddingRight: isWindows ? '142px' : '12px',
        zIndex: 50,
        flexShrink: 0,
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      {/* Left Column (Spacers / Traffic light region) */}
      <div
        className="app-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Intentionally minimal to preserve macOS traffic light or Windows title clearance */}
      </div>

      {/* Center Column: Perfectly centered dynamic window title */}
      <div
        className="app-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          padding: '0 12px',
        }}
      >
        <img
          src={coreMindLogo}
          alt="CoreMind"
          style={{
            width: '16px',
            height: '16px',
            objectFit: 'contain',
            flexShrink: 0,
            pointerEvents: 'none',
          }}
        />
        <span
          title={displayTitle}
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '12px',
            letterSpacing: '0.2px',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
          }}
        >
          {displayTitle}
        </span>
      </div>

      {/* Right Column: Controls or Windows caption button clearance */}
      <div
        className="app-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '4px',
          minWidth: 0,
        }}
      >
        {/* On macOS, AppMenuBar is hidden so we provide the layout toggles right in the title bar */}
        {isMac && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={toggleSidebar}
              title={`Toggle Primary Sidebar (${getShortcutDisplay('toggleSidebar', isMac)})`}
              style={{
                padding: '4px',
                borderRadius: '4px',
                color: isSidebarOpen ? 'var(--text-primary)' : 'var(--text-muted)',
                backgroundColor: isSidebarOpen ? 'var(--bg-active)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <PanelLeft size={14} />
            </button>

            <button
              onClick={toggleTerminal}
              title={`Toggle Terminal (${getShortcutDisplay('toggleTerminal', isMac)})`}
              style={{
                padding: '4px',
                borderRadius: '4px',
                color: isTerminalOpen ? 'var(--text-primary)' : 'var(--text-muted)',
                backgroundColor: isTerminalOpen ? 'var(--bg-active)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Terminal size={14} />
            </button>

            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
              style={{
                padding: '4px',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              onClick={toggleRightPanel}
              title="Toggle CoreMind AI Agent"
              style={{
                padding: '4px',
                borderRadius: '4px',
                color: isRightPanelOpen ? 'var(--accent)' : 'var(--text-muted)',
                backgroundColor: isRightPanelOpen ? 'var(--accent-bg)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Bot size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
