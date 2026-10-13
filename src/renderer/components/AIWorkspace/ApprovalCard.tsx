import React, { useState } from 'react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useThemeStore } from '../../stores/themeStore';
import { ShieldAlert, Check, X } from 'lucide-react';
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

  if (!pendingApproval) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await approveAction();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = async () => {
    setIsSubmitting(true);
    try {
      await denyAction(denyReason.trim() || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        margin: '10px 0',
        padding: '14px',
        borderRadius: '8px',
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.bgPanel,
        color: tokens.textPrimary,
        boxShadow: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <ShieldAlert size={16} color={tokens.iconPrimary} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: tokens.textPrimary }}>
          Action Approval Required
        </span>
      </div>

      <div style={{ fontSize: '12.5px', marginBottom: '8px', lineHeight: 1.5, color: tokens.textSecondary }}>
        {pendingApproval.description || `The agent wants to execute ${pendingApproval.tool}.`}
      </div>

      <div
        style={{
          padding: '8px 10px',
          borderRadius: '6px',
          backgroundColor: tokens.bgCard,
          border: `1px solid ${tokens.border}`,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '11px',
          marginBottom: '12px',
          maxHeight: '120px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          color: tokens.textPrimary,
        }}
      >
        <div style={{ fontWeight: 600, color: tokens.textSecondary, marginBottom: '4px' }}>
          Tool: {pendingApproval.tool}
        </div>
        {JSON.stringify(pendingApproval.args, null, 2)}
      </div>

      {showDenyInput && (
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Reason for denying (optional)..."
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              border: `1px solid ${tokens.border}`,
              backgroundColor: tokens.bgCard,
              color: tokens.textPrimary,
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          disabled={isSubmitting}
          onClick={handleApprove}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: tokens.bgActiveTab,
            color: tokens.textPrimary,
            border: `1px solid ${isDark ? '#4A4D53' : '#D0D3D8'}`,
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Check size={13} color="currentColor" />
          <span>Approve Action</span>
        </button>

        {!showDenyInput ? (
          <button
            disabled={isSubmitting}
            onClick={() => setShowDenyInput(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: tokens.textSecondary,
              border: `1px solid ${tokens.border}`,
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <X size={13} />
            <span>Deny...</span>
          </button>
        ) : (
          <button
            disabled={isSubmitting}
            onClick={handleDeny}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: tokens.bgCard,
              color: tokens.textPrimary,
              border: `1px solid ${tokens.border}`,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <X size={13} />
            <span>Confirm Deny</span>
          </button>
        )}
      </div>
    </div>
  );
};
