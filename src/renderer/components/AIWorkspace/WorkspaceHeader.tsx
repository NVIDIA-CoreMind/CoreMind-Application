import React, { useEffect, useState } from 'react';
import {
  Plus,
  History,
  X,
  Bot,
  Sparkles,
  SlidersHorizontal,
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
    selectedModel,
    isAiSettingsOpen,
    setIsAiSettingsOpen,
  } = useAIWorkspaceStore();

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error'>(
    coremindWs.getStatus()
  );
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const unsub = coremindWs.onStatusChange((status) => {
      setWsStatus(status);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const checkKey = () => {
      const key = localStorage.getItem('coremind:ai-api-key');
      setHasApiKey(Boolean(key && key.trim().length > 0));
    };
    checkKey();
    window.addEventListener('storage', checkKey);
    return () => window.removeEventListener('storage', checkKey);
  }, [isAiSettingsOpen]);

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
        {/* Left: Agent Title + AI Model / Key Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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

          <button
            onClick={() => setIsAiSettingsOpen(true)}
            title={`Active Model: ${selectedModel || 'NVIDIA Nemotron 3 Ultra'} (Click to configure)`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 7px',
              borderRadius: '10px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '10.5px',
              fontWeight: 500,
              maxWidth: '175px',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Sparkles size={11} style={{ color: '#10B981', flexShrink: 0 }} />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--text-primary)',
              }}
            >
              {selectedModel || 'NVIDIA Nemotron 3 Ultra'}
            </span>
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: hasApiKey ? '#22C55E' : '#10B981',
                flexShrink: 0,
              }}
            />
          </button>
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

          <button
            onClick={() => setIsAiSettingsOpen(true)}
            title="Configure AI Providers & API Keys"
            style={btnStyle}
          >
            <SlidersHorizontal size={13} />
          </button>

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
        onClose={() => {
          setIsAiSettingsOpen(false);
          const key = localStorage.getItem('coremind:ai-api-key');
          setHasApiKey(Boolean(key && key.trim().length > 0));
        }}
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
