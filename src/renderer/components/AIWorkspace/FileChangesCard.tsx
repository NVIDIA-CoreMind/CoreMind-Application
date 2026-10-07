import React from 'react';
import { FileChangeInfo } from '../../services/aiWorkspaceService';
import { FileIcon } from '../FileIcon';
import { useTabsStore } from '../../stores/tabsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTerminalStore } from '../../stores/terminalStore';
import { ExternalLink, Check, Globe, Terminal } from 'lucide-react';

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

  const totalLines = (files || []).reduce(
    (acc, f) => acc + (f.lines || f.additions || 0),
    0
  );
  const hasCreated = (files || []).some((f) => f.action === 'created');

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
    <div
      style={{
        margin: '10px 0 14px 0',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        fontSize: '12.5px',
        color: '#0F172A',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Header - shown when files are present */}
      {hasFiles && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isRealtime ? (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                  }}
                />
              ) : (
                <Check size={12} color="#059669" strokeWidth={2.5} />
              )}
            </div>
            <span
              style={{
                fontWeight: 600,
                fontSize: '13px',
                color: '#0F172A',
                letterSpacing: '-0.01em',
              }}
            >
              {files.length === 1
                ? hasCreated
                  ? '1 File Created'
                  : '1 File Modified'
                : `${files.length} Files ${
                    hasCreated ? 'Created / Modified' : 'Modified'
                  }`}
            </span>
          </div>

          {totalLines > 0 && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#047857',
                fontWeight: 600,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              +{totalLines} lines written
            </span>
          )}
        </div>
      )}

      {/* File Items */}
      {hasFiles && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                  padding: '9px 14px',
                  borderBottom:
                    idx < files.length - 1 ? '1px solid #F1F5F9' : 'none',
                  cursor: 'pointer',
                  backgroundColor: '#FFFFFF',
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
                  <FileIcon path={fileName} size={16} />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '12.5px',
                      color: '#1E293B',
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
                        color: '#64748B',
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
                  {/* Action Badge */}
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      backgroundColor: isCreated ? '#ECFDF5' : '#EFF6FF',
                      border: isCreated ? '1px solid #BBF7D0' : '1px solid #BFDBFE',
                      color: isCreated ? '#047857' : '#1D4ED8',
                    }}
                  >
                    {isCreated ? 'Created' : 'Modified'}
                  </span>

                  {/* Lines Badge */}
                  {lineCount > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        color: '#475569',
                        fontWeight: 500,
                      }}
                    >
                      {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                    </span>
                  )}

                  <ExternalLink
                    size={13}
                    className="row-external-link"
                    style={{
                      color: '#94A3B8',
                      marginLeft: '2px',
                      transition: 'color 0.15s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Local Website Preview Banner */}
      {hasWebPreview && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            backgroundColor: '#F0F9FF',
            borderTop: hasFiles ? '1px solid #BAE6FD' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: '#E0F2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Globe size={18} color="#0284C7" strokeWidth={2} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  color: '#0284C7',
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
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '999px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #BBF7D0',
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
                  color: '#64748B',
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
                    color: '#0284C7',
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
                backgroundColor: '#FFFFFF',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
              className="antigravity-terminal-btn"
            >
              <Terminal size={12} color="#0284C7" />
              <span>Run in Terminal</span>
            </button>

            <button
              onClick={handleOpenPreview}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 15px',
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
        .antigravity-file-row:hover {
          background-color: #F8FAFC !important;
        }
        .antigravity-file-row:hover .row-external-link {
          color: #2563EB !important;
        }
        .antigravity-terminal-btn:hover {
          background-color: #F1F5F9 !important;
          border-color: #94A3B8 !important;
        }
        .antigravity-preview-btn:hover {
          background-color: #0369A1 !important;
          box-shadow: 0 3px 8px rgba(2, 132, 199, 0.35) !important;
        }
      `}</style>
    </div>
  );
};
