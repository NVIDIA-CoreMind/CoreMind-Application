import React from 'react';
import { FolderOpen, Command, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUiStore } from '../stores/uiStore';

export const EmptyState: React.FC = () => {
  const { openFolderDialog, rootPath } = useWorkspaceStore();
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
        gap: '24px',
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
          AI-Native Development Environment
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {!rootPath && (
          <button
            onClick={() => openFolderDialog()}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 500,
              gap: '6px',
            }}
          >
            <FolderOpen size={14} />
            Open Project Folder
          </button>
        )}

        <button
          onClick={() => setQuickOpenOpen(true)}
          style={{
            padding: '7px 16px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 500,
            gap: '6px',
          }}
        >
          <Command size={14} />
          Quick Open File (⌘P)
        </button>
      </div>

      {/* Shortcuts List */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          gap: '10px 24px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }}
      >
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

        <span>Search in Project</span>
        <kbd style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>⌘⇧F</kbd>
      </div>
    </div>
  );
};
