import React, { useState } from 'react';
import { useAIWorkspaceStore, FileChangeInfo } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useThemeStore } from '../../stores/themeStore';
import { parseUnifiedDiff } from './diffParser';
import { FileIcon } from '../FileIcon';
import {
  Check,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  FileText,
  CheckCheck,
  XCircle,
} from 'lucide-react';

interface DiffViewerProps {
  files?: FileChangeInfo[];
  showHeaderActions?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  files: propFiles,
  showHeaderActions = true,
}) => {
  const storeTracked = useAIWorkspaceStore((s) => s.trackedChanges);
  const changeId = useAIWorkspaceStore((s) => s.changeId);
  const acceptAllChanges = useAIWorkspaceStore((s) => s.acceptAllChanges);
  const rejectAllChanges = useAIWorkspaceStore((s) => s.rejectAllChanges);
  const acceptFileChange = useAIWorkspaceStore((s) => s.acceptFileChange);
  const rejectFileChange = useAIWorkspaceStore((s) => s.rejectFileChange);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const fileList: FileChangeInfo[] = propFiles && propFiles.length > 0
    ? propFiles
    : Object.values(storeTracked);

  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  if (fileList.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '32px 16px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          fontSize: '13px',
        }}
      >
        <FileText size={36} style={{ opacity: 0.35, marginBottom: '12px' }} />
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          No File Changes
        </div>
        <div style={{ maxWidth: '280px', lineHeight: 1.5 }}>
          When the AI agent modifies, creates, or deletes workspace files, syntax-aware diffs will appear here for review.
        </div>
      </div>
    );
  }

  const handleOpenFileInEditor = async (relPath: string) => {
    if (!rootPath) return;
    const cleanPath = relPath.replace(/^\/+/, '').trim();
    const fullPath = relPath.startsWith('/') ? relPath : `${rootPath}/${cleanPath}`;
    const fileName = cleanPath.split('/').pop() || cleanPath;
    try {
      await openFile(fullPath, fileName, rootPath);
    } catch (err) {
      console.warn('Failed to open file in editor:', err);
    }
  };

  const handleAcceptAll = async () => {
    setIsProcessing(true);
    try {
      await acceptAllChanges();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    if (confirm('Revert all modified files back to their baseline?')) {
      setIsProcessing(true);
      try {
        await rejectAllChanges();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleAcceptFile = async (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await acceptFileChange(filePath);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectFile = async (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    if (confirm(`Revert changes to ${filePath}?`)) {
      setIsProcessing(true);
      try {
        await rejectFileChange(filePath);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => ({
      ...prev,
      [filePath]: !prev[filePath],
    }));
  };

  const totalAdditions = fileList.reduce((acc, f) => acc + (f.additions || 0), 0);
  const totalDeletions = fileList.reduce((acc, f) => acc + (f.deletions || 0), 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Top Review Bar */}
      {showHeaderActions && (
        <div
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: isDark ? '1px solid var(--border-color, #3C4043)' : '1px solid #E2E8F0',
            backgroundColor: isDark ? 'var(--bg-panel, #232426)' : '#F8FAFC',
            flexShrink: 0,
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {fileList.length} {fileList.length === 1 ? 'file' : 'files'} changed
            </span>
            <div style={{ display: 'flex', gap: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              {totalAdditions > 0 && (
                <span style={{ color: 'var(--success, #81C995)', fontWeight: 600 }}>+{totalAdditions}</span>
              )}
              {totalDeletions > 0 && (
                <span style={{ color: 'var(--error, #F28B82)', fontWeight: 600 }}>-{totalDeletions}</span>
              )}
            </div>
          </div>

          {changeId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={isProcessing}
                onClick={handleAcceptAll}
                style={{
                  ...actionBtnStyle,
                  backgroundColor: 'rgba(129, 201, 149, 0.12)',
                  color: isDark ? 'var(--success, #81C995)' : '#15803D',
                  border: isDark ? '1px solid rgba(129, 201, 149, 0.25)' : '1px solid rgba(34, 197, 94, 0.3)',
                }}
                title="Accept all changes"
              >
                <CheckCheck size={13} />
                <span>Accept All</span>
              </button>
              <button
                disabled={isProcessing}
                onClick={handleRejectAll}
                style={{
                  ...actionBtnStyle,
                  backgroundColor: 'rgba(242, 139, 130, 0.12)',
                  color: isDark ? 'var(--error, #F28B82)' : '#B91C1C',
                  border: isDark ? '1px solid rgba(242, 139, 130, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                }}
                title="Revert all changes"
              >
                <XCircle size={13} />
                <span>Revert All</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Diff Content Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {fileList.map((file) => {
          const fileName = file.file.split('/').pop() || file.file;
          const dirPath = file.file.includes('/')
            ? file.file.slice(0, file.file.lastIndexOf('/'))
            : '';
          const isCollapsed = Boolean(collapsedFiles[file.file]);
          const parsed = parseUnifiedDiff(file.diff || '', file.file);
          const action = file.action || parsed.status;

          const actionColor =
            action === 'created'
              ? 'var(--success, #81C995)'
              : action === 'deleted'
              ? 'var(--error, #F28B82)'
              : 'var(--accent, #8AB4F8)';

          return (
            <div
              key={file.file}
              style={{
                borderRadius: '8px',
                border: isDark ? '1px solid var(--border-color, #3C4043)' : '1px solid #E2E8F0',
                backgroundColor: isDark ? 'var(--bg-app, #1E1F20)' : '#FFFFFF',
                overflow: 'hidden',
                boxShadow: 'none',
              }}
            >
              {/* File Header Bar */}
              <div
                onClick={() => toggleFileCollapse(file.file)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: isDark ? 'var(--bg-surface, #28292B)' : '#F8FAFC',
                  borderBottom: isCollapsed
                    ? 'none'
                    : isDark
                    ? '1px solid var(--border-color, #3C4043)'
                    : '1px solid #E2E8F0',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </span>
                  <FileIcon path={fileName} size={15} />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {fileName}
                  </span>
                  {dirPath && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      ({dirPath})
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      color: actionColor,
                    }}
                  >
                    {action}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      display: 'flex',
                      gap: '5px',
                    }}
                  >
                    {file.additions ? (
                      <span style={{ color: 'var(--success, #81C995)' }}>+{file.additions}</span>
                    ) : null}
                    {file.deletions ? (
                      <span style={{ color: 'var(--error, #F28B82)' }}>-{file.deletions}</span>
                    ) : null}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFileInEditor(file.file);
                    }}
                    style={smallIconBtnStyle}
                    title="Open in editor tab"
                  >
                    <ExternalLink size={13} />
                  </button>

                  {changeId && (
                    <>
                      <button
                        onClick={(e) => handleAcceptFile(e, file.file)}
                        style={{
                          ...smallIconBtnStyle,
                          color: 'var(--success, #81C995)',
                        }}
                        title="Accept this file"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={(e) => handleRejectFile(e, file.file)}
                        style={{
                          ...smallIconBtnStyle,
                          color: 'var(--error, #F28B82)',
                        }}
                        title="Revert this file"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Render Diff Hunks and Lines */}
              {!isCollapsed && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    lineHeight: '18px',
                    overflowX: 'auto',
                    backgroundColor: isDark ? 'var(--bg-app, #1E1F20)' : '#FFFFFF',
                  }}
                >
                  {parsed.hunks.length === 0 ? (
                    <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      File {action === 'created' ? 'created' : 'modified'} ({file.lines || 0} lines). No diff hunks to display.
                    </div>
                  ) : (
                    parsed.hunks.map((hunk, hIdx) => (
                      <div key={hIdx}>
                        {/* Hunk Header */}
                        <div
                          style={{
                            padding: '3px 10px',
                            backgroundColor: isDark ? 'rgba(138, 180, 248, 0.08)' : '#EFF6FF',
                            color: isDark ? 'var(--accent, #8AB4F8)' : '#2563EB',
                            fontSize: '11px',
                            borderTop: hIdx > 0 ? (isDark ? '1px solid var(--border-color, #3C4043)' : '1px solid #E2E8F0') : 'none',
                            borderBottom: isDark ? '1px solid var(--border-color, #3C4043)' : '1px solid #E2E8F0',
                            userSelect: 'none',
                          }}
                        >
                          {hunk.header}
                        </div>

                        {/* Lines */}
                        {hunk.lines.map((ln, lIdx) => {
                          const isAdd = ln.type === 'add';
                          const isDel = ln.type === 'delete';

                          const lineBg = isAdd
                            ? isDark
                              ? 'rgba(129, 201, 149, 0.12)'
                              : '#ECFDF5'
                            : isDel
                            ? isDark
                              ? 'rgba(242, 139, 130, 0.12)'
                              : '#FEF2F2'
                            : 'transparent';

                          const lineTextColor = isAdd
                            ? isDark
                              ? 'var(--success, #81C995)'
                              : '#15803D'
                            : isDel
                            ? isDark
                              ? 'var(--error, #F28B82)'
                              : '#B91C1C'
                            : isDark
                            ? 'var(--text-primary, #E8EAED)'
                            : '#1E293B';

                          const marker = isAdd ? '+' : isDel ? '-' : ' ';

                          return (
                            <div
                              key={lIdx}
                              style={{
                                display: 'flex',
                                backgroundColor: lineBg,
                                color: lineTextColor,
                                minWidth: 'fit-content',
                              }}
                            >
                              {/* Old Line Gutter */}
                              <div
                                style={{
                                  width: '38px',
                                  padding: '0 6px',
                                  textAlign: 'right',
                                  color: 'var(--text-muted)',
                                  opacity: 0.6,
                                  userSelect: 'none',
                                  flexShrink: 0,
                                }}
                              >
                                {ln.oldLineNumber || ''}
                              </div>

                              {/* New Line Gutter */}
                              <div
                                style={{
                                  width: '38px',
                                  padding: '0 6px',
                                  textAlign: 'right',
                                  color: 'var(--text-muted)',
                                  opacity: 0.6,
                                  userSelect: 'none',
                                  borderRight: isDark ? '1px solid var(--border-color, #3C4043)' : '1px solid #E2E8F0',
                                  flexShrink: 0,
                                }}
                              >
                                {ln.newLineNumber || ''}
                              </div>

                              {/* Marker (+ / -) */}
                              <div
                                style={{
                                  width: '18px',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  userSelect: 'none',
                                  flexShrink: 0,
                                }}
                              >
                                {marker}
                              </div>

                              {/* Content */}
                              <div
                                style={{
                                  padding: '0 8px 0 2px',
                                  whiteSpace: 'pre',
                                  flex: 1,
                                }}
                              >
                                {ln.content}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '11.5px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const smallIconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '3px 5px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'background-color 0.15s ease, color 0.15s ease',
};
