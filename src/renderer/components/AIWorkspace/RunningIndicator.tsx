import React, { useEffect, useState } from 'react';
import {
  Search,
  Loader2,
  FileEdit,
  Terminal,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CircleDot,
} from 'lucide-react';
import {
  useAIWorkspaceStore,
  AgentPhase,
  resolveExecutionState,
} from '../../services/aiWorkspaceService';
import {
  AgentExecutionState,
  AGENT_STATE_LABELS,
} from '../../types/aiWorkspace';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

interface RunningIndicatorProps {
  state?: AgentExecutionState;
  phase?: AgentPhase;
  detail?: string;
}

export const RunningIndicator: React.FC<RunningIndicatorProps> = ({
  state: propState,
  phase: propPhase,
  detail: propDetail,
}) => {
  const { currentState, executionState, agentPhase, agentPhaseDetail, events } = useAIWorkspaceStore();
  const [dots, setDots] = useState('');
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  // Determine active execution state
  let activeState: AgentExecutionState =
    propState ||
    executionState ||
    resolveExecutionState(currentState, propPhase || agentPhase);

  let activeDetail = propDetail ?? agentPhaseDetail;

  // Infer from events if not explicitly set
  if (!propState && !propPhase && (!executionState || executionState === 'idle') && events.length > 0) {
    const latestEvent = events[events.length - 1];
    if (latestEvent.type === 'ThoughtEvent') {
      activeState = 'thinking';
      if (!activeDetail && latestEvent.summary) activeDetail = latestEvent.summary;
    } else if (
      latestEvent.type === 'FileExploredEvent' ||
      latestEvent.type === 'FileReadEvent' ||
      (latestEvent.type === 'ToolCallEvent' &&
        /search|grep|find|read|scan|list/i.test(latestEvent.tool))
    ) {
      activeState = 'inspecting';
      if (!activeDetail) {
        activeDetail = latestEvent.type === 'FileReadEvent' && latestEvent.file
          ? `Reading ${latestEvent.file.split('/').pop()}`
          : latestEvent.type === 'ToolCallEvent'
          ? `Searching ${latestEvent.tool}`
          : 'Inspecting files';
      }
    } else if (
      latestEvent.type === 'FileChangedEvent' ||
      (latestEvent.type === 'ToolCallEvent' &&
        /create|write|edit/i.test(latestEvent.tool))
    ) {
      activeState = 'editing';
      if (!activeDetail) {
        if (latestEvent.type === 'FileChangedEvent' && latestEvent.file) {
          activeDetail = `Writing ${latestEvent.file.split('/').pop()}`;
        }
      }
    } else if (
      latestEvent.type === 'TerminalEvent' ||
      (latestEvent.type === 'ToolCallEvent' &&
        /run|bash|exec|terminal/i.test(latestEvent.tool))
    ) {
      activeState = 'running_command';
      if (!activeDetail && latestEvent.type === 'TerminalEvent' && latestEvent.command) {
        activeDetail = `$ ${latestEvent.command}`;
      }
    } else if (latestEvent.type === 'TestEvent') {
      activeState = 'testing';
      if (!activeDetail && latestEvent.testName) {
        activeDetail = latestEvent.testName;
      }
    } else if (latestEvent.type === 'CompletedEvent') {
      activeState = 'completed';
    } else if (latestEvent.type === 'ErrorEvent') {
      activeState = 'failed';
    }
  }

  // Smooth animated ellipsis: . -> .. -> ... -> .
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 380);
    return () => clearInterval(interval);
  }, []);

  // Filter out any leaked raw multi-line reasoning traces from detail
  const cleanDetail = activeDetail
    ? activeDetail
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/\n+/g, ' ')
        .trim()
    : '';

  const monoColor = tokens.textPrimary;
  const monoMuted = tokens.textSecondary;
  const activePulse = tokens.accentRunning;

  const getStateConfig = () => {
    switch (activeState) {
      case 'idle':
        return {
          label: AGENT_STATE_LABELS.idle,
          icon: <CircleDot size={13} style={{ color: monoMuted, flexShrink: 0 }} />,
          accentColor: monoMuted,
          animated: false,
        };

      case 'thinking':
        return {
          label: AGENT_STATE_LABELS.thinking,
          icon: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px' }}>
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: activePulse,
                  animation: 'antigravity-pulse 1.4s infinite ease-in-out',
                }}
              />
            </div>
          ),
          accentColor: activePulse,
          animated: true,
        };

      case 'inspecting':
        return {
          label: AGENT_STATE_LABELS.inspecting,
          icon: (
            <Search
              size={13}
              style={{
                color: activePulse,
                animation: 'antigravity-search-pulse 1.4s infinite ease-in-out',
                flexShrink: 0,
              }}
            />
          ),
          accentColor: activePulse,
          animated: true,
        };

      case 'editing':
        return {
          label: AGENT_STATE_LABELS.editing,
          icon: (
            <FileEdit
              size={13}
              style={{
                color: activePulse,
                animation: 'antigravity-pulse 1.4s infinite ease-in-out',
                flexShrink: 0,
              }}
            />
          ),
          accentColor: activePulse,
          animated: true,
        };

      case 'running_command':
        return {
          label: AGENT_STATE_LABELS.running_command,
          icon: (
            <Terminal
              size={13}
              style={{
                color: activePulse,
                animation: 'antigravity-pulse 1.4s infinite ease-in-out',
                flexShrink: 0,
              }}
            />
          ),
          accentColor: activePulse,
          animated: true,
        };

      case 'testing':
        return {
          label: AGENT_STATE_LABELS.testing,
          icon: (
            <FlaskConical
              size={13}
              style={{
                color: activePulse,
                animation: 'antigravity-spin 2s linear infinite',
                flexShrink: 0,
              }}
            />
          ),
          accentColor: activePulse,
          animated: true,
        };

      case 'completed':
        return {
          label: AGENT_STATE_LABELS.completed,
          icon: <CheckCircle2 size={13} style={{ color: tokens.accentSuccess, flexShrink: 0 }} />,
          accentColor: tokens.accentSuccess,
          animated: false,
        };

      case 'failed':
        return {
          label: AGENT_STATE_LABELS.failed,
          icon: <AlertCircle size={13} style={{ color: tokens.accentError, flexShrink: 0 }} />,
          accentColor: tokens.accentError,
          animated: false,
        };

      case 'cancelled':
        return {
          label: AGENT_STATE_LABELS.cancelled,
          icon: <XCircle size={13} style={{ color: monoMuted, flexShrink: 0 }} />,
          accentColor: monoMuted,
          animated: false,
        };

      default:
        return {
          label: 'Working',
          icon: (
            <Loader2
              size={13}
              style={{
                color: monoColor,
                animation: 'antigravity-spin 1s linear infinite',
                flexShrink: 0,
              }}
            />
          ),
          accentColor: monoColor,
          animated: true,
        };
    }
  };

  const { label, icon, accentColor, animated } = getStateConfig();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '4px 2px',
        fontSize: '12.5px',
        fontFamily: 'var(--font-sans)',
        color: monoMuted,
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
        userSelect: 'none',
        animation: 'antigravity-fade-in 0.15s ease-out',
      }}
    >
      {icon}
      <span
        style={{
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: monoColor,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <span>{label}</span>
        {animated && (
          <span
            style={{
              display: 'inline-block',
              width: '16px',
              textAlign: 'left',
              color: accentColor,
              fontWeight: 600,
            }}
          >
            {dots || '.'}
          </span>
        )}
      </span>

      {cleanDetail && (
        <span
          style={{
            fontSize: '11.5px',
            color: monoMuted,
            maxWidth: '280px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginLeft: '2px',
          }}
          title={cleanDetail}
        >
          {cleanDetail}
        </span>
      )}

      <style>{`
        @keyframes antigravity-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes antigravity-pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes antigravity-search-pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes antigravity-fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
