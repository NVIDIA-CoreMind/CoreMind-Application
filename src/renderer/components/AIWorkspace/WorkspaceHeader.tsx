import React from 'react';
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
import { useThemeStore } from '../../stores/themeStore';
import { AiSettingsModal } from './AiSettingsModal';
import { getAITheme } from './themeTokens';

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

  const taskGraph = useAIWorkspaceStore((s) => s.taskGraph);
  const events = useAIWorkspaceStore((s) => s.events);
  const trackedChanges = useAIWorkspaceStore((s) => s.trackedChanges);

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const tokens = getAITheme(isDark);

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
          backgroundColor: tokens.bgHeader,
          borderBottom: `1px solid ${tokens.border}`,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            height: '38px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Left: Agent Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Bot size={15} style={{ color: tokens.iconPrimary }} />
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: tokens.textPrimary,
                letterSpacing: '-0.01em',
              }}
            >
              CoreMind Agent
            </span>
          </div>

          {/* Right: Functional Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={newSession}
              title="New Task Session"
              style={{
                ...btnStyle,
                color: tokens.textSecondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.bgHover;
                e.currentTarget.style.color = tokens.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = tokens.textSecondary;
              }}
            >
              <Plus size={14} />
            </button>

            <button
              onClick={toggleHistory}
              title="Past Sessions"
              style={{
                ...btnStyle,
                color: isHistoryOpen
                  ? tokens.textPrimary
                  : tokens.textSecondary,
                backgroundColor: isHistoryOpen
                  ? tokens.bgHover
                  : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isHistoryOpen) {
                  e.currentTarget.style.backgroundColor = tokens.bgHover;
                  e.currentTarget.style.color = tokens.textPrimary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isHistoryOpen) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = tokens.textSecondary;
                }
              }}
            >
              <History size={13} />
            </button>

            <button
              onClick={toggleRightPanel}
              title="Close Workspace"
              style={{
                ...btnStyle,
                color: tokens.textSecondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.bgHover;
                e.currentTarget.style.color = tokens.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = tokens.textSecondary;
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
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
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isActive ? `1px solid ${tokens.border}` : '1px solid transparent',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  backgroundColor: isActive
                    ? tokens.bgActiveTab
                    : 'transparent',
                  color: isActive
                    ? tokens.textPrimary
                    : tokens.textSecondary,
                  boxShadow: 'none',
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = tokens.bgHover;
                    e.currentTarget.style.color = tokens.textPrimary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = tokens.textSecondary;
                  }
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '0 5px',
                      borderRadius: '10px',
                      backgroundColor: isDark ? '#2B2C2F' : '#E0E2E6',
                      border: `1px solid ${tokens.border}`,
                      color: tokens.textSecondary,
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
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease, color 0.15s ease',
};
