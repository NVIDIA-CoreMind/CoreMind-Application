import React, { useState } from 'react';
import { AIWorkspaceEvent } from '../../types/aiWorkspace';
import { UserRequest } from './UserRequest';
import { ThoughtBlock } from './ThoughtBlock';
import { FileActivity } from './FileActivity';
import { TerminalActivity } from './TerminalActivity';
import { QuestionCard } from './QuestionCard';
import { ApprovalCard } from './ApprovalCard';
import { FinalResult } from './FinalResult';
import { ErrorState } from './ErrorState';
import { VerificationCard } from './VerificationCard';
import { useThemeStore } from '../../stores/themeStore';
import {
  Wrench,
  ChevronDown,
  ChevronRight,
  Clock,
  Check,
  AlertTriangle,
  Play,
  FileCode,
  ListTodo,
} from 'lucide-react';

function formatEventTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const ActivityItem: React.FC<{ event: AIWorkspaceEvent }> = ({ event }) => {
  const [toolExpanded, setToolExpanded] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  let content: React.ReactNode = null;

  switch (event.type) {
    case 'UserRequestEvent':
      return <UserRequest event={event} />;

    case 'AgentStartedEvent':
      content = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '12px', fontWeight: 600 }}>
          <Play size={13} />
          <span>Agent started coding session: {event.task || 'Autonomous task'}</span>
        </div>
      );
      break;

    case 'PlanCreatedEvent':
      content = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '12px', fontWeight: 600 }}>
          <ListTodo size={14} />
          <span>Created implementation plan with {event.tasks.length} subtasks</span>
        </div>
      );
      break;

    case 'TaskProgressEvent':
      content = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{
            fontSize: '10px',
            padding: '1px 6px',
            borderRadius: '4px',
            fontWeight: 600,
            textTransform: 'uppercase',
            backgroundColor: event.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            color: event.status === 'completed' ? '#22C55E' : 'var(--accent)',
          }}>
            {event.status}
          </span>
          <span style={{ fontWeight: 500 }}>{event.title}</span>
        </div>
      );
      break;

    case 'ThoughtEvent':
      content = <ThoughtBlock event={event} />;
      break;

    case 'ToolCallEvent':
      content = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            onClick={() => setToolExpanded(!toolExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '12.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wrench size={13} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{event.tool}</span>
              {event.success !== undefined && (
                event.success ? (
                  <Check size={12} color="#22C55E" />
                ) : (
                  <AlertTriangle size={12} color="#EF4444" />
                )
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              {event.durationMs && (
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{event.durationMs}ms</span>
              )}
              {toolExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </div>
          </div>

          {toolExpanded && (
            <div
              style={{
                borderRadius: '6px',
                backgroundColor: isDark ? '#141414' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                padding: '8px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Arguments:</div>
              <div>{JSON.stringify(event.args, null, 2)}</div>
              {event.result && (
                <>
                  <div style={{ color: 'var(--text-secondary)', margin: '8px 0 4px', fontWeight: 600 }}>Result:</div>
                  <div>{typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2)}</div>
                </>
              )}
            </div>
          )}
        </div>
      );
      break;

    case 'FileExploredEvent':
    case 'FileReadEvent':
    case 'FileChangedEvent':
      content = <FileActivity event={event} />;
      break;

    case 'DiffCreatedEvent':
      content = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <FileCode size={13} color="var(--accent)" />
          <span>Diff for <strong>{event.path}</strong></span>
          <span style={{ color: '#22C55E', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>+{event.additions}</span>
          <span style={{ color: '#EF4444', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>-{event.deletions}</span>
        </div>
      );
      break;

    case 'TerminalEvent':
      content = <TerminalActivity event={event} />;
      break;

    case 'TestEvent':
      content = <VerificationCard event={event} />;
      break;

    case 'QuestionEvent':
      content = <QuestionCard event={event} />;
      break;

    case 'ApprovalEvent':
      content = <ApprovalCard />;
      break;

    case 'CompletedEvent':
      content = <FinalResult event={event} />;
      break;

    case 'ErrorEvent':
      content = <ErrorState event={event} />;
      break;

    default:
      return null;
  }

  if (!content) return null;

  const isFullCard = event.type === 'QuestionEvent' || event.type === 'ApprovalEvent';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: isFullCard ? '12px 14px' : '5px 14px',
        width: '100%',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', opacity: 0.6, fontSize: '10.5px' }}>
        <Clock size={10} />
        <span>{formatEventTime(event.timestamp)}</span>
      </div>
      <div>{content}</div>
    </div>
  );
};
