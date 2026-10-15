import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import {
  X,
  History,
  Plus,
  Bot,
} from 'lucide-react';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { AiSettingsModal } from './AiSettingsModal';
import { getAITheme } from './themeTokens';

export const WorkspaceHeader: React.FC = () => {
  const { toggleRightPanel } = useUiStore();
  const {
    newSession,
    toggleHistory,
    isHistoryOpen,
    isAiSettingsOpen,
    setIsAiSettingsOpen,
  } = useAIWorkspaceStore();

  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: tokens.bgHeader,
          borderBottom: `1px solid ${tokens.border}`,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            height: '38px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {/* Left: Agent Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Bot size={15} style={{ color: tokens.iconPrimary }} />
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: tokens.textPrimary,
                letterSpacing: '-0.01em',
              }}
            >
              CoreMind Agent
            </span>
          </div>

          {/* Right: Functional Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={newSession}
              title="New Task Session"
              style={{
                ...btnStyle,
                color: tokens.textSecondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.bgHover;
                e.currentTarget.style.color = tokens.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = tokens.textSecondary;
              }}
            >
              <Plus size={14} />
            </button>

            <button
              onClick={toggleHistory}
              title="Past Sessions"
              style={{
                ...btnStyle,
                color: isHistoryOpen
                  ? tokens.textPrimary
                  : tokens.textSecondary,
                backgroundColor: isHistoryOpen
                  ? tokens.bgHover
                  : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isHistoryOpen) {
                  e.currentTarget.style.backgroundColor = tokens.bgHover;
                  e.currentTarget.style.color = tokens.textPrimary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isHistoryOpen) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = tokens.textSecondary;
                }
              }}
            >
              <History size={13} />
            </button>

            <button
              onClick={toggleRightPanel}
              title="Close Workspace"
              style={{
                ...btnStyle,
                color: tokens.textSecondary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.bgHover;
                e.currentTarget.style.color = tokens.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = tokens.textSecondary;
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <AiSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
      />
    </>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '5px',
  borderRadius: '5px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease, color 0.15s ease',
};
