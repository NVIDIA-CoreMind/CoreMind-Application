import React, { useState } from 'react';
import {
  Check,
  X,
  FileCode,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';

export const DiffReviewModal: React.FC = () => {
  const {
    isReviewingChanges,
    changeSet,
    setIsReviewingChanges,
    acceptAllChanges,
    rejectAllChanges,
    acceptFileChange,
    rejectFileChange,
  } = useAgentStore();

  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isReviewingChanges || !changeSet) return null;

  const files = changeSet.files || [];
  const selectedFile = files[selectedFileIndex] || files[0];

  const handleAcceptAll = async () => {
    setIsProcessing(true);
    await acceptAllChanges();
    setIsProcessing(false);
  };

  const handleRejectAll = async () => {
    if (confirm('Are you sure you want to reject all proposed changes? Files will be reverted.')) {
      setIsProcessing(true);
      await rejectAllChanges();
      setIsProcessing(false);
    }
  };

  const handleAcceptFile = async (path: string) => {
    setIsProcessing(true);
    await acceptFileChange(path);
    setIsProcessing(false);
  };

  const handleRejectFile = async (path: string) => {
    setIsProcessing(true);
    await rejectFileChange(path);
    setIsProcessing(false);
  };

  // Render unified diff lines with coloring
  const renderDiffLines = (rawDiff: string) => {
    if (!rawDiff) {
      return (
        <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>
          No diff content available for this file.
        </div>
      );
    }

    const lines = rawDiff.split('\n');
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', lineHeight: '1.45' }}>
        {lines.map((line, idx) => {
          let bg = 'transparent';
          let color = '#d1d5db';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            bg = 'rgba(16, 185, 129, 0.15)';
            color = '#34D399';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bg = 'rgba(239, 68, 68, 0.15)';
            color = '#F87171';
          } else if (line.startsWith('@@')) {
            bg = 'rgba(59, 130, 246, 0.1)';
            color = '#60A5FA';
          }

          return (
            <div
              key={idx}
              style={{
                backgroundColor: bg,
                color,
                padding: '1px 8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                display: 'flex',
                gap: '8px',
              }}
            >
              <span
                style={{
                  width: '32px',
                  color: 'var(--text-muted)',
                  userSelect: 'none',
                  textAlign: 'right',
                  fontSize: '10px',
                }}
              >
                {idx + 1}
              </span>
              <span>{line}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={() => setIsReviewingChanges(false)}
    >
      <div
        style={{
          width: '90vw',
          maxWidth: '1100px',
          height: '82vh',
          backgroundColor: '#18181a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            height: '48px',
            padding: '0 16px',
            backgroundColor: '#1f1f23',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>
              Review AI Code Changes
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                fontWeight: 500,
              }}
            >
              ChangeSet: {changeSet.change_id}
            </span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {files.length} file{files.length !== 1 ? 's' : ''} modified
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleAcceptAll}
              disabled={isProcessing || files.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: '#10B981',
                color: '#ffffff',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '12px',
                cursor: isProcessing ? 'default' : 'pointer',
              }}
            >
              <CheckCheck size={14} />
              <span>Accept All Changes</span>
            </button>

            <button
              onClick={handleRejectAll}
              disabled={isProcessing || files.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: isProcessing ? 'default' : 'pointer',
              }}
            >
              <RotateCcw size={14} />
              <span>Reject All</span>
            </button>

            <button
              onClick={() => setIsReviewingChanges(false)}
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body: Left File List + Right Diff Viewer */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* File List */}
          <div
            style={{
              width: '280px',
              backgroundColor: '#141416',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontSize: '10px',
                fontWeight: 600,
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              Changed Files
            </div>

            {files.map((file, idx) => {
              const isSelected = idx === selectedFileIndex;
              const fileName = file.path.split(/[/\\]/).pop() || file.path;

              return (
                <div
                  key={file.path}
                  onClick={() => setSelectedFileIndex(idx)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #10B981' : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <FileCode size={13} color="#10B981" />
                    <span
                      style={{
                        fontSize: '12px',
                        color: isSelected ? '#ffffff' : '#d1d5db',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={file.path}
                    >
                      {fileName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {file.additions > 0 && (
                      <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>
                        +{file.additions}
                      </span>
                    )}
                    {file.deletions > 0 && (
                      <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: 600 }}>
                        -{file.deletions}
                      </span>
                    )}
                    {file.accepted && (
                      <Check size={11} color="#10B981" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Diff Viewer */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#181818',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {selectedFile ? (
              <>
                {/* File Header Bar */}
                <div
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    backgroundColor: '#1e1e20',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#e5e7eb' }}>
                      {selectedFile.path}
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor:
                          selectedFile.status === 'created'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : selectedFile.status === 'deleted'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                        color:
                          selectedFile.status === 'created'
                            ? '#10B981'
                            : selectedFile.status === 'deleted'
                            ? '#EF4444'
                            : '#60A5FA',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedFile.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleAcceptFile(selectedFile.path)}
                      disabled={isProcessing || selectedFile.accepted}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: selectedFile.accepted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.2)',
                        color: '#10B981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '11px',
                        cursor: isProcessing || selectedFile.accepted ? 'default' : 'pointer',
                      }}
                    >
                      <Check size={11} />
                      <span>{selectedFile.accepted ? 'Accepted' : 'Accept File'}</span>
                    </button>

                    <button
                      onClick={() => handleRejectFile(selectedFile.path)}
                      disabled={isProcessing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#EF4444',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        fontSize: '11px',
                        cursor: isProcessing ? 'default' : 'pointer',
                      }}
                    >
                      <RotateCcw size={11} />
                      <span>Reject File</span>
                    </button>
                  </div>
                </div>

                {/* Diff Lines Viewport */}
                <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
                  {renderDiffLines(selectedFile.diff)}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Select a file from the list to review changes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
