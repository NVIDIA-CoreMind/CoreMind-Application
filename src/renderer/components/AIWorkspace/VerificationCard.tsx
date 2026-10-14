import React, { useState } from 'react';
import { TestEvent } from '../../types/aiWorkspace';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { getAITheme } from './themeTokens';
import { AICodeBlock } from './AICodeBlock';

interface VerificationCardProps {
  event: TestEvent;
}

export const VerificationCard: React.FC<VerificationCardProps> = ({ event }) => {
  const [expanded, setExpanded] = useState(true);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  const isPassed = event.status === 'passed';
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

  return (
    <div
      style={{
        borderRadius: '6px',
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.bgPanel,
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
          backgroundColor: tokens.bgCard,
          borderBottom: expanded
            ? `1px solid ${tokens.borderSubtle}`
            : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {isRunning ? (
            <Loader2 size={14} className="animate-spin" color={tokens.accentRunning} />
          ) : isPassed ? (
            <ShieldCheck size={14} color={tokens.accentSuccess} />
          ) : (
            <ShieldAlert size={14} color={tokens.accentError} />
          )}

          <span style={{ fontSize: '12px', fontWeight: 600, color: tokens.textPrimary }}>
            {event.testName || `Verification ${event.attempt ? `(Attempt ${event.attempt})` : ''}`}
          </span>

          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              textTransform: 'uppercase',
              backgroundColor: tokens.bgPanel,
              border: `1px solid ${tokens.border}`,
              color: isPassed ? tokens.accentSuccess : isRunning ? tokens.accentRunning : tokens.accentError,
            }}
          >
            {event.status}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {event.durationMs !== undefined && (
            <span style={{ fontSize: '11px', color: tokens.textMuted, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
              {event.durationMs}ms
            </span>
          )}
          <span style={{ color: tokens.iconPrimary }}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        </div>
      </div>

      {/* Expanded Logs & Errors matching reference screenshot */}
      {expanded && (
        <div style={{ padding: '8px 12px', fontSize: '12px' }}>
          {event.location && (
            <div style={{ marginBottom: '6px' }}>
              <button
                onClick={() => handleOpenFile(event.location!.file)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: tokens.textSecondary,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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

          {(event.command || event.error) && (
            <AICodeBlock
              language="bash"
              value={[
                event.command || '',
                event.error
                  ? event.error
                  : isPassed
                  ? `# Exit code: 0 (No type/lint errors)`
                  : '',
              ]
                .filter(Boolean)
                .join('\n')}
              enableOpenFile={true}
              maxHeight="280px"
              isDark={isDark}
            />
          )}

          {isPassed && !event.command && (
            <div style={{ color: tokens.accentSuccess, fontWeight: 500, fontSize: '12px', padding: '4px 0' }}>
              All tests and verification criteria passed successfully.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
