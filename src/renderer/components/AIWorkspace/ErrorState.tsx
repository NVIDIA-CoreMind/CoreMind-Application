import React from 'react';
import { ErrorEvent } from '../../types/aiWorkspace';
import { AlertCircle } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

export const ErrorState: React.FC<{ event: ErrorEvent }> = ({ event }) => {
  const { setState, setExecutionState, setDraftPrompt, chatHistory, draftPrompt } = useAIWorkspaceStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  const handleRetry = () => {
    setExecutionState('idle');
    setState('idle');
    const lastUserMsg = [...chatHistory].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && !draftPrompt) {
      setDraftPrompt(lastUserMsg.content);
    }
  };

  const handleNewTask = () => {
    useAIWorkspaceStore.getState().clear();
  };

  return (
    <div style={{
      backgroundColor: tokens.bgPanel,
      border: `1px solid ${isDark ? 'rgba(242, 139, 130, 0.25)' : '#FCA5A5'}`,
      borderRadius: '8px',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginTop: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tokens.accentError }}>
        <AlertCircle size={14} color="currentColor" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: tokens.textPrimary }}>Execution Error</span>
      </div>
      
      <div style={{ fontSize: '12px', color: tokens.textSecondary, lineHeight: '1.5' }}>
        {event.error}
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button 
          onClick={handleRetry}
          style={{
            padding: '5px 12px',
            backgroundColor: tokens.bgActiveTab,
            border: `1px solid ${tokens.border}`,
            color: tokens.textPrimary,
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
        <button 
          onClick={handleNewTask}
          style={{
            padding: '5px 12px',
            backgroundColor: tokens.bgCard,
            border: `1px solid ${tokens.border}`,
            color: tokens.textSecondary,
            borderRadius: '5px',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          New Task
        </button>
      </div>
    </div>
  );
};
