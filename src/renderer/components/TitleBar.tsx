import React from 'react';
import { Search, Terminal, Sidebar, PanelRight, Sparkles, FolderOpen } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUiStore } from '../stores/uiStore';

export const TitleBar: React.FC = () => {
  const { rootName, openFolderDialog } = useWorkspaceStore();
  const {
    toggleSidebar,
    toggleRightPanel,
    toggleTerminal,
    setQuickOpenOpen,
    setCommandPaletteOpen,
  } = useUiStore();

  return (
    <div
      className="app-drag"
      style={{
        height: 'var(--titlebar-height)',
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '78px', // Clearance for macOS traffic lights
        paddingRight: '12px',
        zIndex: 50,
      }}
    >
      {/* Left: Brand & Workspace */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: '12px',
              letterSpacing: '0.5px',
              color: 'var(--text-primary)',
            }}
          >
            CoreMind
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '3px',
              backgroundColor: 'var(--accent-bg)',
              color: 'var(--accent)',
              fontWeight: 500,
            }}
          >
            IDE
          </span>
        </div>

        {rootName && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>/</span>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              {rootName}
            </span>
          </>
        )}
      </div>

      {/* Center: Quick Search Bar */}
      <div
        className="app-no-drag"
        onClick={() => setQuickOpenOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '4px 12px',
          cursor: 'pointer',
          width: '320px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          <Search size={13} />
          <span style={{ fontSize: '11px' }}>Quick open files...</span>
        </div>
        <kbd
          style={{
            fontSize: '10px',
            backgroundColor: 'var(--bg-panel)',
            padding: '2px 5px',
            borderRadius: '3px',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          ⌘P
        </kbd>
      </div>

      {/* Right: Panel Toggles & Actions */}
      <div className="app-no-drag" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => openFolderDialog()}
          title="Open Project Folder (⌘O)"
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
          }}
        >
          <FolderOpen size={14} />
        </button>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          title="Command Palette (⌘⇧P)"
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
          }}
        >
          <Sparkles size={14} />
        </button>

        <button
          onClick={toggleSidebar}
          title="Toggle Sidebar (⌘B)"
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
          }}
        >
          <Sidebar size={14} />
        </button>

        <button
          onClick={toggleTerminal}
          title="Toggle Terminal (⌘J)"
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
          }}
        >
          <Terminal size={14} />
        </button>

        <button
          onClick={toggleRightPanel}
          title="Toggle Workspace Info Panel"
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
          }}
        >
          <PanelRight size={14} />
        </button>
      </div>
    </div>
  );
};
