import React, { useState } from 'react';
import { TerminalEvent } from '../../types/aiWorkspace';
import { ChevronRight, ChevronDown, Copy, Square, Terminal, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useThemeStore } from '../../stores/themeStore';
import { useUiStore } from '../../stores/uiStore';

export const TerminalActivity: React.FC<{ event: TerminalEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const updateEvent = useAIWorkspaceStore((s) => s.updateEvent);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

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
            background: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.12)',
            border: 'none',
            color: 'var(--accent, #3B82F6)',
            cursor: 'pointer',
            padding: '1px 5px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
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
      {/* Header matching Image 4: "Ran npm run v" */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          color: isDark ? '#94A3B8' : '#64748B',
          cursor: 'pointer',
          fontWeight: 400,
          userSelect: 'none',
        }}
      >
        <span>
          Ran <strong style={{ color: isDark ? '#FFFFFF' : '#0F172A', fontWeight: 600 }}>{event.command}</strong>
        </span>
        {expanded ? <ChevronDown size={13} color="currentColor" /> : <ChevronRight size={13} color="currentColor" />}
        {event.status === 'running' && (
          <span
            style={{
              width: '6.5px',
              height: '6.5px',
              borderRadius: '50%',
              backgroundColor: '#3B82F6',
              boxShadow: '0 0 6px #3B82F6',
              animation: 'pulse-dot 1.5s infinite',
              display: 'inline-block',
              marginLeft: '2px',
            }}
          />
        )}
      </div>

      {expanded && (
        <div
          style={{
            borderRadius: '8px',
            backgroundColor: isDark ? '#141414' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            marginTop: '2px',
            padding: '12px 14px',
            position: 'relative',
            boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '12px',
          }}
        >
          {/* Top-right subtle actions */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 2,
            }}
          >
            {event.status === 'running' && (
              <button onClick={handleStop} title="Terminate command" style={iconBtnStyle}>
                <Square size={11} fill="#EF4444" color="#EF4444" />
                <span style={{ fontSize: '10.5px', color: '#EF4444' }}>Stop</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                useUiStore.setState({ isTerminalOpen: true });
              }}
              title="Open bottom terminal panel"
              style={iconBtnStyle}
            >
              <Terminal size={11} color="var(--accent, #3B82F6)" />
              <span style={{ fontSize: '10.5px' }}>Terminal</span>
            </button>
            <button onClick={handleCopy} title="Copy output" style={iconBtnStyle}>
              {copied ? <Check size={11} color="#22C55E" /> : <Copy size={11} />}
            </button>
          </div>

          {/* Top prompt line matching Image 4: ~/.../CoreMind-Application $ npm run */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: '#71717A', fontWeight: 500 }}>
              {promptPath} $
            </span>
            <span style={{ color: '#F59E0B', fontWeight: 600 }}>
              {event.command}
            </span>
          </div>

          <div
            style={{
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11.5px',
              lineHeight: '1.5',
              color: isDark ? '#E2E8F0' : '#1E293B',
              backgroundColor: isDark ? '#141414' : '#FFFFFF',
              whiteSpace: 'pre-wrap',
              maxHeight: '260px',
              overflowY: 'auto',
            }}
          >
            {event.output ? (
              renderOutputWithLinks(event.output)
            ) : event.status === 'running' ? (
              <span style={{ opacity: 0.6 }}>Executing command in workspace...</span>
            ) : (
              <span style={{ opacity: 0.6 }}>No output produced.</span>
            )}

            {event.status === 'completed' && (
              <div style={{ marginTop: '8px', color: '#22C55E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} />
                <span>Process exited with code {event.exitCode ?? 0}</span>
              </div>
            )}

            {event.status === 'failed' && (
              <div style={{ marginTop: '8px', color: '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} />
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
