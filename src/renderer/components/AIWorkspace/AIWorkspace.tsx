import React, { useCallback } from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { PromptComposer } from './PromptComposer';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { coremindClient } from '../../services/coremind-client';
import { ChatThread } from './ChatThread';
import { useThemeStore } from '../../stores/themeStore';

export const AIWorkspace: React.FC = () => {
  const { currentState, setState, setAbortController, addChatMessage, chatHistory } = useAIWorkspaceStore();
  const { rootPath } = useWorkspaceStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const handleStartMock = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    if (!rootPath) {
      alert('Please open a workspace first to use the chat.');
      return;
    }

    const userMessageId = Date.now().toString();
    addChatMessage({
      id: userMessageId,
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    });
    
    setState('running');
    
    const abortController = new AbortController();
    setAbortController(abortController);
    
    try {
      // Map frontend chatHistory to backend history format
      const historyToSend = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await coremindClient.chatWithTools(prompt, rootPath, historyToSend);
      
      if (abortController.signal.aborted) {
        return;
      }

      if (response.status === 'ok') {
        addChatMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: response.response || 'Success, but no response provided.',
          timestamp: Date.now()
        });
        setState('completed');
      } else {
        addChatMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `**Error:** ${response.error || 'Something went wrong.'}`,
          timestamp: Date.now()
        });
        setState('error');
      }
    } catch (error: any) {
      if (!abortController.signal.aborted) {
        addChatMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `**Connection Error:** ${error.message || 'Could not reach CoreMind backend.'}`,
          timestamp: Date.now()
        });
        setState('error');
      }
    }
  }, [rootPath, chatHistory, addChatMessage, setState, setAbortController]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>
      <WorkspaceHeader />
      
      <div style={{ flex: 1, overflowY: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <ChatThread />
        
        {currentState === 'stopped' && (
          <div style={{
            margin: '16px 14px',
            padding: '12px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Stopped</strong>
            The AI operation was cancelled by the user.
          </div>
        )}
      </div>
      
      <div style={{
        padding: '0 14px 14px 14px',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'background-color 0.2s ease'
      }}>
        <PromptComposer onSubmit={handleStartMock} />
      </div>
    </div>
  );
};
