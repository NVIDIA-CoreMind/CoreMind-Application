import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Folder,
  FileCode,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useThemeStore } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

const BACKEND_MODEL = {
  id: 'nvidia/Nemotron-3_5-Lightning',
  name: 'NVIDIA Nemotron 3.5 Lightning',
  desc: 'CoreMind Backend Model (Nebius Token Factory)',
};

export const PromptComposer: React.FC<{ onSubmit: (prompt: string) => void }> = ({ onSubmit }) => {
  const currentState = useAIWorkspaceStore((s) => s.currentState);
  const setSelectedModel = useAIWorkspaceStore((s) => s.setSelectedModel);
  const agentMode = useAIWorkspaceStore((s) => s.agentMode);
  const setAgentMode = useAIWorkspaceStore((s) => s.setAgentMode);
  const cancelRequest = useAIWorkspaceStore((s) => s.cancelRequest);
  const draftPrompt = useAIWorkspaceStore((s) => s.draftPrompt);
  const setDraftPrompt = useAIWorkspaceStore((s) => s.setDraftPrompt);

  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const rootName = useWorkspaceStore((s) => s.rootName);
  const activeFileName = useWorkspaceStore((s) => s.activeFileName);

  const [input, setInput] = useState('');
  const [includeContext, setIncludeContext] = useState(true);

  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
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
    <div
      style={{
        backgroundColor: tokens.bgPanel,
        border: `1px solid ${tokens.border}`,
        borderRadius: '8px',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'border-color 0.2s, background-color 0.2s',
        boxShadow: 'none',
        position: 'relative',
      }}
    >
      {/* Top Row: Workspace Selector & Detach Control */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '4px',
              backgroundColor: tokens.bgCard,
              border: `1px solid ${tokens.border}`,
              color: tokens.textSecondary,
              userSelect: 'none',
            }}
            title={rootPath || 'Workspace'}
          >
            <Folder size={11} color="currentColor" />
            <span style={{ fontWeight: 500 }}>{rootName || 'CoreMind'}</span>
          </span>

          {includeContext && activeFileName && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '4px',
                backgroundColor: tokens.bgCard,
                border: `1px solid ${tokens.border}`,
                color: tokens.textPrimary,
                fontWeight: 500,
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title="Active editor file context"
            >
              <FileCode size={11} color="currentColor" />
              <span>{activeFileName}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIncludeContext(!includeContext)}
          style={{
            background: 'transparent',
            border: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
            fontSize: '11px',
            padding: '2px 4px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.textMuted;
          }}
          title={includeContext ? 'Detach file context' : 'Attach file context'}
        >
          {includeContext ? 'Detach' : 'Attach'}
        </button>
      </div>

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
              ? 'Executing request... Click Stop to cancel.'
              : agentMode === 'agent'
              ? 'Ask CoreMind Agent to implement features, fix bugs, or edit files...'
              : 'Ask a friendly question or chat with CoreMind AI (Shift+Enter for newline)...'
          }
          rows={2}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: tokens.textPrimary,
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
          {/* Mode Switcher: Agent vs Friendly Chat */}
          <button
            type="button"
            disabled={isRunning}
            onClick={() => setAgentMode(agentMode === 'agent' ? 'chat' : 'agent')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: tokens.bgCard,
              border: `1px solid ${tokens.border}`,
              color: tokens.textPrimary,
              fontSize: '11px',
              fontWeight: 500,
              cursor: isRunning ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={
              agentMode === 'agent'
                ? 'Current: Agent Mode (Click to switch to Friendly Chat)'
                : 'Current: Friendly Chat (Click to switch to Agent Mode)'
            }
          >
            {agentMode === 'agent' ? (
              <>
                <Bot size={12} color="currentColor" />
                <span>Agent</span>
              </>
            ) : (
              <>
                <MessageSquare size={12} color="currentColor" />
                <span>Friendly Chat</span>
              </>
            )}
          </button>

          {/* Active Backend AI Model - Neutral gray pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: tokens.bgCard,
              border: `1px solid ${tokens.border}`,
              color: tokens.textSecondary,
              fontSize: '11px',
              fontWeight: 500,
            }}
            title={`Backend AI Model: ${BACKEND_MODEL.name} (${BACKEND_MODEL.id})`}
          >
            <span>{BACKEND_MODEL.name}</span>
          </div>
        </div>

        {/* Right: Circular Send / Stop Button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isRunning ? (
            <button
              onClick={cancelRequest}
              title="Stop Generation (Esc)"
              aria-label="Stop generation"
              style={{
                width: '26px',
                height: '26px',
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
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: input.trim() ? `1px solid ${isDark ? '#4A4D53' : '#D0D3D8'}` : `1px solid ${tokens.border}`,
                cursor: input.trim() ? 'pointer' : 'default',
                backgroundColor: input.trim()
                  ? tokens.bgActiveTab
                  : tokens.bgCard,
                color: input.trim()
                  ? tokens.textPrimary
                  : tokens.textMuted,
                transition: 'all 0.15s ease',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                if (input.trim()) {
                  e.currentTarget.style.backgroundColor = tokens.bgHover;
                }
              }}
              onMouseLeave={(e) => {
                if (input.trim()) {
                  e.currentTarget.style.backgroundColor = tokens.bgActiveTab;
                }
              }}
            >
              <ArrowRight size={13} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
