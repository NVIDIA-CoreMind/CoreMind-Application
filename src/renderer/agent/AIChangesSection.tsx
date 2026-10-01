import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, GitPullRequest, Info } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { FileIcon } from '../components/FileIcon';
import { groupByLanguage, sortedChanges, STATUS_BADGE, STATUS_LABEL, ChangeStatus } from '../services/aiChanges';

const STATUS_COLOR: Record<ChangeStatus, string> = {
  created: '#34d399',
  modified: '#e2c08d',
  deleted: '#f87171',
};

const buttonBase: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '5px',
  fontSize: '11.5px',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.12)',
  backgroundColor: 'transparent',
  color: '#d1d5db',
};

export const AIChangesSection: React.FC = () => {
  const trackedChanges = useAgentStore((s) => s.trackedChanges);
  const reviewIndex = useAgentStore((s) => s.reviewIndex);
  const changeNotice = useAgentStore((s) => s.changeNotice);
  const {
    openChange,
    reviewChanges,
    reviewStep,
    acceptAllChanges,
    rejectAllChanges,
    acceptFileChange,
    rejectFileChange,
  } = useAgentStore.getState();
  const [busy, setBusy] = useState(false);

  const changes = sortedChanges(trackedChanges);
  if (changes.length === 0 && !changeNotice) return null;

  const groups = groupByLanguage(changes);
  const reviewing = reviewIndex !== null ? changes[reviewIndex] : undefined;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const handleRejectAll = () => {
    if (confirm(`Reject all ${changes.length} AI changes? Files will be reverted.`)) {
      void run(rejectAllChanges);
    }
  };

  return (
    <div
      style={{
        margin: '10px 14px',
        padding: '10px 12px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        flexShrink: 0,
        maxHeight: '40%',
        overflowY: 'auto',
      }}
    >
      {changes.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <GitPullRequest size={14} color="#10B981" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f3f4f6' }}>AI Changes</span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {changes.length} {changes.length === 1 ? 'file' : 'files'} changed
            </span>
          </div>

          {groups.map((group) => (
            <div key={group.label} style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '10.5px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {group.label}
              </div>
              {group.files.map((file) => {
                const active = reviewing?.path === file.path;
                return (
                  <div
                    key={file.path}
                    role="button"
                    tabIndex={0}
                    title={file.absPath}
                    onClick={() => void openChange(file.path)}
                    onKeyDown={(e) => e.key === 'Enter' && void openChange(file.path)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: active ? 'rgba(16,185,129,0.12)' : 'transparent',
                    }}
                  >
                    <span style={{ width: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: STATUS_COLOR[file.status] }}>
                      {STATUS_BADGE[file.status]}
                    </span>
                    <FileIcon path={file.path} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '11.5px',
                        color: '#e5e7eb',
                        fontFamily: 'var(--font-mono)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.path}
                    </span>
                    <span style={{ fontSize: '10.5px', color: STATUS_COLOR[file.status] }}>{STATUS_LABEL[file.status]}</span>
                  </div>
                );
              })}
            </div>
          ))}

          {reviewing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '8px 0 4px' }}>
              <button style={buttonBase} disabled={busy} onClick={() => void reviewStep(-1)} title="Previous file">
                <ChevronLeft size={12} />
              </button>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                Reviewing {(reviewIndex ?? 0) + 1} of {changes.length}
              </span>
              <button style={buttonBase} disabled={busy} onClick={() => void reviewStep(1)} title="Next file">
                <ChevronRight size={12} />
              </button>
              <span style={{ flex: 1 }} />
              <button style={{ ...buttonBase, color: '#34d399' }} disabled={busy} onClick={() => void run(() => acceptFileChange(reviewing.path))}>
                Accept
              </button>
              <button style={{ ...buttonBase, color: '#f87171' }} disabled={busy} onClick={() => void run(() => rejectFileChange(reviewing.path))}>
                Reject
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button
              style={{ ...buttonBase, backgroundColor: '#10B981', borderColor: '#10B981', color: '#fff' }}
              disabled={busy}
              onClick={() => void (reviewing ? reviewStep(1) : reviewChanges())}
            >
              {reviewing ? 'Next Change' : 'Review Changes'}
            </button>
            <button style={buttonBase} disabled={busy} onClick={() => void run(acceptAllChanges)}>
              Accept All
            </button>
            <button style={buttonBase} disabled={busy} onClick={handleRejectAll}>
              Reject All
            </button>
          </div>
        </>
      )}

      {changeNotice && (
        <div style={{ display: 'flex', gap: '6px', marginTop: changes.length ? '8px' : 0, fontSize: '11px', color: '#fbbf24' }}>
          <Info size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{changeNotice}</span>
        </div>
      )}
    </div>
  );
};
