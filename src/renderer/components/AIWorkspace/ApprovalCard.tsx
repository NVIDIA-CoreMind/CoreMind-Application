import React, { useState, useMemo } from 'react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useThemeStore } from '../../stores/themeStore';
import {
  ShieldAlert,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Terminal,
  Clock,
  Copy,
  FileCode,
  Loader2,
  Code2,
} from 'lucide-react';
import { getAITheme } from './themeTokens';

export const ApprovalCard: React.FC = () => {
  const pendingApproval = useAIWorkspaceStore((s) => s.pendingApproval);
  const approveAction = useAIWorkspaceStore((s) => s.approveAction);
  const denyAction = useAIWorkspaceStore((s) => s.denyAction);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tokens = getAITheme(isDark);

  const [denyReason, setDenyReason] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Extract common action arguments for concise display
  const args = useMemo(() => pendingApproval?.args || {}, [pendingApproval?.args]);
  const toolName = pendingApproval?.tool || 'unknown';

  const command = useMemo(() => {
    if (typeof args === 'string') return args;
    if (args.command && typeof args.command === 'string') return args.command;
    if (args.cmd && typeof args.cmd === 'string') return args.cmd;
    return null;
  }, [args]);

  const targetFile = useMemo(() => {
    if (args.file_path && typeof args.file_path === 'string') return args.file_path;
    if (args.path && typeof args.path === 'string') return args.path;
    if (args.file && typeof args.file === 'string') return args.file;
    if (args.target_file && typeof args.target_file === 'string') return args.target_file;
    return null;
  }, [args]);

  const timeoutDisplay = useMemo(() => {
    const raw = args.timeout_ms ?? args.timeout;
    if (typeof raw === 'number') {
      return raw >= 1000 ? `${(raw / 1000).toFixed(raw % 1000 === 0 ? 0 : 1)}s` : `${raw}ms`;
    }
    return null;
  }, [args]);

  // Clean human-friendly description without raw JSON dump
  const descriptionText = useMemo(() => {
    const desc = pendingApproval?.description || '';
    // If backend generated raw "Execute ... with args: {...}", replace with clean prompt
    if (desc.includes('with args:') || desc.includes('{')) {
      if (command) {
        return 'The agent requests permission to execute a terminal command:';
      }
      if (targetFile) {
        return `The agent requests permission to modify ${targetFile}:`;
      }
      return `The agent requests permission to run ${toolName}:`;
    }
    return desc || `The agent requests permission to run ${toolName}.`;
  }, [pendingApproval?.description, command, targetFile, toolName]);

  const jsonPayloadString = useMemo(() => {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  }, [args]);

  const paramCount = useMemo(() => Object.keys(args).length, [args]);

  if (!pendingApproval) return null;

  const handleApprove = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await approveAction();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await denyAction(denyReason.trim() || undefined);
    } finally {
      setIsSubmitting(false);
      setShowDenyInput(false);
      setDenyReason('');
    }
  };

  const handleCopyCommand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (command) {
      navigator.clipboard.writeText(command);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 1800);
    }
  };

  const handleCopyJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(jsonPayloadString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1800);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="approval-card-title"
      style={{
        margin: '10px 0',
        borderRadius: '10px',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.12)'}`,
        backgroundColor: isDark ? '#1E1F22' : '#FFFFFF',
        color: tokens.textPrimary,
        boxShadow: isDark
          ? '0 4px 16px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.2)'
          : '0 4px 12px rgba(0, 0, 0, 0.08)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 1. Top Header Row: Minimalist icon, Title & Metadata Badges */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
          backgroundColor: isDark ? '#232528' : '#F8F9FA',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(217, 119, 6, 0.12)',
              color: isDark ? '#FBBF24' : '#D97706',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={14} strokeWidth={2.2} />
          </div>
          <span
            id="approval-card-title"
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: tokens.textPrimary,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            Action Approval Required
          </span>
        </div>

        {/* Metadata Badges: Tool Name & Timeout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {timeoutDisplay && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3.5px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                color: tokens.textSecondary,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
              title="Execution timeout"
            >
              <Clock size={11} color="currentColor" />
              <span>{timeoutDisplay}</span>
            </span>
          )}

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              color: tokens.textSecondary,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
            title={`Tool: ${toolName}`}
          >
            {toolName === 'terminal' || command ? (
              <Terminal size={11} color="currentColor" />
            ) : targetFile ? (
              <FileCode size={11} color="currentColor" />
            ) : (
              <Code2 size={11} color="currentColor" />
            )}
            <span>{toolName}</span>
          </span>
        </div>
      </div>

      {/* 2. Main Content Body: Clean summary & organized command preview */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            fontSize: '12.5px',
            lineHeight: 1.5,
            color: tokens.textSecondary,
            fontWeight: 400,
          }}
        >
          {descriptionText}
        </div>

        {/* Command Preview Box */}
        {command && (
          <div
            style={{
              borderRadius: '7px',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              backgroundColor: isDark ? '#141517' : '#F6F8FA',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
              fontSize: '12px',
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: 0,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                flex: 1,
                scrollbarWidth: 'none',
              }}
            >
              <span style={{ color: isDark ? '#71717A' : '#9CA3AF', userSelect: 'none' }}>$</span>
              <span
                style={{
                  color: isDark ? '#F3F4F6' : '#1F2328',
                  fontWeight: 500,
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
              >
                {command}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCommand}
              title={copiedCmd ? 'Copied to clipboard' : 'Copy command'}
              aria-label="Copy command"
              style={{
                background: 'transparent',
                border: 'none',
                color: copiedCmd ? tokens.accentSuccess : tokens.textMuted,
                cursor: 'pointer',
                padding: '3px 5px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!copiedCmd) e.currentTarget.style.color = tokens.textPrimary;
              }}
              onMouseLeave={(e) => {
                if (!copiedCmd) e.currentTarget.style.color = tokens.textMuted;
              }}
            >
              {copiedCmd ? <Check size={12.5} color={tokens.accentSuccess} /> : <Copy size={12.5} />}
            </button>
          </div>
        )}

        {/* Target File Preview (if file-related tool) */}
        {!command && targetFile && (
          <div
            style={{
              borderRadius: '7px',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              backgroundColor: isDark ? '#141517' : '#F6F8FA',
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '11.5px',
              color: isDark ? '#E5E7EB' : '#1F2328',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <FileCode size={13} color={tokens.textSecondary} />
            <span style={{ fontWeight: 500 }}>{targetFile}</span>
          </div>
        )}

        {/* 3. Expandable JSON Details Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'transparent',
              border: 'none',
              padding: '2px 0',
              color: tokens.textMuted,
              fontSize: '11.5px',
              cursor: 'pointer',
              userSelect: 'none',
              width: 'fit-content',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = tokens.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = tokens.textMuted;
            }}
          >
            {detailsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>Parameters & raw payload</span>
            <span style={{ fontSize: '10px', color: tokens.textMuted }}>
              ({paramCount} {paramCount === 1 ? 'item' : 'items'})
            </span>
          </button>

          {/* Expandable JSON Body */}
          {detailsExpanded && (
            <div
              style={{
                borderRadius: '6px',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}`,
                backgroundColor: isDark ? '#141517' : '#F6F8FA',
                padding: '8px 10px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '6px',
                  marginBottom: '6px',
                  borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: tokens.textMuted,
                  }}
                >
                  Raw JSON Payload
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  title="Copy full JSON"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: 'none',
                    color: copiedJson ? tokens.accentSuccess : tokens.textMuted,
                    fontSize: '10.5px',
                    cursor: 'pointer',
                    padding: '1px 4px',
                    borderRadius: '3px',
                  }}
                >
                  {copiedJson ? (
                    <>
                      <Check size={11} color={tokens.accentSuccess} />
                      <span style={{ color: tokens.accentSuccess }}>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <pre
                style={{
                  margin: 0,
                  fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
                  fontSize: '11px',
                  lineHeight: 1.5,
                  maxHeight: '140px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  color: isDark ? '#D1D5DB' : '#374151',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                }}
              >
                {jsonPayloadString}
              </pre>
            </div>
          )}
        </div>

        {/* 4. Optional Deny Reason Input */}
        {showDenyInput && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
            <input
              type="text"
              autoFocus
              placeholder="Reason for denying (optional, guides the agent)..."
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleDeny();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowDenyInput(false);
                }
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'}`,
                backgroundColor: isDark ? '#141517' : '#FFFFFF',
                color: tokens.textPrimary,
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <span style={{ fontSize: '10.5px', color: tokens.textMuted }}>
              Press Enter to confirm denial, or Esc to cancel.
            </span>
          </div>
        )}

        {/* 5. Differentiated Neutral Actions Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '2px',
            flexWrap: 'wrap',
          }}
        >
          {/* Approve Action: Solid neutral developer-tool button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleApprove}
            aria-label="Approve Action"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: isDark ? '#2C313A' : '#1F2328',
              color: '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.18)' : '#1F2328'}`,
              fontSize: '12px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
              boxShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.08)',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = isDark ? '#353B46' : '#2C313A';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = isDark ? '#2C313A' : '#1F2328';
              }
            }}
          >
            {isSubmitting ? (
              <Loader2 size={13} className="animate-spin" color="currentColor" />
            ) : (
              <Check size={13} strokeWidth={2.4} color="currentColor" />
            )}
            <span>{isSubmitting ? 'Approving...' : 'Approve Action'}</span>
          </button>

          {/* Deny Button: Neutral subtle styling */}
          {!showDenyInput ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowDenyInput(true)}
              aria-label="Deny Action"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: tokens.textSecondary,
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                fontSize: '12px',
                fontWeight: 500,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.color = tokens.textPrimary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = tokens.textSecondary;
                }
              }}
            >
              <X size={13} strokeWidth={2} />
              <span>Deny...</span>
            </button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeny}
                aria-label="Confirm Deny Action"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? 'rgba(242, 139, 130, 0.15)' : '#FEE2E2',
                  color: isDark ? '#F28B82' : '#DC2626',
                  border: `1px solid ${isDark ? 'rgba(242, 139, 130, 0.35)' : '#FCA5A5'}`,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="animate-spin" color="currentColor" />
                ) : (
                  <X size={13} strokeWidth={2} color="currentColor" />
                )}
                <span>Confirm Deny</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowDenyInput(false);
                  setDenyReason('');
                }}
                aria-label="Cancel denial"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: tokens.textMuted,
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = tokens.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = tokens.textMuted;
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
