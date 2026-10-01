import React, { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Info, X } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { FileIcon } from '../components/FileIcon';
import { sortedChanges, STATUS_BADGE, ChangeStatus } from '../services/aiChanges';

const STATUS_COLOR: Record<ChangeStatus, string> = {
  created: '#34d399',
  modified: '#e2c08d',
  deleted: '#f87171',
};

const ACCEPT = '#10b981';
const REJECT = '#f87171';

const pillButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '11.5px',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid transparent',
};

const iconButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '22px',
  height: '22px',
  borderRadius: '5px',
  cursor: 'pointer',
  border: 'none',
  backgroundColor: 'transparent',
};

export const AIChangesSection: React.FC = () => {
  const trackedChanges = useAgentStore((s) => s.trackedChanges);
  const reviewIndex = useAgentStore((s) => s.reviewIndex);
  const changeNotice = useAgentStore((s) => s.changeNotice);
  const { openChange, acceptAllChanges, rejectAllChanges, acceptFileChange, rejectFileChange } =
    useAgentStore.getState();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const changes = sortedChanges(trackedChanges);
  if (changes.length === 0 && !changeNotice) return null;

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
        flexShrink: 0,
        margin: '0 10px',
        backgroundColor: 'var(--bg-raised)',
        border: '1px solid var(--ov-8)',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        marginBottom: '-1px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {changes.length > 0 && (
        <>
          {expanded && (
            <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '6px 6px 2px' }}>
              {changes.map((file) => {
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
                      borderRadius: '5px',
                      cursor: 'pointer',
                      backgroundColor: active ? 'var(--ov-8)' : 'transparent',
                    }}
                  >
                    <FileIcon path={file.path} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.path}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: STATUS_COLOR[file.status] }}>
                      {STATUS_BADGE[file.status]}
                    </span>
                    <button
                      style={{ ...iconButton, color: ACCEPT }}
                      disabled={busy}
                      title="Accept"
                      onClick={(e) => {
                        e.stopPropagation();
                        void run(() => acceptFileChange(file.path));
                      }}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      style={{ ...iconButton, color: REJECT }}
                      disabled={busy}
                      title="Reject"
                      onClick={(e) => {
                        e.stopPropagation();
                        void run(() => rejectFileChange(file.path));
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px 7px 10px' }}>
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textAlign: 'left',
              }}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {changes.length} {changes.length === 1 ? 'File' : 'Files'} With Changes
            </button>
            <button
              style={{ ...pillButton, backgroundColor: 'transparent', borderColor: 'var(--ov-12)', color: 'var(--text-body)' }}
              disabled={busy}
              onClick={handleRejectAll}
            >
              Reject all
            </button>
            <button
              style={{ ...pillButton, backgroundColor: ACCEPT, color: '#fff' }}
              disabled={busy}
              onClick={() => void run(acceptAllChanges)}
            >
              <Check size={12} />
              Accept all
            </button>
          </div>
        </>
      )}

      {changeNotice && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: changes.length ? '0 10px 8px' : '8px 10px',
            fontSize: '11px',
            color: '#fbbf24',
          }}
        >
          <Info size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{changeNotice}</span>
        </div>
      )}
    </div>
  );
};
