import React, { useEffect, useState } from 'react';
import {
  Plus,
  History,
  X,
  Bot,
  ListTodo,
  Activity,
  GitCompare,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useAIWorkspaceStore, WorkspaceViewTab } from '../../services/aiWorkspaceService';
import { coremindWs } from '../../services/coremind/websocket';
import { useThemeStore } from '../../stores/themeStore';

export const WorkspaceHeader: React.FC = () => {
  const { toggleRightPanel } = useUiStore();
  const {
    newSession,
    toggleHistory,
    isHistoryOpen,
    activeView,
    setActiveView,
    taskGraph,
    trackedChanges,
    currentState,
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

  const tasks = taskGraph?.tasks || taskGraph?.nodes || [];
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const changesCount = Object.keys(trackedChanges).length;
  const isRunning = currentState === 'running';

  const views: Array<{
    id: WorkspaceViewTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    {
      id: 'chat',
      label: 'Agent',
      icon: <Bot size={13} />,
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: <ListTodo size={13} />,
      badge: tasks.length > 0 ? `${completedTasks}/${tasks.length}` : undefined,
      badgeColor: completedTasks === tasks.length && tasks.length > 0 ? '#22C55E' : 'var(--accent)',
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <Activity size={13} />,
      badge: isRunning ? 'LIVE' : undefined,
      badgeColor: '#3B82F6',
    },
    {
      id: 'changes',
      label: 'Changes',
      icon: <GitCompare size={13} />,
      badge: changesCount > 0 ? changesCount : undefined,
      badgeColor: '#22C55E',
    },
  ];

  return (
    <div
      style={{
        height: '42px',
        padding: '0 10px',
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
      {/* Left: View Switcher Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {views.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: isActive ? 600 : 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive
                  ? isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : '#FFFFFF'
                  : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ display: 'flex' }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: '9.5px',
                    padding: '0 4px',
                    borderRadius: '8px',
                    backgroundColor: `${tab.badgeColor || 'var(--accent)'}25`,
                    color: tab.badgeColor || 'var(--accent)',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
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
