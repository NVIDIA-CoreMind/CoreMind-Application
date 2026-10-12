import React, { useEffect, useState } from 'react';
import {
  Plus,
  History,
  X,
  Bot,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { coremindWs } from '../../services/coremind/websocket';
import { useThemeStore } from '../../stores/themeStore';
import { AiSettingsModal } from './AiSettingsModal';

export const WorkspaceHeader: React.FC = () => {
  const { toggleRightPanel } = useUiStore();
  const {
    newSession,
    toggleHistory,
    isHistoryOpen,
    activeView,
    setActiveView,
    isAiSettingsOpen,
    setIsAiSettingsOpen,
  } = useAIWorkspaceStore();

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error'>(
    coremindWs.getStatus()
  );

  useEffect(() => {
    const unsub = coremindWs.onStatusChange((status) => {
      setWsStatus(status);
    });
    return () => unsub();
  }, []);

  // Ensure unified chat view is active
  useEffect(() => {
    if (activeView !== 'chat') {
      setActiveView('chat');
    }
  }, [activeView, setActiveView]);

  return (
    <>
      <div
        style={{
          height: '42px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.25)' : '#F8FAFC',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          flexShrink: 0,
          userSelect: 'none',
          gap: '6px',
        }}
      >
        {/* Left: Agent Title & Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bot size={15} style={{ color: 'var(--accent)' }} />
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              Agent
            </span>
          </div>

          {/* Current Execution State Badge */}
          {(() => {
            const execState = useAIWorkspaceStore.getState().executionState;
            const labels: Record<string, string> = {
              idle: 'Idle',
              thinking: 'Thinking',
              inspecting: 'Inspecting',
              editing: 'Editing',
              running_command: 'Running command',
              testing: 'Testing',
              completed: 'Completed',
              failed: 'Failed',
              cancelled: 'Cancelled',
            };
            const colors: Record<string, { bg: string; text: string; dot: string }> = {
              idle: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94A3B8', dot: '#94A3B8' },
              thinking: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3B82F6', dot: '#3B82F6' },
              inspecting: { bg: 'rgba(96, 165, 250, 0.12)', text: '#60A5FA', dot: '#60A5FA' },
              editing: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', dot: '#10B981' },
              running_command: { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', dot: '#F59E0B' },
              testing: { bg: 'rgba(168, 85, 247, 0.12)', text: '#A855F7', dot: '#A855F7' },
              completed: { bg: 'rgba(34, 197, 94, 0.12)', text: '#22C55E', dot: '#22C55E' },
              failed: { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444', dot: '#EF4444' },
              cancelled: { bg: 'rgba(148, 163, 184, 0.12)', text: '#94A3B8', dot: '#94A3B8' },
            };
            const c = colors[execState] || colors.idle;
            return (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10.5px',
                  fontWeight: 500,
                  padding: '1.5px 6px',
                  borderRadius: '10px',
                  backgroundColor: c.bg,
                  color: c.text,
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: c.dot,
                  }}
                />
                <span>{labels[execState] || execState}</span>
              </span>
            );
          })()}
        </div>

        {/* Right: Status indicator + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Backend WebSocket connection dot */}
          <div
            title={`Backend: ${wsStatus}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              marginRight: '2px',
            }}
          >
            <span
              style={{
                width: '6.5px',
                height: '6.5px',
                borderRadius: '50%',
                backgroundColor:
                  wsStatus === 'connected'
                    ? '#22C55E'
                    : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                    ? '#F59E0B'
                    : '#EF4444',
                display: 'inline-block',
              }}
            />
          </div>

          <button onClick={newSession} title="New Task (Clear)" style={btnStyle}>
            <Plus size={14} />
          </button>

          <button
            onClick={toggleHistory}
            title="Past Sessions"
            style={{
              ...btnStyle,
              color: isHistoryOpen ? 'var(--accent)' : 'var(--text-secondary)',
              backgroundColor: isHistoryOpen ? 'var(--accent-bg)' : 'transparent',
            }}
          >
            <History size={13} />
          </button>

          <button onClick={toggleRightPanel} title="Close Workspace" style={btnStyle}>
            <X size={14} />
          </button>
        </div>
      </div>

      <AiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
      />
    </>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '5px',
  borderRadius: '5px',
  color: 'var(--text-secondary)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease, color 0.15s ease',
};
