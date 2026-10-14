import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import {
  ArrowRight,
  FileCode,
  FileText,
  Terminal,
  Image as ImageIcon,
  Globe,
  Plus,
  Mic,
  ChevronDown,
} from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

const BACKEND_MODEL = {
  id: 'nvidia/Nemotron-3_5-Lightning',
  name: 'NVIDIA Nemotron 3.5 Lightning',
  desc: 'CoreMind Backend Model (Nebius Token Factory)',
};

export const PromptComposer: React.FC<{ onSubmit: (prompt: string) => void }> = ({ onSubmit }) => {
  const currentState = useAIWorkspaceStore((s) => s.currentState);
  const setSelectedModel = useAIWorkspaceStore((s) => s.setSelectedModel);
  const cancelRequest = useAIWorkspaceStore((s) => s.cancelRequest);
  const draftPrompt = useAIWorkspaceStore((s) => s.draftPrompt);
  const setDraftPrompt = useAIWorkspaceStore((s) => s.setDraftPrompt);

  const activeFileName = useWorkspaceStore((s) => s.activeFileName);

  const [input, setInput] = useState('');
  const [includeContext, setIncludeContext] = useState(true);

  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isRunning =
    currentState === 'running' ||
    currentState === 'waiting' ||
    currentState === 'thinking' ||
    currentState === 'inspecting' ||
    currentState === 'editing' ||
    currentState === 'running_command' ||
    currentState === 'testing';

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
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
      {/* Top Context Attachment Bar (Antigravity Style) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            title="Attach file (@)"
            onClick={() => {
              setInput((prev) => (prev ? prev + ' @' : '@'));
              textareaRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#8c8c8c' : '#6b7280',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#6b7280')}
          >
            <FileText size={14} />
          </button>

          <button
            type="button"
            title="Attach terminal context"
            onClick={() => {
              setInput((prev) => (prev ? prev + ' #terminal ' : '#terminal '));
              textareaRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#8c8c8c' : '#6b7280',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#6b7280')}
          >
            <Terminal size={14} />
          </button>

          <button
            type="button"
            title="Attach image or screenshot"
            onClick={() => {
              setInput((prev) => (prev ? prev + ' [image] ' : '[image] '));
              textareaRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#8c8c8c' : '#6b7280',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#6b7280')}
          >
            <ImageIcon size={14} />
          </button>

          <button
            type="button"
            title="Web & documentation context"
            onClick={() => {
              setInput((prev) => (prev ? prev + ' [web] ' : '[web] '));
              textareaRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#8c8c8c' : '#6b7280',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#6b7280')}
          >
            <Globe size={14} />
          </button>
        </div>

        {/* Right side of context bar: Active file badge if present */}
        {includeContext && activeFileName && (
          <span
            onClick={() => setIncludeContext(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '4px',
              backgroundColor: tokens.bgCard,
              border: `1px solid ${tokens.border}`,
              color: tokens.textSecondary,
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
            title={`Active file context: ${activeFileName} (Click to detach)`}
          >
            <FileCode size={11} color="currentColor" />
            <span>{activeFileName}</span>
          </span>
        )}
      </div>

      {/* Main Composer Box */}
      <div
        style={{
          backgroundColor: isDark ? '#222222' : '#ffffff',
          border: `1px solid ${isDark ? '#333333' : '#e2e8f0'}`,
          borderRadius: '16px',
          padding: '12px 14px 10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          transition: 'border-color 0.2s, background-color 0.2s',
          boxShadow: isDark ? '0 2px 10px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={input}
            disabled={isRunning}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRunning
                ? 'Executing request... Click Stop to cancel.'
                : 'Ask anything, @ to mention, / for actions'
            }
            rows={2}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: isDark ? '#f4f4f5' : '#111827',
              fontFamily: 'var(--font-sans)',
              fontSize: '13.5px',
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
          {/* Left: Plus Add Context & Model Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={isRunning}
              title="Add context (@)"
              onClick={() => {
                setInput((prev) => (prev ? prev + ' @' : '@'));
                textareaRef.current?.focus();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#a1a1aa' : '#6b7280',
                cursor: isRunning ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
              onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#a1a1aa' : '#6b7280')}
            >
              <Plus size={15} />
            </button>

            {/* Model Pill: NVIDIA Nemotron 3.5 Lightning with Chevron */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: isDark ? '#2a2a2a' : '#f3f4f6',
                border: `1px solid ${isDark ? '#383838' : '#e5e7eb'}`,
                color: isDark ? '#e5e5e5' : '#374151',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
                userSelect: 'none',
              }}
              title={`Active Model: ${BACKEND_MODEL.name}`}
            >
              <span>{BACKEND_MODEL.name}</span>
              <ChevronDown size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
            </div>
          </div>

          {/* Right: Microphone & Circular Submit Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              title="Voice input"
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#8c8c8c' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
              onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#6b7280')}
            >
              <Mic size={15} />
            </button>

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
                  border: `1px solid ${tokens.border}`,
                  cursor: 'pointer',
                  backgroundColor: tokens.bgCard,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.bgHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.bgCard;
                }}
              >
                <div
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '2px',
                    backgroundColor: tokens.textPrimary,
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
                    ? (isDark ? '#38bdf8' : '#2563eb')
                    : (isDark ? '#333333' : '#e5e7eb'),
                  color: input.trim()
                    ? '#ffffff'
                    : (isDark ? '#71717a' : '#9ca3af'),
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowRight size={14} strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
