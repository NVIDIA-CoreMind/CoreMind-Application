import React from 'react';
import {
  FolderOpen,
  PanelLeft,
  Terminal,
  Bot,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUiStore } from '../stores/uiStore';

export const TitleBar: React.FC = () => {
  const { rootName, openFolderDialog } = useWorkspaceStore();
  const {
    isSidebarOpen,
    toggleSidebar,
    isTerminalOpen,
    toggleTerminal,
    isRightPanelOpen,
    toggleRightPanel,
  } = useUiStore();

  return (
    <div
      className="app-drag"
      style={{
        position: 'relative',
        height: 'var(--titlebar-height)',
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '78px', // Clearance for macOS traffic light buttons
        paddingRight: '12px',
        zIndex: 50,
      }}
    >
      {/* Left: Active Workspace Breadcrumb (if open) */}
      <div
        className="app-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {rootName && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {rootName}
          </span>
        )}
      </div>

      {/* Center: Application Name CoreMind (Guaranteed absolute visual center) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '12px',
            letterSpacing: '0.6px',
            color: 'var(--text-primary)',
          }}
        >
          CoreMind
        </span>
      </div>

      {/* Right: Window Tools & Panel Toggles */}
      <div
        className="app-no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <button
          onClick={() => openFolderDialog()}
          title="Open Folder (⌘O)"
          style={{
            padding: '5px 7px',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            gap: '5px',
          }}
        >
          <FolderOpen size={13} />
          <span>Open Folder</span>
        </button>

        <div
          style={{
            width: '1px',
            height: '14px',
            backgroundColor: 'var(--border-color)',
            margin: '0 4px',
          }}
        />

        <button
          onClick={toggleSidebar}
          title="Toggle Explorer (⌘B)"
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
          title="Toggle Terminal (⌘J)"
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
          onClick={toggleRightPanel}
          title="Toggle Agent Panel"
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
