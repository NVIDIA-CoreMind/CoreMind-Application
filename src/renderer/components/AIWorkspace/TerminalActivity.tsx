import React, { useState } from 'react';
import { TerminalEvent } from '../../types/aiWorkspace';
import { ChevronRight, ChevronDown, Copy, Square, Terminal, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useThemeStore } from '../../stores/themeStore';
import { useUiStore } from '../../stores/uiStore';
import { getAITheme } from './themeTokens';

export const TerminalActivity: React.FC<{ event: TerminalEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const updateEvent = useAIWorkspaceStore((s) => s.updateEvent);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tokens = getAITheme(isDark);

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.status === 'running') {
      updateEvent(event.id, {
        status: 'failed',
        output: (event.output || '') + '\n^C (Process terminated by user)',
      });
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.output) {
      navigator.clipboard.writeText(event.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenFile = async (fileRef: string) => {
    if (!rootPath) return;
    const cleanPath = fileRef.replace(/^\/+/, '').trim();
    const fullPath = fileRef.startsWith('/') ? fileRef : `${rootPath}/${cleanPath}`;
    const fileName = cleanPath.split('/').pop() || cleanPath;
    try {
      await openFile(fullPath, fileName, rootPath);
    } catch (err) {
      console.warn('Failed to open error file in editor:', err);
    }
  };

  // Find file:line references in terminal error outputs
  const renderOutputWithLinks = (text: string) => {
    const fileLocRegex = /(?:([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = fileLocRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const fullRef = match[0];
      const filePath = match[1];
      const lineNum = match[2];

      parts.push(
        <button
          key={`${match.index}-${fullRef}`}
          onClick={() => handleOpenFile(filePath)}
          style={{
            background: tokens.bgCard,
            border: `1px solid ${tokens.border}`,
            color: tokens.textPrimary,
            cursor: 'pointer',
            padding: '1px 5px',
            borderRadius: '4px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '11px',
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
          }}
          title={`Open ${filePath} line ${lineNum}`}
        >
          <span>{fullRef}</span>
          <ExternalLink size={10} />
        </button>
      );
      lastIndex = fileLocRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  const folderName = rootPath ? rootPath.split('/').filter(Boolean).pop() || 'CoreMind-Application' : 'CoreMind-Application';
  const promptPath = `~/.../${folderName}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
      {/* Header: "Ran npm run v" */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          color: tokens.textSecondary,
          cursor: 'pointer',
          fontWeight: 400,
          userSelect: 'none',
        }}
      >
        <span>
          Ran <strong style={{ color: tokens.textPrimary, fontWeight: 600 }}>{event.command}</strong>
        </span>
        {expanded ? <ChevronDown size={13} color="currentColor" /> : <ChevronRight size={13} color="currentColor" />}
        {event.status === 'running' && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: tokens.accentRunning,
              opacity: 0.85,
              animation: 'pulse-dot 1.5s infinite ease-in-out',
              display: 'inline-block',
              marginLeft: '2px',
            }}
          />
        )}
      </div>

      {expanded && (
        <div
          style={{
            borderRadius: '6px',
            backgroundColor: tokens.bgPanel,
            border: `1px solid ${tokens.border}`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            marginTop: '2px',
            padding: '10px 12px',
            position: 'relative',
            boxShadow: 'none',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '12px',
          }}
        >
          {/* Header row with badge and actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              paddingBottom: '6px',
              borderBottom: `1px solid ${tokens.borderSubtle}`,
            }}
          >
            {/* Agent execution badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: tokens.bgCard,
                  color: tokens.textSecondary,
                  border: `1px solid ${tokens.border}`,
                }}
                title="Agent-managed execution stream"
              >
                Agent Execution Stream
              </span>
              {typeof event.durationMs === 'number' && event.durationMs > 0 && (
                <span style={{ fontSize: '10.5px', color: tokens.textMuted }}>
                  {event.durationMs < 1000 ? `${event.durationMs}ms` : `${(event.durationMs / 1000).toFixed(1)}s`}
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {event.status === 'running' && (
                <button
                  onClick={handleStop}
                  title="Terminate command"
                  style={{
                    ...iconBtnStyle,
                    color: tokens.textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Square size={10} fill="currentColor" color="currentColor" />
                  <span style={{ fontSize: '10.5px', marginLeft: '3px', fontWeight: 500 }}>Stop</span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  useUiStore.setState({ isTerminalOpen: true });
                }}
                title="Open user interactive terminal"
                style={{
                  ...iconBtnStyle,
                  color: tokens.textSecondary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = tokens.textPrimary;
                  e.currentTarget.style.backgroundColor = tokens.bgHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = tokens.textSecondary;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Terminal size={11} color="currentColor" />
                <span style={{ fontSize: '10.5px', marginLeft: '3px' }}>Workbench Terminal</span>
              </button>
              <button
                onClick={handleCopy}
                title="Copy command output"
                style={{
                  ...iconBtnStyle,
                  color: tokens.textSecondary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = tokens.textPrimary;
                  e.currentTarget.style.backgroundColor = tokens.bgHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = tokens.textSecondary;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {copied ? <Check size={11} color={tokens.accentSuccess} /> : <Copy size={11} color="currentColor" />}
              </button>
            </div>
          </div>

          {/* Prompt line: ~/.../CoreMind-Application $ npm run ... */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: tokens.textMuted, fontWeight: 500 }}>
              {promptPath} $
            </span>
            <span style={{ color: tokens.textPrimary, fontWeight: 600 }}>
              {event.command}
            </span>
          </div>

          <div
            style={{
              padding: '8px 10px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '11.5px',
              lineHeight: '1.5',
              color: tokens.textPrimary,
              backgroundColor: tokens.bgTerminal,
              borderRadius: '5px',
              whiteSpace: 'pre-wrap',
              maxHeight: '260px',
              overflowY: 'auto',
              border: `1px solid ${tokens.borderSubtle}`,
            }}
          >
            {event.output ? (
              renderOutputWithLinks(event.output)
            ) : event.status === 'running' ? (
              <span style={{ color: tokens.textMuted }}>Executing command in workspace sandbox...</span>
            ) : (
              <span style={{ color: tokens.textMuted }}>Process exited with no standard output.</span>
            )}

            {event.status === 'completed' && (
              <div style={{ marginTop: '8px', color: tokens.accentSuccess, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <Check size={12} color="currentColor" />
                <span>Process exited with code {event.exitCode ?? 0}</span>
              </div>
            )}

            {event.status === 'failed' && (
              <div style={{ marginTop: '8px', color: tokens.accentError, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <AlertCircle size={12} color="currentColor" />
                <span>Process exited with error (code {event.exitCode ?? 1})</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
};
