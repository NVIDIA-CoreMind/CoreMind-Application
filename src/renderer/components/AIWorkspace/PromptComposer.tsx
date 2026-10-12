import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Folder,
  FileCode,
  Bot,
} from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useThemeStore } from '../../stores/themeStore';

const BACKEND_MODEL = {
  id: 'nvidia/Nemotron-3_5-Lightning',
  name: 'NVIDIA Nemotron 3.5 Lightning',
  desc: 'CoreMind Backend Model (Nebius Token Factory)',
};

export const PromptComposer: React.FC<{ onSubmit: (prompt: string) => void }> = ({ onSubmit }) => {
  const {
    currentState,
    setSelectedModel,
    agentMode,
    cancelRequest,
    draftPrompt,
    setDraftPrompt,
  } = useAIWorkspaceStore();

  const { rootPath, rootName, activeFileName } = useWorkspaceStore();

  const [input, setInput] = useState('');
  const [includeContext, setIncludeContext] = useState(true);

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isRunning = currentState === 'running' || currentState === 'waiting';

  useEffect(() => {
    if (draftPrompt) {
      setInput(draftPrompt);
      setDraftPrompt('');
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  }, [draftPrompt, setDraftPrompt]);

  useEffect(() => {
    setSelectedModel(BACKEND_MODEL.name);
  }, [setSelectedModel]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isRunning && input.trim()) {
        handleSubmit();
      }
    } else if (e.key === 'Escape' && isRunning) {
      e.preventDefault();
      cancelRequest();
    }
  };

  const handleSubmit = () => {
    if (isRunning || !input.trim()) return;
    const textToSend = input.trim();
    setInput('');
    onSubmit(textToSend);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 220) + 'px';
    }
  }, [input]);

  return (
    <div
      style={{
        backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
        borderRadius: '12px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'border-color 0.2s, background-color 0.2s',
        boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.25)' : '0 4px 14px rgba(0, 0, 0, 0.06)',
        position: 'relative',
      }}
    >
      {/* Context Chips Bar */}
      {includeContext && (rootPath || activeFileName) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            paddingBottom: '4px',
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
          }}
        >
          {rootPath && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                color: 'var(--text-secondary)',
              }}
              title={rootPath}
            >
              <Folder size={11} />
              <span>{rootName || 'workspace'}</span>
            </span>
          )}

          {activeFileName && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent, #3B82F6)',
                fontWeight: 500,
              }}
              title="Active editor file context"
            >
              <FileCode size={11} />
              <span>{activeFileName}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIncludeContext(!includeContext)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '10px',
              marginLeft: 'auto',
              padding: '2px 4px',
            }}
            title="Toggle context attachment"
          >
            {includeContext ? 'Detach' : 'Attach'}
          </button>
        </div>
      )}

      {/* Multiline Prompt Input */}
      <div style={{ display: 'flex', position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={input}
          disabled={isRunning}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRunning
              ? 'Agent is currently executing... Click Stop to cancel.'
              : agentMode === 'agent'
              ? 'Ask CoreMind Agent to implement features, fix bugs, or edit files...'
              : 'Ask a question about your code or codebase (Shift+Enter for newline)...'
          }
          rows={2}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            lineHeight: 1.5,
            resize: 'none',
            maxHeight: '220px',
            opacity: isRunning ? 0.6 : 1,
          }}
        />
      </div>

      {/* Bottom Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '2px',
        }}
      >
        {/* Left: Agent indicator & Model Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Agent Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 600,
            }}
            title="Autonomous multi-step agent"
          >
            <Bot size={12} />
            <span>Agent</span>
          </div>

          {/* Active Backend AI Model */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
            }}
            title={`Backend AI Model: ${BACKEND_MODEL.name} (${BACKEND_MODEL.id})`}
          >
            <span>{BACKEND_MODEL.name}</span>
          </div>
        </div>

        {/* Right: Circular Send / Red Stop Button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isRunning ? (
            <button
              onClick={cancelRequest}
              title="Stop Generation (Esc)"
              aria-label="Stop generation"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(0, 0, 0, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(0, 0, 0, 0.08)';
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2.5px',
                  backgroundColor: '#EF4444',
                }}
              />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              title="Submit prompt (Enter)"
              aria-label="Submit prompt"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                backgroundColor: input.trim()
                  ? '#0078D4'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
                color: input.trim()
                  ? '#FFFFFF'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(0, 0, 0, 0.25)',
                transition: 'all 0.15s ease',
                boxShadow: input.trim() ? '0 1px 4px rgba(0, 120, 212, 0.35)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (input.trim()) {
                  e.currentTarget.style.backgroundColor = '#006CBE';
                }
              }}
              onMouseLeave={(e) => {
                if (input.trim()) {
                  e.currentTarget.style.backgroundColor = '#0078D4';
                }
              }}
            >
              <ArrowRight size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
