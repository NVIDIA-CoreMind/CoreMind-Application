import React from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ActivityTimeline } from './ActivityTimeline';
import { PromptComposer } from './PromptComposer';
import { RunningIndicator } from './RunningIndicator';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { AIWorkspaceEvent } from '../../types/aiWorkspace';

export const AIWorkspace: React.FC = () => {
  const { currentState, addEvent, setState, setAbortController } = useAIWorkspaceStore();

  const handleStartMock = (prompt: string) => {
    if (!prompt.trim()) return;
    
    useAIWorkspaceStore.getState().clear();
    setState('running');
    
    const abortController = new AbortController();
    setAbortController(abortController);
    
    const signal = abortController.signal;
    
    const events: { delay: number; event: AIWorkspaceEvent; isWaiting?: boolean; isComplete?: boolean; isError?: boolean }[] = [
      { delay: 0, event: { id: '1', type: 'UserRequestEvent', content: prompt, timestamp: Date.now() } },
      { delay: 100, event: { id: '2', type: 'AgentStartedEvent', timestamp: Date.now() + 100 } },
      { delay: 300, event: { id: '3', type: 'FileExploredEvent', filesCount: 3, timestamp: Date.now() + 200 } },
      { delay: 800, event: { id: '4', type: 'ThoughtEvent', summary: "Planning execution strategy for the request...", durationMs: 500, timestamp: Date.now() + 1200 } },
      { delay: 1000, event: { id: '5', type: 'FileReadEvent', file: 'package.json', startLine: 1, endLine: 162, timestamp: Date.now() + 1300 } },
      { delay: 1500, event: { id: '6', type: 'TerminalEvent', command: 'npm run dev', output: "rendering chunks...\nbuilt in 93ms", status: 'completed', timestamp: Date.now() + 3000 } },
      { delay: 2000, event: { id: '7', type: 'QuestionEvent', question: 'Would you like me to also run the tests?', options: ['Yes', 'No'], timestamp: Date.now() + 3100 }, isWaiting: true },
    ];

    const scheduleNext = (index: number) => {
      if (signal.aborted || index >= events.length) return;
      
      const step = events[index];
      const previousDelay = index > 0 ? events[index - 1].delay : 0;
      const waitTime = step.delay - previousDelay;
      
      setTimeout(() => {
        if (signal.aborted) return;
        
        addEvent(step.event);
        
        if (step.isWaiting) setState('waiting');
        else if (step.isComplete) setState('completed');
        else if (step.isError) setState('error');
        
        if (!step.isWaiting && !step.isComplete && !step.isError) {
          scheduleNext(index + 1);
        }
      }, waitTime);
    };
    
    scheduleNext(0);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#0A0A0A', // Deep black
      color: '#F9FAFB', // White text
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden'
    }}>
      <WorkspaceHeader />
      
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <ActivityTimeline />
        
        {currentState === 'stopped' && (
          <div style={{
            margin: '16px 14px',
            padding: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#9CA3AF'
          }}>
            <strong style={{ color: '#E5E7EB', display: 'block', marginBottom: '4px' }}>Stopped</strong>
            The AI operation was cancelled by the user.
          </div>
        )}
      </div>
      
      <div style={{
        padding: '0 14px 14px 14px',
        backgroundColor: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {currentState === 'running' && <RunningIndicator />}
        <PromptComposer onSubmit={handleStartMock} />
      </div>
    </div>
  );
};
