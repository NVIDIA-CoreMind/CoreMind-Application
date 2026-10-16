import React, { useState, useEffect, useRef } from 'react';
import { TerminalEvent } from '../../types/aiWorkspace';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

function cleanTerminalOutput(raw: string): string {
  if (!raw) return '';
  // Strip ANSI escape codes
  const noAnsi = raw
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
  // Normalize Windows newlines
  const normalized = noAnsi.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized.trim();
}

export const TerminalActivity: React.FC<{ event: TerminalEvent }> = ({ event }) => {
  const isRunning = event.status === 'running';
  // Auto-open only while currently running; auto-close when finished
  const [expanded, setExpanded] = useState<boolean>(isRunning);
  const [copied, setCopied] = useState<boolean>(false);
  const prevStatusRef = useRef(event.status);
  const outputRef = useRef<HTMLDivElement>(null);

  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  // Auto-close when status finishes ('completed' or 'failed'), auto-open when becomes 'running'
  useEffect(() => {
    if (prevStatusRef.current === 'running' && event.status !== 'running') {
      setExpanded(false);
    } else if (prevStatusRef.current !== 'running' && event.status === 'running') {
      setExpanded(true);
    }
    prevStatusRef.current = event.status;
  }, [event.status]);

  const cleanedOutput = cleanTerminalOutput(event.output || '');

  // Auto-scroll output container to bottom as new stream output arrives
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [cleanedOutput]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullText = `$ ${event.command}\n${event.output || ''}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Derive folder name for prompt ~/…/<folder> $
  const folderName =
    (event.cwd && event.cwd.split('/').filter(Boolean).pop()) ||
    (rootPath && rootPath.split('/').filter(Boolean).pop()) ||
    'CoreMind-AI-Backend';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', margin: '2px 0' }}>
      {/* Header Toggle: Ran <command> v / > */}
      <div
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '13px',
          color: isDark ? '#8c8c8c' : '#64748b',
          cursor: 'pointer',
          fontWeight: 400,
          userSelect: 'none',
          padding: '1px 0',
          width: 'fit-content',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#e4e4e7' : '#18181b')}
        onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#64748b')}
        title={expanded ? 'Click to collapse output' : 'Click to expand output'}
      >
        <span>
          Ran{' '}
          <strong
            style={{
              color: isDark ? '#f4f4f5' : '#18181b',
              fontWeight: 600,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '12.5px',
            }}
          >
            {event.command}
          </strong>
        </span>
        {expanded ? (
          <ChevronDown size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
        ) : (
          <ChevronRight size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
        )}
      </div>

      {/* Terminal Card: Exactly matching Screenshot 1 */}
      {expanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: isDark ? '#141416' : '#ffffff',
            border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
            borderRadius: '8px',
            overflow: 'hidden',
            margin: '4px 0 8px 0',
            width: '100%',
            boxShadow: isDark
              ? '0 1px 3px rgba(0, 0, 0, 0.35)'
              : '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Top: Command Input Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: isDark ? '#18181b' : '#f8fafc',
              borderBottom: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '11.5px',
              lineHeight: 1.45,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px',
                minWidth: 0,
                flex: 1,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              <span
                style={{
                  color: isDark ? '#71717a' : '#64748b',
                  userSelect: 'none',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                ~/…/{folderName} $
              </span>
              <span
                style={{
                  color: isDark ? '#fb923c' : '#ea580c',
                  fontWeight: 500,
                  wordBreak: 'break-word',
                }}
              >
                {event.command}
              </span>
            </div>

            {/* Right Action: Copy (shown when not running) */}
            {!isRunning && (
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '8px', paddingTop: '1px' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isDark ? '#71717a' : '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '3px',
                    transition: 'color 0.15s ease',
                  }}
                  title={copied ? 'Copied' : 'Copy command & output'}
                  onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#e4e4e7' : '#1e293b')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#71717a' : '#94a3b8')}
                >
                  {copied ? <Check size={12} color={tokens.accentSuccess} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>

          {/* Bottom: Command Output Pane */}
          <div
            ref={outputRef}
            style={{
              padding: '10px 12px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '11.5px',
              lineHeight: 1.45,
              color: isDark ? '#e4e4e7' : '#1e293b',
              backgroundColor: isDark ? '#121214' : '#ffffff',
              maxHeight: '260px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {cleanedOutput ? (
              cleanedOutput
            ) : isRunning ? (
              <span style={{ color: isDark ? '#71717a' : '#94a3b8', fontStyle: 'italic' }}>
                Executing command in workspace sandbox...
              </span>
            ) : event.status === 'completed' ? (
              <span style={{ color: isDark ? '#71717a' : '#94a3b8', fontStyle: 'italic' }}>
                Exit code: {event.exitCode ?? 0} (Process exited successfully with no output)
              </span>
            ) : (
              <span style={{ color: tokens.accentError, fontStyle: 'italic' }}>
                Exit code: {event.exitCode ?? 1} (Process exited with error)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
