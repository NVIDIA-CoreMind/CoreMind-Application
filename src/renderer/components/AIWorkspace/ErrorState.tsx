import React from 'react';
import { ErrorEvent } from '../../types/aiWorkspace';
import { AlertCircle } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';

export const ErrorState: React.FC<{ event: ErrorEvent }> = ({ event }) => {
  const { setState, setExecutionState, setDraftPrompt, chatHistory, draftPrompt } = useAIWorkspaceStore();

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
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginTop: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCA5A5' }}>
        <AlertCircle size={14} />
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Failed</span>
      </div>
      
      <div style={{ fontSize: '12px', color: '#E5E7EB', lineHeight: '1.5' }}>
        {event.error}
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button 
          onClick={handleRetry}
          style={{
            padding: '4px 10px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FCA5A5',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
        <button 
          onClick={handleNewTask}
          style={{
            padding: '4px 10px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#D1D5DB',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          New Task
        </button>
      </div>
    </div>
  );
};
