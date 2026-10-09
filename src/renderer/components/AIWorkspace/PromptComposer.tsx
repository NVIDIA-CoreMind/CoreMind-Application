import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Square,
  ChevronDown,
  Check,
  Folder,
  FileCode,
  Bot,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useThemeStore } from '../../stores/themeStore';

const AVAILABLE_MODELS = [
  { id: 'Nemotron-3-Ultra', name: 'Nemotron-3-Ultra', desc: 'Fast, high-reasoning coding agent' },
  { id: 'Gemini 3.8 Flash', name: 'Gemini 3.8 Flash', desc: 'Low-latency multimodal model' },
  { id: 'Claude 3.5 Sonnet', name: 'Claude 3.5 Sonnet', desc: 'Advanced reasoning & code synthesis' },
  { id: 'GPT-4o', name: 'GPT-4o', desc: 'Omni software engineering model' },
  { id: 'Meta Llama 3.1 70B', name: 'Meta Llama 3.1 70B', desc: 'Open-weights high-performance coding' },
];

export const PromptComposer: React.FC<{ onSubmit: (prompt: string) => void }> = ({ onSubmit }) => {
  const {
    currentState,
    selectedModel,
    setSelectedModel,
    agentMode,
    setAgentMode,
    cancelRequest,
    draftPrompt,
    setDraftPrompt,
  } = useAIWorkspaceStore();

  const { rootPath, rootName, activeFileName } = useWorkspaceStore();

  const [input, setInput] = useState('');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const isRunning = currentState === 'running' || currentState === 'waiting';

  useEffect(() => {
    if (draftPrompt) {
      setInput(draftPrompt);
      setDraftPrompt('');
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  }, [draftPrompt, setDraftPrompt]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    if (isModelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelMenuOpen]);

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

  const handleSelectModel = (modelName: string) => {
    setSelectedModel(modelName);
    setIsModelMenuOpen(false);
  };

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
        {/* Left: Mode selector & Model Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Mode toggle */}
          <div
            style={{
              display: 'inline-flex',
              padding: '2px',
              borderRadius: '6px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
            }}
          >
            <button
              onClick={() => setAgentMode('agent')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 7px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: agentMode === 'agent' ? 600 : 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: agentMode === 'agent' ? (isDark ? '#2E2E2E' : '#FFFFFF') : 'transparent',
                color: agentMode === 'agent' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              title="Autonomous multi-step agent"
            >
              <Bot size={12} />
              <span>Agent</span>
            </button>
            <button
              onClick={() => setAgentMode('chat')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 7px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: agentMode === 'chat' ? 600 : 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: agentMode === 'chat' ? (isDark ? '#2E2E2E' : '#FFFFFF') : 'transparent',
                color: agentMode === 'chat' ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              title="Fast conversational assistant"
            >
              <MessageSquare size={12} />
              <span>Chat</span>
            </button>
          </div>

          {/* Model Selector Dropdown */}
          <div style={{ position: 'relative' }} ref={modelMenuRef}>
            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="Select AI Model"
            >
              <Sparkles size={11} color="var(--accent)" />
              <span>{selectedModel}</span>
              <ChevronDown size={11} />
            </button>

            {isModelMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '6px',
                  width: '240px',
                  backgroundColor: isDark ? '#222222' : '#FFFFFF',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '4px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                  zIndex: 100,
                }}
              >
                {AVAILABLE_MODELS.map((m) => {
                  const isSelected = selectedModel === m.name || selectedModel === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectModel(m.name)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isSelected ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF') : 'transparent',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{m.desc}</div>
                      </div>
                      {isSelected && <Check size={13} color="var(--accent)" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Send / Red Stop Button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isRunning ? (
            <button
              onClick={cancelRequest}
              title="Stop Generation (Esc)"
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
              }}
            >
              <Square size={11} fill="currentColor" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              title="Submit prompt (Enter)"
              style={{
                height: '28px',
                minWidth: '28px',
                padding: '0 10px',
                borderRadius: '7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                backgroundColor: input.trim()
                  ? 'var(--accent, #3B82F6)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
                color: input.trim() ? '#FFFFFF' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
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
