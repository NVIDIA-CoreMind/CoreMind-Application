import React from 'react';
import { Folder } from 'lucide-react';
import { useTabsStore } from '../stores/tabsStore';
import { useEditorStore } from '../stores/editorStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useTabsStore();
  const { cursorPosition } = useEditorStore();
  const { rootName } = useWorkspaceStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div
      style={{
        height: 'var(--statusbar-height)',
        backgroundColor: 'var(--bg-app)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        zIndex: 50,
      }}
    >
      {/* Left: Status & Workspace */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
            }}
          />
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Ready</span>
        </div>

        {rootName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <Folder size={12} color="var(--accent)" />
            <span>{rootName}</span>
          </div>
        )}
      </div>

      {/* Right: Language, Line/Col, Encoding, Platform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {activeTab && (
          <>
            <span>
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
            <span style={{ textTransform: 'capitalize' }}>{activeTab.language}</span>
          </>
        )}
        <span>UTF-8</span>
        <span>Spaces: 2</span>
        <span style={{ color: 'var(--text-muted)' }}>macOS</span>
        <span
          style={{
            padding: '1px 6px',
            borderRadius: '3px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--accent-hover)',
          }}
        >
          Apple Silicon
        </span>
      </div>
    </div>
  );
};
