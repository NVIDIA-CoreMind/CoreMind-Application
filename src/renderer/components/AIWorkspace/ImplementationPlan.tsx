import React, { useState } from 'react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';
import { TaskNode, TaskStatus } from '../../types/aiWorkspace';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  ListTodo,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react';

interface ImplementationPlanProps {
  compact?: boolean;
}

export const ImplementationPlan: React.FC<ImplementationPlanProps> = ({ compact = false }) => {
  const taskGraph = useAIWorkspaceStore((s) => s.taskGraph);
  const currentState = useAIWorkspaceStore((s) => s.currentState);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const tasks: TaskNode[] = taskGraph?.tasks || taskGraph?.nodes || [];

  if (tasks.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '32px 16px',
          color: tokens.textSecondary,
          textAlign: 'center',
          fontSize: '13px',
          backgroundColor: compact ? 'transparent' : tokens.bgMain,
        }}
      >
        <ListTodo size={36} style={{ opacity: 0.35, marginBottom: '12px' }} />
        <div style={{ fontWeight: 600, color: tokens.textPrimary, marginBottom: '4px' }}>
          No Active Implementation Plan
        </div>
        <div style={{ maxWidth: '280px', lineHeight: 1.5 }}>
          When you prompt the AI coding agent with a project task, it generates a multi-step checklist and tracks real-time progress here.
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed').length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={15} style={{ color: tokens.accentSuccess, flexShrink: 0 }} />;
      case 'in_progress':
        return <Loader2 size={15} style={{ color: tokens.accentRunning, flexShrink: 0 }} className="animate-spin" />;
      case 'failed':
        return <AlertCircle size={15} style={{ color: tokens.accentError, flexShrink: 0 }} />;
      case 'pending':
      default:
        return <Circle size={15} style={{ color: tokens.textMuted, flexShrink: 0 }} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: compact ? 'transparent' : tokens.bgMain,
        color: tokens.textPrimary,
        overflow: 'hidden',
      }}
    >
      {/* Header & Progress Summary */}
      <div
        style={{
          padding: compact ? '8px 12px' : '12px 14px',
          borderBottom: `1px solid ${tokens.border}`,
          backgroundColor: tokens.bgHeader,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListTodo size={15} color="currentColor" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              Implementation Plan
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: tokens.bgCard,
                border: `1px solid ${tokens.borderSubtle}`,
                color: tokens.textSecondary,
                fontWeight: 600,
              }}
            >
              {completedCount}/{tasks.length}
            </span>
          </div>

          <span
            style={{
              fontSize: '12px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 600,
              color: tokens.textPrimary,
            }}
          >
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: '4px',
            width: '100%',
            backgroundColor: tokens.bgCard,
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: tokens.textPrimary,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {taskGraph?.goal && !compact && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: tokens.textSecondary,
              lineHeight: 1.4,
            }}
          >
            Goal: {taskGraph.goal}
          </div>
        )}
      </div>

      {/* Task Checklist Items */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: compact ? '8px' : '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {tasks.map((task, idx) => {
          const isExpanded = Boolean(expandedTasks[task.id]);
          const isCurrent = task.status === 'in_progress';

          return (
            <div
              key={task.id || idx}
              style={{
                borderRadius: '6px',
                border: isCurrent
                  ? `1px solid ${tokens.border}`
                  : `1px solid ${tokens.borderSubtle}`,
                backgroundColor: isCurrent
                  ? tokens.bgCard
                  : tokens.bgPanel,
                overflow: 'hidden',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
            >
              <div
                onClick={() => toggleTask(task.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {getStatusIcon(task.status)}
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color:
                        task.status === 'completed'
                          ? tokens.textSecondary
                          : tokens.textPrimary,
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {task.title || `Step ${idx + 1}`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor:
                        task.status === 'completed'
                          ? (isDark ? 'rgba(129, 201, 149, 0.12)' : '#ECFDF5')
                          : task.status === 'in_progress'
                          ? (isDark ? 'rgba(138, 180, 248, 0.12)' : '#EFF6FF')
                          : task.status === 'failed'
                          ? (isDark ? 'rgba(242, 139, 130, 0.12)' : '#FEF2F2')
                          : tokens.bgCard,
                      color:
                        task.status === 'completed'
                          ? tokens.accentSuccess
                          : task.status === 'in_progress'
                          ? tokens.accentRunning
                          : task.status === 'failed'
                          ? tokens.accentError
                          : tokens.textMuted,
                    }}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                  <span style={{ color: tokens.textSecondary }}>
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                </div>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <div
                  style={{
                    padding: '8px 12px 10px 38px',
                    borderTop: `1px solid ${tokens.borderSubtle}`,
                    fontSize: '12px',
                    color: tokens.textSecondary,
                    lineHeight: 1.5,
                  }}
                >
                  {task.description && (
                    <div style={{ marginBottom: '6px' }}>{task.description}</div>
                  )}

                  {task.dependencies && task.dependencies.length > 0 && (
                    <div style={{ fontSize: '11px', color: tokens.textMuted }}>
                      Dependencies: {task.dependencies.join(', ')}
                    </div>
                  )}

                  {task.error && (
                    <div
                      style={{
                        marginTop: '6px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: isDark ? 'rgba(242, 139, 130, 0.12)' : '#FEF2F2',
                        color: tokens.accentError,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                      }}
                    >
                      Error: {task.error}
                    </div>
                  )}

                  {task.result && (
                    <div
                      style={{
                        marginTop: '6px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: isDark ? 'var(--bg-panel, #232426)' : '#F8FAFC',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Final Plan Summary when Complete */}
        {progressPercent === 100 && (
          <div
            style={{
              marginTop: '8px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(129, 201, 149, 0.1)' : '#ECFDF5',
              border: '1px solid rgba(129, 201, 149, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12.5px',
              color: isDark ? 'var(--success, #81C995)' : '#15803D',
            }}
          >
            <CheckCheck size={18} />
            <div>
              <strong>Plan Execution Completed</strong>
              <div style={{ fontSize: '11.5px', opacity: 0.9 }}>
                All {tasks.length} tasks executed and verified successfully.
              </div>
            </div>
          </div>
        )}

        {failedCount > 0 && currentState !== 'running' && (
          <div
            style={{
              marginTop: '8px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(242, 139, 130, 0.1)' : '#FEF2F2',
              border: '1px solid rgba(242, 139, 130, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12.5px',
              color: isDark ? 'var(--error, #F28B82)' : '#B91C1C',
            }}
          >
            <AlertTriangle size={18} />
            <div>
              <strong>Plan execution has issues</strong>
              <div style={{ fontSize: '11.5px', opacity: 0.9 }}>
                {failedCount} task(s) encountered errors during execution.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
