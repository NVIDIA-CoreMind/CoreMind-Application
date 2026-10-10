import React, { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useAIWorkspaceStore, AgentPhase } from '../../services/aiWorkspaceService';

interface RunningIndicatorProps {
  phase?: AgentPhase;
  detail?: string;
}

export const RunningIndicator: React.FC<RunningIndicatorProps> = ({
  phase: propPhase,
  detail: propDetail,
}) => {
  const { agentPhase, agentPhaseDetail, events } = useAIWorkspaceStore();
  const [dots, setDots] = useState('');

  // Priority order: propPhase -> store.agentPhase -> inferred from latest event
  let activePhase: AgentPhase = propPhase || agentPhase || 'thinking';
  let activeDetail = propDetail ?? agentPhaseDetail;

  // Only fall back to event inference if no explicit phase was set in store
  if (!propPhase && !agentPhase && events.length > 0) {
    const latestEvent = events[events.length - 1];
    if (latestEvent.type === 'ThoughtEvent') {
      activePhase = 'thinking';
      if (!activeDetail && latestEvent.summary) activeDetail = latestEvent.summary;
    } else if (
      latestEvent.type === 'FileExploredEvent' ||
      latestEvent.type === 'FileReadEvent' ||
      (latestEvent.type === 'ToolCallEvent' &&
        /search|grep|find|read|scan|list/i.test(latestEvent.tool))
    ) {
      activePhase = 'searching';
      if (!activeDetail) {
        activeDetail = latestEvent.type === 'FileReadEvent' && latestEvent.file
          ? `Reading ${latestEvent.file.split('/').pop()}`
          : latestEvent.type === 'ToolCallEvent'
          ? `Searching ${latestEvent.tool}`
          : 'Searching files';
      }
    } else if (
      latestEvent.type === 'FileChangedEvent' ||
      latestEvent.type === 'TerminalEvent' ||
      (latestEvent.type === 'ToolCallEvent' &&
        /create|write|edit|run|bash|exec/i.test(latestEvent.tool))
    ) {
      activePhase = 'working';
      if (!activeDetail) {
        if (latestEvent.type === 'FileChangedEvent' && latestEvent.file) {
          activeDetail = `Created ${latestEvent.file.split('/').pop()}`;
        } else if (latestEvent.type === 'TerminalEvent' && latestEvent.command) {
          activeDetail = `$ ${latestEvent.command}`;
        }
      }
    }
  }

  // Smooth animated ellipsis: . -> .. -> ... -> .
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 380);
    return () => clearInterval(interval);
  }, []);

  const getPhaseConfig = () => {
    switch (activePhase) {
      case 'thinking':
      case 'planning':
        return {
          label: 'Thinking',
          icon: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px' }}>
              <div
                style={{
                  width: '7.5px',
                  height: '7.5px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent, #3B82F6)',
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.7)',
                  animation: 'antigravity-pulse 1.4s infinite ease-in-out',
                }}
              />
            </div>
          ),
          accentColor: 'var(--accent, #3B82F6)',
        };
      case 'searching':
        return {
          label: 'Searching',
          icon: (
            <Search
              size={13}
              style={{
                color: '#60A5FA',
                animation: 'antigravity-search-pulse 1.4s infinite ease-in-out',
                flexShrink: 0,
              }}
            />
          ),
          accentColor: '#60A5FA',
        };
      case 'verifying':
        return {
          label: 'Verifying',
          icon: (
            <Loader2
              size={13}
              style={{
                color: 'var(--accent, #3B82F6)',
                animation: 'antigravity-spin 1s linear infinite',
                flexShrink: 0,
              }}
            />
          ),
          accentColor: 'var(--accent, #3B82F6)',
        };
      case 'working':
      default:
        return {
          label: 'Working',
          icon: (
            <Loader2
              size={13}
              style={{
                color: 'var(--accent, #3B82F6)',
                animation: 'antigravity-spin 1s linear infinite',
                flexShrink: 0,
              }}
            />
          ),
          accentColor: 'var(--accent, #3B82F6)',
        };
    }
  };

  const { label, icon, accentColor } = getPhaseConfig();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '4px 2px',
        fontSize: '12.5px',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-secondary, #94A3B8)',
        backgroundColor: 'transparent', // Explicitly zero background like Antigravity
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
          color: 'var(--text-primary, #E2E8F0)',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <span>{label}</span>
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
      </span>

      {activeDetail && (
        <span
          style={{
            fontSize: '11.5px',
            color: 'var(--text-muted, #64748B)',
            maxWidth: '240px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginLeft: '2px',
          }}
          title={activeDetail}
        >
          {activeDetail}
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
