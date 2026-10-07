import React from 'react';
import { FileChangeInfo } from '../../services/aiWorkspaceService';
import { FileIcon } from '../FileIcon';
import { useTabsStore } from '../../stores/tabsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useThemeStore } from '../../stores/themeStore';
import { FileCode2, ExternalLink, CheckCircle } from 'lucide-react';

interface FileChangesCardProps {
  files: FileChangeInfo[];
  isRealtime?: boolean;
}

export const FileChangesCard: React.FC<FileChangesCardProps> = ({ files, isRealtime = false }) => {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  if (!files || files.length === 0) return null;

  const totalLines = files.reduce((acc, f) => acc + (f.lines || f.additions || 0), 0);
  const hasCreated = files.some((f) => f.action === 'created');

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

  return (
    <div
      style={{
        margin: '8px 0 12px 0',
        borderRadius: '10px',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E5E7EB',
        backgroundColor: isDark ? 'rgba(30, 30, 30, 0.65)' : '#FFFFFF',
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
        boxShadow: isDark
          ? '0 4px 14px rgba(0, 0, 0, 0.25)'
          : '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        fontSize: '12.5px',
        color: isDark ? '#F3F4F6' : '#1F2937',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F3F4F6',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRealtime ? (
            <CheckCircle size={15} color="#10B981" />
          ) : (
            <FileCode2 size={15} color={isDark ? '#818CF8' : '#4F46E5'} />
          )}
          <span style={{ fontWeight: 600, color: isDark ? '#F3F4F6' : '#111827' }}>
            {files.length === 1
              ? hasCreated ? '1 File Created' : '1 File Modified'
              : `${files.length} Files ${hasCreated ? 'Created / Modified' : 'Modified'}`}
          </span>
        </div>

        {totalLines > 0 && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #A7F3D0',
              color: isDark ? '#34D399' : '#047857',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          >
            +{totalLines} lines written
          </span>
        )}
      </div>

      {/* File Items */}
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
              className={`file-change-row ${isDark ? 'dark-row' : 'light-row'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderBottom:
                  idx < files.length - 1
                    ? isDark
                      ? '1px solid rgba(255, 255, 255, 0.05)'
                      : '1px solid #F3F4F6'
                    : 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FileIcon path={fileName} size={15} />
                <span
                  style={{
                    fontWeight: 600,
                    color: isDark ? '#F3F4F6' : '#1F2937',
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
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    ({dirPath})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {/* Action Badge */}
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    fontWeight: 500,
                    backgroundColor: isCreated
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.18)'
                        : '#ECFDF5'
                      : isDark
                        ? 'rgba(59, 130, 246, 0.18)'
                        : '#EFF6FF',
                    border: isCreated
                      ? isDark
                        ? 'none'
                        : '1px solid #BBF7D0'
                      : isDark
                        ? 'none'
                        : '1px solid #BFDBFE',
                    color: isCreated
                      ? isDark
                        ? '#34D399'
                        : '#15803D'
                      : isDark
                        ? '#60A5FA'
                        : '#1D4ED8',
                  }}
                >
                  {isCreated ? 'Created' : 'Modified'}
                </span>

                {/* Lines Badge */}
                {lineCount > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F3F4F6',
                      border: isDark ? 'none' : '1px solid #E5E7EB',
                      color: isDark ? '#D1D5DB' : '#374151',
                    }}
                  >
                    {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                  </span>
                )}

                <ExternalLink
                  size={12}
                  style={{
                    color: isDark ? '#9CA3AF' : '#9CA3AF',
                    opacity: 0.7,
                    marginLeft: '2px',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Local Website Preview Banner if index.html is present */}
      {files.some(f => f.file.endsWith('index.html') || f.file.endsWith('index.htm') || f.file === 'index.html') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : '#F0F9FF',
            borderTop: isDark ? '1px solid rgba(14, 165, 233, 0.25)' : '1px solid #BAE6FD',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>🌐</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '12px', color: isDark ? '#38BDF8' : '#0284C7' }}>
                Website Live on Local
              </div>
              <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B' }}>
                Running at http://localhost:3000
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const url = 'http://localhost:3000';
              if ((window as any).electronAPI?.openExternalUrl) {
                (window as any).electronAPI.openExternalUrl(url);
              } else {
                window.open(url, '_blank');
              }
            }}
            style={{
              display: 'flex',
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
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
            }}
          >
            <span>Preview Website</span>
            <ExternalLink size={13} />
          </button>
        </div>
      )}

      <style>{`
        .file-change-row.dark-row:hover {
          background-color: rgba(255, 255, 255, 0.06) !important;
        }
        .file-change-row.light-row:hover {
          background-color: #F9FAFB !important;
        }
      `}</style>
    </div>
  );
};
