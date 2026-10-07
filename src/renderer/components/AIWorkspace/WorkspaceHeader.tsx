import React from 'react';
import { Plus, History, MoreHorizontal, X } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';

export const WorkspaceHeader: React.FC = () => {
  const { toggleRightPanel } = useUiStore();
  const { newSession, toggleHistory, isHistoryOpen } = useAIWorkspaceStore();

  return (
    <div style={{
      height: '40px',
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      flexShrink: 0,
      userSelect: 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
          CoreMind AI Workspace
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <button onClick={newSession} title="New Task" style={btnStyle}>
          <Plus size={14} />
        </button>
        <button
          onClick={toggleHistory}
          title="History"
          style={{
            ...btnStyle,
            color: isHistoryOpen ? 'var(--accent)' : 'var(--text-secondary)',
            backgroundColor: isHistoryOpen ? 'var(--accent-bg)' : 'transparent',
          }}
        >
          <History size={13} />
        </button>
        <button title="More" style={btnStyle}>
          <MoreHorizontal size={14} />
        </button>
        <button onClick={toggleRightPanel} title="Close" style={btnStyle}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

const btnStyle = {
  padding: '6px',
  borderRadius: '6px',
  color: 'var(--text-secondary)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
