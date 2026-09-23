import React from 'react';
import { FolderOpen, Command, Sparkles, Folder, Clock } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUiStore } from '../stores/uiStore';

export const EmptyState: React.FC = () => {
  const { openFolderDialog, openWorkspacePath, rootPath, recentWorkspaces } = useWorkspaceStore();
  const { setQuickOpenOpen } = useUiStore();

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-panel)',
        color: 'var(--text-secondary)',
        gap: '20px',
        overflowY: 'auto',
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            marginBottom: '4px',
          }}
        >
          <Sparkles size={24} />
        </div>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
          }}
        >
          CoreMind
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Fast, Focused Code Editor with Native macOS Terminal
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => openFolderDialog()}
          style={{
            padding: '8px 18px',
            borderRadius: '6px',
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <FolderOpen size={15} />
          {rootPath ? 'Open Another Folder' : 'Open Project Folder'}
        </button>

        <button
          onClick={() => setQuickOpenOpen(true)}
          style={{
            padding: '8px 18px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Command size={14} />
          Quick Open File (⌘P)
        </button>
      </div>

      {/* Recent Workspaces */}
      {recentWorkspaces.length > 0 && !rootPath && (
        <div
          style={{
            width: '360px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
            <Clock size={12} />
            <span>RECENT WORKSPACES</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recentWorkspaces.slice(0, 4).map((path) => {
              const name = path.split(/[/\\]/).filter(Boolean).pop() || path;
              return (
                <button
                  key={path}
                  onClick={() => openWorkspacePath(path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <Folder size={14} color="var(--accent)" />
                    <span style={{ fontWeight: 500 }}>{name}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    {path}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Shortcuts List */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          gap: '8px 24px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-surface)',
          padding: '14px 20px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          width: '360px',
        }}
      >
        <span>Open Folder</span>
        <kbd style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>⌘O</kbd>

        <span>Quick Open</span>
        <kbd style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>⌘P</kbd>

        <span>Command Palette</span>
        <kbd style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>⌘⇧P</kbd>

        <span>Save File</span>
        <kbd style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>⌘S</kbd>

        <span>Toggle Sidebar</span>
        <kbd style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>⌘B</kbd>

        <span>Toggle Terminal</span>
        <kbd style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>⌘J</kbd>
      </div>
    </div>
  );
};
