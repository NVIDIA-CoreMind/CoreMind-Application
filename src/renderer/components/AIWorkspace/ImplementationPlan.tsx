import React, { useState } from 'react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useThemeStore } from '../../stores/themeStore';
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
  const isDark = theme === 'dark';

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
          color: 'var(--text-secondary)',
          textAlign: 'center',
          fontSize: '13px',
        }}
      >
        <ListTodo size={36} style={{ opacity: 0.35, marginBottom: '12px' }} />
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
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
        return <CheckCircle2 size={16} color="#22C55E" style={{ flexShrink: 0 }} />;
      case 'in_progress':
        return <Loader2 size={16} color="var(--accent, #3B82F6)" className="animate-spin" style={{ flexShrink: 0 }} />;
      case 'failed':
        return <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />;
      case 'pending':
      default:
        return <Circle size={16} color="var(--text-muted)" style={{ opacity: 0.5, flexShrink: 0 }} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: compact ? 'transparent' : 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Header & Progress Summary */}
      <div
        style={{
          padding: compact ? '8px 12px' : '14px 16px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.15)' : '#F8FAFC',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListTodo size={16} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              Implementation Plan
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 7px',
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              {completedCount}/{tasks.length}
            </span>
          </div>

          <span
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: progressPercent === 100 ? '#22C55E' : 'var(--accent)',
            }}
          >
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: '5px',
            width: '100%',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor:
                failedCount > 0
                  ? '#EF4444'
                  : progressPercent === 100
                  ? '#22C55E'
                  : 'var(--accent, #3B82F6)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {taskGraph?.goal && !compact && (
          <div
            style={{
              marginTop: '10px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              fontStyle: 'italic',
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
          padding: compact ? '8px' : '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {tasks.map((task, idx) => {
          const isExpanded = Boolean(expandedTasks[task.id]);
          const isCurrent = task.status === 'in_progress';

          return (
            <div
              key={task.id || idx}
              style={{
                borderRadius: '8px',
                border: isCurrent
                  ? '1px solid var(--accent)'
                  : isDark
                  ? '1px solid rgba(255, 255, 255, 0.08)'
                  : '1px solid #E2E8F0',
                backgroundColor: isCurrent
                  ? isDark
                    ? 'rgba(59, 130, 246, 0.08)'
                    : '#EFF6FF'
                  : isDark
                  ? '#181818'
                  : '#FFFFFF',
                overflow: 'hidden',
                transition: 'border-color 0.15s ease',
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
                          ? 'var(--text-secondary)'
                          : 'var(--text-primary)',
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
                          ? 'rgba(34, 197, 94, 0.15)'
                          : task.status === 'in_progress'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : task.status === 'failed'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(255, 255, 255, 0.06)',
                      color:
                        task.status === 'completed'
                          ? '#22C55E'
                          : task.status === 'in_progress'
                          ? 'var(--accent, #3B82F6)'
                          : task.status === 'failed'
                          ? '#EF4444'
                          : 'var(--text-muted)',
                    }}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </span>
                </div>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <div
                  style={{
                    padding: '8px 12px 10px 38px',
                    borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #F1F5F9',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {task.description && (
                    <div style={{ marginBottom: '6px' }}>{task.description}</div>
                  )}

                  {task.dependencies && task.dependencies.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Dependencies: {task.dependencies.join(', ')}
                    </div>
                  )}

                  {task.error && (
                    <div
                      style={{
                        marginTop: '6px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                        color: '#EF4444',
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
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
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
              backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#ECFDF5',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12.5px',
              color: isDark ? '#4ADE80' : '#15803D',
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
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12.5px',
              color: isDark ? '#F87171' : '#B91C1C',
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
