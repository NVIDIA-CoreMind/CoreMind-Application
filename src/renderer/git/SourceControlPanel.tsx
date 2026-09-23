import React, { useEffect, useState } from 'react';
import { GitBranch, RefreshCw, FileDiff } from 'lucide-react';
import { GitStatusResult, GitFileStatus } from '@shared/types/git';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';

export const SourceControlPanel: React.FC = () => {
  const { rootPath } = useWorkspaceStore();
  const { openFile } = useTabsStore();
  const [gitStatus, setGitStatus] = useState<GitStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    if (!rootPath) {
      setGitStatus(null);
      return;
    }
    setIsLoading(true);
    try {
      const res = await window.coreMindAPI.getGitStatus(rootPath);
      if (res.success) {
        setGitStatus(res.data);
      }
    } catch {
      setGitStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [rootPath]);

  const getStatusBadge = (file: GitFileStatus) => {
    switch (file.type) {
      case 'modified':
        return <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '11px' }}>M</span>;
      case 'added':
        return <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '11px' }}>A</span>;
      case 'deleted':
        return <span style={{ color: 'var(--error)', fontWeight: 600, fontSize: '11px' }}>D</span>;
      case 'untracked':
        return <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '11px' }}>U</span>;
      default:
        return <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>•</span>;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '35px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <span>Source Control</span>
        <button
          onClick={fetchStatus}
          disabled={isLoading}
          title="Refresh Git Status"
          style={{ padding: '3px', color: 'var(--text-muted)' }}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {!rootPath ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
            Open a repository folder to view source control
          </div>
        ) : !gitStatus?.isRepo ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
            Current workspace is not a Git repository
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Branch info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-panel)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <GitBranch size={15} color="var(--accent)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CURRENT BRANCH</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {gitStatus.branch || 'main'}
                </span>
              </div>
            </div>

            {/* Changes list */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                <span>CHANGES</span>
                <span
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {gitStatus.files.length}
                </span>
              </div>

              {gitStatus.files.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
                  No changes detected. Working tree clean.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {gitStatus.files.map((file) => {
                    const fileName = file.path.split('/').pop() || file.path;
                    return (
                      <div
                        key={file.path}
                        onClick={() => {
                          const fullPath = `${rootPath}/${file.path}`.replace(/\/+/g, '/');
                          openFile(fullPath, fileName, rootPath);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-panel)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <FileDiff size={13} color="var(--text-muted)" />
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {fileName}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {file.path}
                          </span>
                        </div>
                        <div>{getStatusBadge(file)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
