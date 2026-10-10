import React, { useEffect } from 'react';
import {
  Search,
  Settings,
} from 'lucide-react';
import {
  LayoutCustomizeIcon,
  LayoutLeftPanelIcon,
  LayoutBottomPanelIcon,
  LayoutRightPanelIcon,
  ChromeCodicon,
} from './Codicons';
import { isMacClient, isWindowsClient, getShortcutDisplay } from '../../shared/utils/shortcuts';
import { formatIdeTitle } from '../../shared/utils/title';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';
import { useUiStore } from '../stores/uiStore';
import coreMindLogo from '../assets/icon.png';
import { TitleBarMenu } from './TitleBarMenu';
import { UserProfileButton } from './UserProfileButton';

export const TitleBar: React.FC = () => {
  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : isWindowsClient();

  const { rootName } = useWorkspaceStore();
  const { tabs, activeTabId } = useTabsStore();
  const {
    isSidebarOpen,
    toggleSidebar,
    isTerminalOpen,
    toggleTerminal,
    isRightPanelOpen,
    toggleRightPanel,
    activeSidebarTab,
    setActiveSidebarTab,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
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

  const renderRightControls = (macPlatform: boolean) => {
    const btnStyle = (isActive: boolean) => ({
      width: '24px',
      height: '24px',
      borderRadius: '5px',
      color: isActive ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #9CA3AF)',
      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      transition: 'all 0.15s ease',
    });

    const handleOpenChrome = async () => {
      try {
        if (window.coreMindAPI?.openInChrome) {
          await window.coreMindAPI.openInChrome('http://localhost:5173');
        } else {
          window.open('http://localhost:5173', '_blank');
        }
      } catch {
        window.open('http://localhost:5173', '_blank');
      }
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {/* 1. Layout / Editor Grid */}
        <button
          onClick={() => setCommandPaletteOpen(!isCommandPaletteOpen)}
          title="Customize Layout"
          aria-label="Customize Layout"
          style={btnStyle(false)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary, #9CA3AF)';
          }}
        >
          <LayoutCustomizeIcon size={15} />
        </button>

        {/* 2. Primary Sidebar */}
        <button
          onClick={toggleSidebar}
          title={`Toggle Primary Sidebar (${getShortcutDisplay('toggleSidebar', macPlatform)})`}
          aria-label="Toggle Primary Sidebar"
          style={btnStyle(isSidebarOpen)}
          onMouseEnter={(e) => {
            if (!isSidebarOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            if (!isSidebarOpen) e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = isSidebarOpen ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #9CA3AF)';
          }}
        >
          <LayoutLeftPanelIcon size={15} />
        </button>

        {/* 3. Bottom Panel / Terminal */}
        <button
          onClick={toggleTerminal}
          title={`Toggle Bottom Panel (${getShortcutDisplay('toggleTerminal', macPlatform)})`}
          aria-label="Toggle Bottom Panel"
          style={btnStyle(isTerminalOpen)}
          onMouseEnter={(e) => {
            if (!isTerminalOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            if (!isTerminalOpen) e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = isTerminalOpen ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #9CA3AF)';
          }}
        >
          <LayoutBottomPanelIcon size={15} />
        </button>

        {/* 4. Secondary / Right Panel (AI Workspace) */}
        <button
          onClick={toggleRightPanel}
          title="Toggle Secondary / AI Panel"
          aria-label="Toggle Secondary / AI Panel"
          style={btnStyle(isRightPanelOpen)}
          onMouseEnter={(e) => {
            if (!isRightPanelOpen) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            if (!isRightPanelOpen) e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = isRightPanelOpen ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #9CA3AF)';
          }}
        >
          <LayoutRightPanelIcon size={15} />
        </button>

        {/* 5. Search in Files */}
        <button
          onClick={() => setActiveSidebarTab('search')}
          title="Search in Files"
          aria-label="Search in Files"
          style={btnStyle(isSidebarOpen && activeSidebarTab === 'search')}
          onMouseEnter={(e) => {
            if (!(isSidebarOpen && activeSidebarTab === 'search')) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            if (!(isSidebarOpen && activeSidebarTab === 'search')) e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = (isSidebarOpen && activeSidebarTab === 'search') ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #9CA3AF)';
          }}
        >
          <Search size={14} strokeWidth={1.8} />
        </button>

        {/* 6. Divider */}
        <div
          style={{
            width: '1px',
            height: '14px',
            backgroundColor: 'var(--border-color, rgba(255, 255, 255, 0.16))',
            margin: '0 2px',
          }}
        />

        {/* 7. Chrome / Web Preview */}
        <button
          onClick={handleOpenChrome}
          title="Open Web Preview in Chrome"
          aria-label="Open Web Preview in Chrome"
          style={btnStyle(false)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary, #9CA3AF)';
          }}
        >
          <ChromeCodicon size={15} />
        </button>

        {/* 8. Settings */}
        <button
          onClick={() => setActiveSidebarTab('settings')}
          title="Settings"
          aria-label="Settings"
          style={btnStyle(isSidebarOpen && activeSidebarTab === 'settings')}
          onMouseEnter={(e) => {
            if (!(isSidebarOpen && activeSidebarTab === 'settings')) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            if (!(isSidebarOpen && activeSidebarTab === 'settings')) e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = (isSidebarOpen && activeSidebarTab === 'settings') ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #9CA3AF)';
          }}
        >
          <Settings size={14} strokeWidth={1.8} />
        </button>

        {/* 9. User Profile (Green Avatar with M + Chevron) */}
        <UserProfileButton />
      </div>
    );
  };

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
