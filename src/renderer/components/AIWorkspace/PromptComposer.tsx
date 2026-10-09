import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Plus, ArrowRight, Square, ChevronDown, Check, Folder, FileCode, Sparkles } from 'lucide-react';
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

  // Sync draftPrompt with input when it changes
  useEffect(() => {
    if (draftPrompt) {
      setInput(draftPrompt);
      setDraftPrompt('');
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  }, [draftPrompt, setDraftPrompt]);

  // Close model menu on outside click
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
        backgroundColor: isDark ? '#1C1C1C' : '#ffffff',
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
                padding: '2px 7px',
                borderRadius: '6px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
              title={rootPath}
            >
              <Folder size={11} color="#60A5FA" />
              {rootName || 'Workspace'}
            </span>
          )}

          {activeFileName && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '6px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
              title={activeFileName}
            >
              <FileCode size={11} color="#A78BFA" />
              {activeFileName}
            </span>
          )}
        </div>
      )}

      {/* Main Multiline Input */}
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Ask anything... e.g. Create a Flutter login page with validation and run tests"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          resize: 'none',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontFamily: 'inherit',
          padding: 0,
          maxHeight: '220px',
          overflowY: 'auto',
          lineHeight: 1.5,
        }}
      />

      {/* Controls Bar: Context Toggle, Model Selector, Send / Stop Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIncludeContext((prev) => !prev)}
            style={{
              ...actionBtnStyle,
              backgroundColor: includeContext ? (isDark ? 'rgba(255, 255, 255, 0.08)' : '#EFF6FF') : 'transparent',
              color: includeContext ? 'var(--accent)' : 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '4px 6px',
              fontSize: '11px',
              display: 'flex',
              gap: '4px',
            }}
            title={includeContext ? 'Context attached (click to toggle)' : 'Attach workspace context'}
          >
            <Plus size={13} />
            <span>Context</span>
          </button>

          {/* Model Selector Dropdown Trigger */}
          <div style={{ position: 'relative' }} ref={modelMenuRef}>
            <button
              onClick={() => setIsModelMenuOpen((prev) => !prev)}
              style={{
                ...actionBtnStyle,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'}`,
                color: 'var(--text-primary)',
                fontWeight: 500,
              }}
              title="Select AI Model"
            >
              <Sparkles size={11} color="var(--accent)" />
              <span>{selectedModel}</span>
              <ChevronDown size={11} color="var(--text-muted)" />
            </button>

            {/* Model Selector Popup Menu */}
            {isModelMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '32px',
                  left: 0,
                  width: '240px',
                  backgroundColor: isDark ? '#232323' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0'}`,
                  borderRadius: '10px',
                  padding: '6px',
                  boxShadow: isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.12)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Configured AI Models
                </div>
                {AVAILABLE_MODELS.map((m) => {
                  const isSelected = selectedModel === m.name;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectModel(m.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255, 255, 255, 0.08)' : '#EFF6FF')
                          : 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 400 }}>
                          {m.name}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {m.desc}
                        </span>
                      </div>
                      {isSelected && <Check size={14} color="var(--accent)" style={{ marginTop: '2px' }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Send / Stop Buttons */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isRunning ? (
            <button
              onClick={cancelRequest}
              title="Stop (Esc)"
              style={{
                ...primaryBtnStyle,
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
              }}
            >
              <Square size={10} fill="currentColor" style={{ marginRight: '5px' }} />
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
                backgroundColor: input.trim()
                  ? 'var(--accent)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)',
                color: input.trim() ? '#FFFFFF' : 'var(--text-muted)',
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
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'background-color 0.15s, color 0.15s',
};

const primaryBtnStyle = {
  height: '28px',
  minWidth: '28px',
  padding: '0 10px',
  borderRadius: '7px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
  transition: 'all 0.2s ease',
};
