import React, { useEffect } from 'react';
import {
  PanelLeft,
  Terminal,
  Sun,
  Moon,
  Bot,
} from 'lucide-react';
import { isMacClient, isWindowsClient, getShortcutDisplay } from '../../shared/utils/shortcuts';
import { formatIdeTitle } from '../../shared/utils/title';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';
import { useThemeStore } from '../stores/themeStore';
import { useUiStore } from '../stores/uiStore';
import coreMindLogo from '../assets/icon.png';
import { TitleBarMenu } from './TitleBarMenu';
import { UserProfileButton } from './UserProfileButton';

export const TitleBar: React.FC = () => {
  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : isWindowsClient();

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

  const renderRightControls = (macPlatform: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button
        onClick={toggleSidebar}
        title={`Toggle Primary Sidebar (${getShortcutDisplay('toggleSidebar', macPlatform)})`}
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
        title={`Toggle Terminal (${getShortcutDisplay('toggleTerminal', macPlatform)})`}
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

      <div
        style={{
          width: '1px',
          height: '14px',
          backgroundColor: 'var(--border-color, rgba(255, 255, 255, 0.12))',
          margin: '0 4px',
        }}
      />

      <UserProfileButton />
    </div>
  );

  // 1. macOS TITLE BAR (Unchanged - native traffic lights, centered logo + dynamic title, right toggles)
  if (isMac) {
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
          paddingLeft: '78px',
          paddingRight: '12px',
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
          {/* Intentionally minimal to preserve macOS traffic light clearance */}
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

        {/* Right Column: Controls */}
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
          {renderRightControls(true)}
        </div>
      </div>
    );
  }

  // 2. WINDOWS TITLE BAR (Unified: [Logo] [File Edit View Window]  [Dynamic Title]  [Icons] [Win Controls])
  if (isWindows) {
    return (
      <div
        className="app-drag"
        style={{
          position: 'relative',
          height: 'var(--titlebar-height, 35px)',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '8px',
          paddingRight: '142px',
          zIndex: 50,
          flexShrink: 0,
          userSelect: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* Left Side: [CoreMind Icon] [File] [Edit] [View] [Window] */}
        <div
          className="app-no-drag"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
            height: '100%',
          }}
        >
          <img
            src={coreMindLogo}
            alt="CoreMind"
            style={{
              width: '16px',
              height: '16px',
              objectFit: 'contain',
              marginRight: '4px',
              flexShrink: 0,
              pointerEvents: 'none',
            }}
          />
          <TitleBarMenu />
        </div>

        {/* Center: Dynamic CoreMind Title (Centered in available space, text only) */}
        <div
          className="app-drag"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 0,
            overflow: 'hidden',
            padding: '0 16px',
            height: '100%',
          }}
        >
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

        {/* Right Side: [Existing CoreMind Controls] (Native caption buttons follow in paddingRight) */}
        <div
          className="app-no-drag"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '4px',
            flexShrink: 0,
            height: '100%',
          }}
        >
          {renderRightControls(false)}
        </div>
      </div>
    );
  }

  // 3. Fallback (e.g. Linux with separate menu bar)
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
        paddingLeft: '12px',
        paddingRight: '12px',
        zIndex: 50,
        flexShrink: 0,
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="app-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          minWidth: 0,
        }}
      />

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

      <div
        className="app-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '4px',
          minWidth: 0,
        }}
      />
    </div>
  );
};
