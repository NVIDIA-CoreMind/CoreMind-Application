import React, { useEffect, useState } from 'react';
import {
  Plus,
  History,
  X,
  Bot,
  MessageSquare,
  ListTodo,
  Activity,
  FileCode,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useAIWorkspaceStore, WorkspaceViewTab } from '../../services/aiWorkspaceService';
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

  const executionState = useAIWorkspaceStore((s) => s.executionState);
  const taskGraph = useAIWorkspaceStore((s) => s.taskGraph);
  const events = useAIWorkspaceStore((s) => s.events);
  const trackedChanges = useAIWorkspaceStore((s) => s.trackedChanges);

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

  const tasksCount = taskGraph?.tasks?.length || taskGraph?.nodes?.length || 0;
  const eventsCount = events.length;
  const changedFilesCount = Object.keys(trackedChanges).length;

  const viewTabs: { id: WorkspaceViewTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={12} /> },
    { id: 'plan', label: 'Plan', icon: <ListTodo size={12} />, badge: tasksCount > 0 ? tasksCount : undefined },
    { id: 'activity', label: 'Timeline', icon: <Activity size={12} />, badge: eventsCount > 0 ? eventsCount : undefined },
    { id: 'changes', label: 'Changes', icon: <FileCode size={12} />, badge: changedFilesCount > 0 ? changedFilesCount : undefined },
  ];

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isDark ? 'var(--bg-panel)' : '#F8FAFC',
          borderBottom: isDark ? '1px solid var(--border-color)' : '1px solid #E2E8F0',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            height: '40px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Left: Agent Title & Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bot size={15} style={{ color: 'var(--accent, #8AB4F8)' }} />
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                CoreMind Agent
              </span>
            </div>

            {/* Current Execution State Badge */}
            {(() => {
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
                idle: { bg: 'rgba(255, 255, 255, 0.05)', text: '#9AA0A6', dot: '#70757A' },
                thinking: { bg: 'rgba(138, 180, 248, 0.12)', text: '#8AB4F8', dot: '#8AB4F8' },
                inspecting: { bg: 'rgba(138, 180, 248, 0.12)', text: '#8AB4F8', dot: '#8AB4F8' },
                editing: { bg: 'rgba(138, 180, 248, 0.12)', text: '#8AB4F8', dot: '#8AB4F8' },
                running_command: { bg: 'rgba(138, 180, 248, 0.12)', text: '#8AB4F8', dot: '#8AB4F8' },
                testing: { bg: 'rgba(138, 180, 248, 0.12)', text: '#8AB4F8', dot: '#8AB4F8' },
                completed: { bg: 'rgba(129, 201, 149, 0.12)', text: '#81C995', dot: '#81C995' },
                failed: { bg: 'rgba(242, 139, 130, 0.12)', text: '#F28B82', dot: '#F28B82' },
                cancelled: { bg: 'rgba(255, 255, 255, 0.05)', text: '#9AA0A6', dot: '#70757A' },
              };
              const c = colors[executionState] || colors.idle;
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
                  <span>{labels[executionState] || executionState}</span>
                </span>
              );
            })()}
          </div>

          {/* Right: Status indicator + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Backend WebSocket connection dot */}
            <div
              title={`Backend WS: ${wsStatus}`}
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

            <button onClick={newSession} title="New Task Session" style={btnStyle}>
              <Plus size={14} />
            </button>

            <button
              onClick={toggleHistory}
              title="Past Sessions"
              style={{
                ...btnStyle,
                color: isHistoryOpen ? 'var(--accent, #8AB4F8)' : 'var(--text-secondary)',
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

        {/* View Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '0 8px 6px 8px',
          }}
        >
          {viewTabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 9px',
                  borderRadius: '5px',
                  border: isActive && isDark ? '1px solid rgba(138, 180, 248, 0.25)' : '1px solid transparent',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  backgroundColor: isActive
                    ? isDark
                      ? 'var(--accent-bg, rgba(138, 180, 248, 0.12))'
                      : '#FFFFFF'
                    : 'transparent',
                  color: isActive
                    ? 'var(--accent, #8AB4F8)'
                    : 'var(--text-secondary)',
                  boxShadow: 'none',
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '0 4px',
                      borderRadius: '10px',
                      backgroundColor: isActive
                        ? 'var(--accent, #8AB4F8)'
                        : isDark
                        ? 'var(--bg-hover)'
                        : 'rgba(0, 0, 0, 0.08)',
                      color: isActive ? '#1E1F20' : 'var(--text-secondary)',
                      lineHeight: '14px',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
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
