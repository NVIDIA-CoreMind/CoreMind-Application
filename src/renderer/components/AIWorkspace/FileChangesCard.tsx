import React, { useState } from 'react';
import { FileChangeInfo } from '../../services/aiWorkspaceService';
import { FileIcon } from '../FileIcon';
import { useTabsStore } from '../../stores/tabsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTerminalStore } from '../../stores/terminalStore';
import { useThemeStore } from '../../stores/themeStore';
import {
  ExternalLink,
  Globe,
  Terminal,
  FileText,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface FileChangesCardProps {
  files: FileChangeInfo[];
  isRealtime?: boolean;
  localUrl?: string;
  terminalCommand?: string;
}

export const FileChangesCard: React.FC<FileChangesCardProps> = ({
  files,
  isRealtime = false,
  localUrl,
  terminalCommand,
}) => {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const runCommand = useTerminalStore((s) => s.runCommand);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [isExpanded, setIsExpanded] = useState(false);

  const hasFiles = Boolean(files && files.length > 0);
  const hasWebEntry = Boolean(
    files &&
      files.some(
        (f) =>
          f.file.endsWith('index.html') ||
          f.file.endsWith('index.htm') ||
          f.file === 'index.html' ||
          f.file.endsWith('.html')
      )
  );

  const hasWebPreview = Boolean(localUrl || hasWebEntry);
  const displayUrl = localUrl || 'http://localhost:3000';

  if (!hasFiles && !hasWebPreview) return null;

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

  const handleOpenPreview = () => {
    const api = window.coreMindAPI;
    if (api?.openExternalUrl) {
      api.openExternalUrl(displayUrl);
    } else if ((window as any).electronAPI?.openExternalUrl) {
      (window as any).electronAPI.openExternalUrl(displayUrl);
    } else {
      window.open(displayUrl, '_blank');
    }
  };

  const handleRunInTerminal = async () => {
    const isWin = window.coreMindAPI?.platform
      ? window.coreMindAPI.platform.isWindows
      : false;
    const cmd =
      terminalCommand ||
      (isWin ? 'python -m http.server 3000' : 'python3 -m http.server 3000');
    try {
      await runCommand(cmd);
    } catch (err) {
      console.warn('[FileChangesCard] Failed to run terminal command:', err);
    }
  };

  return (
    <div style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Antigravity Change Summary Bar (matching screenshot) */}
      {hasFiles && (
        <div
          style={{
            borderRadius: '8px',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid #E2E8F0',
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.04)'
              : '#F8FAFC',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
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
                    backgroundColor: '#10B981',
                    animation: 'pulse 1.5s infinite',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isDark ? '#E2E8F0' : '#1E293B',
                }}
              >
                {files.length} {files.length === 1 ? 'file changed' : 'files changed'}
              </span>

              {totalAdditions > 0 && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#22C55E',
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
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#EF4444',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                >
                  -{totalDeletions}
                </span>
              )}

              <span
                style={{
                  color: isDark ? '#94A3B8' : '#64748B',
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
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.12)'
                  : '1px solid #CBD5E1',
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.07)'
                  : '#FFFFFF',
                color: isDark ? '#E2E8F0' : '#1E293B',
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
                borderTop: isDark
                  ? '1px solid rgba(255, 255, 255, 0.08)'
                  : '1px solid #E2E8F0',
                backgroundColor: isDark
                  ? 'rgba(0, 0, 0, 0.15)'
                  : '#FFFFFF',
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
                          ? isDark
                            ? '1px solid rgba(255, 255, 255, 0.05)'
                            : '1px solid #F1F5F9'
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
                          color: isDark ? '#F1F5F9' : '#1E293B',
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
                            color: isDark ? '#94A3B8' : '#64748B',
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
                          backgroundColor: isCreated
                            ? isDark
                              ? 'rgba(34, 197, 94, 0.15)'
                              : '#ECFDF5'
                            : isDark
                              ? 'rgba(59, 130, 246, 0.15)'
                              : '#EFF6FF',
                          color: isCreated
                            ? isDark
                              ? '#4ADE80'
                              : '#059669'
                            : isDark
                              ? '#60A5FA'
                              : '#2563EB',
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
                            color: '#22C55E',
                            fontWeight: 600,
                          }}
                        >
                          +{lineCount}
                        </span>
                      )}

                      <ExternalLink
                        size={12}
                        style={{
                          color: isDark ? '#64748B' : '#94A3B8',
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

      {/* Website Live on Local Preview Banner */}
      {hasWebPreview && (
        <div
          style={{
            borderRadius: '8px',
            border: isDark
              ? '1px solid rgba(14, 165, 233, 0.3)'
              : '1px solid #BAE6FD',
            backgroundColor: isDark
              ? 'rgba(14, 165, 233, 0.1)'
              : '#F0F9FF',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isDark
                  ? 'rgba(14, 165, 233, 0.2)'
                  : '#E0F2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Globe size={16} color={isDark ? '#38BDF8' : '#0284C7'} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '12.5px',
                  color: isDark ? '#38BDF8' : '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Website Live on Local</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '999px',
                    backgroundColor: isDark
                      ? 'rgba(34, 197, 94, 0.2)'
                      : '#DCFCE7',
                    color: isDark ? '#4ADE80' : '#15803D',
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: '#22C55E',
                      display: 'inline-block',
                    }}
                  />
                  Live
                </span>
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: isDark ? '#94A3B8' : '#64748B',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Running at</span>
                <a
                  onClick={handleOpenPreview}
                  style={{
                    color: isDark ? '#38BDF8' : '#0284C7',
                    textDecoration: 'underline',
                    fontWeight: 600,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    cursor: 'pointer',
                  }}
                >
                  {displayUrl}
                </a>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleRunInTerminal}
              title="Run or restart server in terminal"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#FFFFFF',
                color: isDark ? '#E2E8F0' : '#334155',
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.12)'
                  : '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              className="antigravity-terminal-btn"
            >
              <Terminal size={12} color={isDark ? '#38BDF8' : '#0284C7'} />
              <span>Run in Terminal</span>
            </button>

            <button
              onClick={handleOpenPreview}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
              }}
              className="antigravity-preview-btn"
            >
              <span>Preview Website</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .antigravity-summary-bar:hover {
          background-color: ${
            isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'
          } !important;
        }
        .antigravity-review-btn:hover {
          background-color: ${
            isDark ? 'rgba(255, 255, 255, 0.14)' : '#F8FAFC'
          } !important;
        }
        .antigravity-file-row:hover {
          background-color: ${
            isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC'
          } !important;
        }
        .antigravity-terminal-btn:hover {
          background-color: ${
            isDark ? 'rgba(255, 255, 255, 0.12)' : '#F1F5F9'
          } !important;
        }
        .antigravity-preview-btn:hover {
          background-color: #0369A1 !important;
          box-shadow: 0 3px 8px rgba(2, 132, 199, 0.35) !important;
        }
      `}</style>
    </div>
  );
};
