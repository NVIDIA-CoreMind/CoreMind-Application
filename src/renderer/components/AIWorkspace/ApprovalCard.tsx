import React, { useState } from 'react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useThemeStore } from '../../stores/themeStore';
import { ShieldAlert, Check, X } from 'lucide-react';

export const ApprovalCard: React.FC = () => {
  const pendingApproval = useAIWorkspaceStore((s) => s.pendingApproval);
  const approveAction = useAIWorkspaceStore((s) => s.approveAction);
  const denyAction = useAIWorkspaceStore((s) => s.denyAction);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

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
        borderRadius: '10px',
        border: '1px solid #F59E0B',
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
        color: 'var(--text-primary)',
        boxShadow: '0 2px 10px rgba(245, 158, 11, 0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <ShieldAlert size={18} color="#F59E0B" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#D97706' }}>
          Action Approval Required
        </span>
      </div>

      <div style={{ fontSize: '12.5px', marginBottom: '8px', lineHeight: 1.5 }}>
        {pendingApproval.description || `The agent wants to execute ${pendingApproval.tool}.`}
      </div>

      <div
        style={{
          padding: '8px',
          borderRadius: '6px',
          backgroundColor: isDark ? '#141414' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          marginBottom: '12px',
          maxHeight: '120px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
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
              border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #CBD5E1',
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              color: 'var(--text-primary)',
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
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Check size={13} />
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
              color: '#DC2626',
              border: '1px solid rgba(220, 38, 38, 0.3)',
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
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
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
