import React, { useState } from 'react';
import { FileChangeInfo } from '../../services/aiWorkspaceService';
import { FileIcon } from '../FileIcon';
import { useTabsStore } from '../../stores/tabsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useThemeStore } from '../../stores/themeStore';
import {
  ExternalLink,
  FileText,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { getAITheme } from './themeTokens';

interface FileChangesCardProps {
  files: FileChangeInfo[];
  isRealtime?: boolean;
  localUrl?: string;
  terminalCommand?: string;
}

export const FileChangesCard: React.FC<FileChangesCardProps> = ({
  files,
  isRealtime = false,
}) => {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tokens = getAITheme(isDark);

  const [isExpanded, setIsExpanded] = useState(false);

  const hasFiles = Boolean(files && files.length > 0);

  if (!hasFiles) return null;

  const totalAdditions = (files || []).reduce(
    (acc, f) => acc + (f.additions || f.lines || 0),
    0
  );
  const totalDeletions = (files || []).reduce(
    (acc, f) => acc + (f.deletions || 0),
    0
  );

  const handleOpenFile = async (relPath: string) => {
    if (!rootPath) return;
    const cleanPath = relPath.replace(/^\/+/, '').trim();
    const fullPath = relPath.startsWith('/') ? relPath : `${rootPath}/${cleanPath}`;
    const fileName = cleanPath.split('/').pop() || cleanPath;
    try {
      await openFile(fullPath, fileName, rootPath);
    } catch (err) {
      console.warn('[FileChangesCard] Failed to open file:', fullPath, err);
    }
  };

  const handleReviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
    if (!isExpanded && files && files.length > 0) {
      handleOpenFile(files[0].file);
    }
  };

  return (
    <div style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Antigravity Change Summary Bar */}
      {hasFiles && (
        <div
          style={{
            borderRadius: '8px',
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.bgPanel,
            overflow: 'hidden',
            boxShadow: 'none',
            transition: 'border-color 0.15s ease',
          }}
        >
          {/* Main Top Bar */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="antigravity-summary-bar"
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              gap: '12px',
            }}
          >
            {/* Left: Files changed, +additions, -deletions, chevron */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              {isRealtime && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: tokens.accentRunning,
                    animation: 'pulse 1.5s infinite',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: tokens.textPrimary,
                }}
              >
                {files.length} {files.length === 1 ? 'file changed' : 'files changed'}
              </span>

              {totalAdditions > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: tokens.accentSuccess,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                >
                  +{totalAdditions}
                </span>
              )}

              {totalDeletions > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: tokens.accentError,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                >
                  -{totalDeletions}
                </span>
              )}

              <span
                style={{
                  color: tokens.iconPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '2px',
                }}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </div>

            {/* Right: Review Button */}
            <button
              onClick={handleReviewClick}
              className="antigravity-review-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: `1px solid ${tokens.border}`,
                backgroundColor: tokens.bgCard,
                color: tokens.textPrimary,
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <FileText size={13} style={{ opacity: 0.85 }} />
              <span>Review</span>
            </button>
          </div>

          {/* Expanded File List */}
          {isExpanded && (
            <div
              style={{
                borderTop: `1px solid ${tokens.borderSubtle}`,
                backgroundColor: tokens.bgPanel,
              }}
            >
              {files.map((file, idx) => {
                const fileName = file.file.split('/').pop() || file.file;
                const dirPath = file.file.includes('/')
                  ? file.file.slice(0, file.file.lastIndexOf('/'))
                  : '';
                const lineCount = file.lines || file.additions || 0;
                const isCreated = file.action === 'created' || !file.action;

                return (
                  <div
                    key={`${file.file}-${idx}`}
                    onClick={() => handleOpenFile(file.file)}
                    title={`Click to open ${file.file}`}
                    className="antigravity-file-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom:
                        idx < files.length - 1
                          ? `1px solid ${tokens.borderSubtle}`
                          : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: 0,
                      }}
                    >
                      <FileIcon path={fileName} size={15} />
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: '12.5px',
                          color: tokens.textPrimary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        }}
                      >
                        {fileName}
                      </span>
                      {dirPath && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: tokens.textMuted,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          ({dirPath})
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          fontWeight: 500,
                          backgroundColor: tokens.bgCard,
                          color: tokens.textSecondary,
                          border: `1px solid ${tokens.border}`,
                        }}
                      >
                        {isCreated ? 'Created' : 'Modified'}
                      </span>

                      {lineCount > 0 && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            color: tokens.accentSuccess,
                            fontWeight: 600,
                          }}
                        >
                          +{lineCount}
                        </span>
                      )}

                      <ExternalLink
                        size={12}
                        style={{
                          color: tokens.iconPrimary,
                          marginLeft: '2px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        .antigravity-summary-bar:hover {
          background-color: ${tokens.bgHover} !important;
        }
        .antigravity-review-btn:hover {
          background-color: ${tokens.bgHover} !important;
        }
        .antigravity-file-row:hover {
          background-color: ${tokens.bgCard} !important;
        }
      `}</style>
    </div>
  );
};
