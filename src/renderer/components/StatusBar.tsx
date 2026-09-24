import React from 'react';
import { GitBranch, XCircle, AlertTriangle, Settings } from 'lucide-react';
import { useTabsStore } from '../stores/tabsStore';
import { useEditorStore } from '../stores/editorStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUiStore } from '../stores/uiStore';

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useTabsStore();
  const { cursorPosition } = useEditorStore();
  const { rootName } = useWorkspaceStore();
  const { setActiveSidebarTab } = useUiStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div
      style={{
        height: '22px',
        backgroundColor: '#181818',
        borderTop: '1px solid #282828',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        fontSize: '11px',
        color: '#9ca3af',
        zIndex: 50,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Left: Branch & Errors / Warnings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <GitBranch size={11} color="#9ca3af" />
          <span style={{ color: '#d1d5db' }}>main*</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <XCircle size={11} color="#9ca3af" />
            <span>0</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <AlertTriangle size={11} color="#9ca3af" />
            <span>0</span>
          </span>
        </div>

        {rootName && (
          <span style={{ color: '#71717a' }}>• {rootName}</span>
        )}
      </div>

      {/* Right: Language, Line/Col, Encoding, Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {activeTab ? (
          <>
            <span>
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span style={{ textTransform: 'capitalize' }}>{activeTab.language}</span>
          </>
        ) : (
          <>
            <span>UTF-8</span>
            <span>Spaces: 2</span>
          </>
        )}
        <button
          onClick={() => setActiveSidebarTab('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#9ca3af',
            background: 'transparent',
            border: 'none',
            padding: '0',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#e5e7eb')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
        >
          <Settings size={11} />
          <span>CoreMind - Settings</span>
        </button>
      </div>
    </div>
  );
};

