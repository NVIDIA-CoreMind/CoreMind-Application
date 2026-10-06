import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Plus, ArrowRight, Square, ChevronDown } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';

export const PromptComposer: React.FC<{ onSubmit: (prompt: string) => void }> = ({ onSubmit }) => {
  const [input, setInput] = useState('');
  const { currentState, selectedModel, cancelRequest } = useAIWorkspaceStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const isRunning = currentState === 'running' || currentState === 'waiting';

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isRunning && input.trim()) {
        onSubmit(input);
        setInput('');
      }
    } else if (e.key === 'Escape' && isRunning) {
      e.preventDefault();
      cancelRequest();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  return (
    <div style={{
      backgroundColor: '#1C1C1C',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      transition: 'border-color 0.2s',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    }}>
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Ask anything..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          resize: 'none',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#E5E7EB',
          fontSize: '13px',
          fontFamily: 'inherit',
          padding: 0,
          maxHeight: '200px',
          overflowY: 'auto'
        }}
      />
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button style={actionBtnStyle} title="Add Context">
            <Plus size={15} />
          </button>
          
          <button style={{
            ...actionBtnStyle,
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 6px',
            borderRadius: '6px',
            color: '#D1D5DB'
          }} title="Select Model">
            <span>{selectedModel}</span>
            <ChevronDown size={12} color="#9CA3AF" />
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isRunning ? (
            <button
              onClick={cancelRequest}
              title="Stop (Esc)"
              style={{
                ...primaryBtnStyle,
                backgroundColor: '#DC2626', // Red for stop
                color: '#FFFFFF'
              }}
            >
              <Square size={10} fill="currentColor" style={{ marginRight: '4px' }} />
              Stop
            </button>
          ) : (
            <button
              onClick={() => {
                if (input.trim()) {
                  onSubmit(input);
                  setInput('');
                }
              }}
              title="Send (Enter)"
              style={{
                ...primaryBtnStyle,
                backgroundColor: input.trim() ? '#E5E7EB' : 'rgba(255, 255, 255, 0.1)',
                color: input.trim() ? '#111827' : '#6B7280',
                cursor: input.trim() ? 'pointer' : 'default',
              }}
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const actionBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#9CA3AF',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'background-color 0.1s'
};

const primaryBtnStyle = {
  height: '26px',
  minWidth: '26px',
  padding: '0 8px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  transition: 'all 0.2s'
};
