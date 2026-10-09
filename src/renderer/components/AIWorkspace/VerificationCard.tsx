import React, { useState } from 'react';
import { TestEvent } from '../../types/aiWorkspace';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useThemeStore } from '../../stores/themeStore';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Terminal,
} from 'lucide-react';

interface VerificationCardProps {
  event: TestEvent;
}

export const VerificationCard: React.FC<VerificationCardProps> = ({ event }) => {
  const [expanded, setExpanded] = useState(true);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const isPassed = event.status === 'passed';
  const isFailed = event.status === 'failed';
  const isRunning = event.status === 'running';

  // Helper to open a file when clicked from error location
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

  // Find file and line references in error text
  // Matches patterns like `src/foo/bar.ts:12:5` or `lib/main.dart:42`
  const renderErrorWithLinks = (text: string) => {
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
            background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
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

  const statusColor = isPassed ? '#22C55E' : isFailed ? '#EF4444' : 'var(--accent, #3B82F6)';

  return (
    <div
      style={{
        borderRadius: '8px',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'}`,
        backgroundColor: isDark ? '#181818' : '#FFFFFF',
        overflow: 'hidden',
        margin: '6px 0',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
          borderBottom: expanded
            ? isDark
              ? '1px solid rgba(255, 255, 255, 0.06)'
              : '1px solid #E2E8F0'
            : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {isRunning ? (
            <Loader2 size={15} color="var(--accent)" className="animate-spin" />
          ) : isPassed ? (
            <ShieldCheck size={16} color="#22C55E" />
          ) : (
            <ShieldAlert size={16} color="#EF4444" />
          )}

          <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
            {event.testName || `Verification ${event.attempt ? `(Attempt ${event.attempt})` : ''}`}
          </span>

          <span
            style={{
              fontSize: '10.5px',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              textTransform: 'uppercase',
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {event.status}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {event.durationMs !== undefined && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {event.durationMs}ms
            </span>
          )}
          <span style={{ color: 'var(--text-secondary)' }}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        </div>
      </div>

      {/* Expanded Logs & Errors */}
      {expanded && (
        <div style={{ padding: '10px 12px', fontSize: '12px' }}>
          {event.command && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            >
              <Terminal size={12} />
              <span>$ {event.command}</span>
            </div>
          )}

          {event.location && (
            <div style={{ marginBottom: '8px' }}>
              <button
                onClick={() => handleOpenFile(event.location!.file)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                <span>
                  {event.location.file}
                  {event.location.line ? `:${event.location.line}` : ''}
                </span>
                <ExternalLink size={11} />
              </button>
            </div>
          )}

          {event.error && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: isDark ? '#FCA5A5' : '#B91C1C',
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              {renderErrorWithLinks(event.error)}
            </div>
          )}

          {isPassed && (
            <div style={{ color: '#22C55E', fontWeight: 500, fontSize: '12px' }}>
              All tests and verification criteria passed successfully.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
