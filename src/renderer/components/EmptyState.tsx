import React, { useState } from 'react';
import {
  FolderOpen,
  GitBranch,
  Cpu,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import coreMindLogo from '../assets/icon.png';

function parseWorkspaceInfo(workspacePath: string) {
  const clean = workspacePath.replace(/\/+$/, '');
  const parts = clean.split(/[/\\]/).filter(Boolean);
  const name = parts[parts.length - 1] || 'Workspace';
  const parentParts = parts.slice(0, parts.length - 1);
  const parentPath = clean.startsWith('/') ? '/' + parentParts.join('/') : parentParts.join('/');
  const displayParent = parentPath.replace(/^\/Users\/[^/]+/, '~');
  return {
    name,
    displayParent: displayParent || '~',
    rawPath: clean,
  };
}

export const EmptyState: React.FC = () => {
  const { openFolderDialog, openWorkspacePath, recentWorkspaces, isLoading } = useWorkspaceStore();
  const [showAllRecents, setShowAllRecents] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');

  const displayRecents = showAllRecents ? recentWorkspaces : recentWorkspaces.slice(0, 3);

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setIsCloning(false);
    // Open folder dialog to choose destination for cloning
    await openFolderDialog();
  };

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#181818',
        color: '#d1d5db',
        padding: '36px 20px',
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '380px',
          width: '100%',
        }}
      >
        {/* Real App Logo & Name */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '26px',
            textAlign: 'center',
          }}
        >
          <img
            src={coreMindLogo}
            alt="CoreMind Logo"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '14px',
              objectFit: 'contain',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            }}
          />

          <h1
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: '#e5e7eb',
              letterSpacing: '-0.2px',
              margin: 0,
            }}
          >
            CoreMind IDE
          </h1>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            marginBottom: '32px',
          }}
        >
          <button
            onClick={() => openFolderDialog()}
            disabled={isLoading}
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
          >
            <FolderOpen size={16} />
            <span>{isLoading ? 'Opening Folder...' : 'Open Folder'}</span>
          </button>

          <button
            onClick={() => setIsCloning(!isCloning)}
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: '#27272a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#d1d5db',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#323236';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#27272a';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <GitBranch size={15} />
            <span>Clone Repository</span>
          </button>

          {isCloning && (
            <form onSubmit={handleCloneSubmit} style={{ marginTop: '4px', width: '100%' }}>
              <input
                type="text"
                placeholder="Enter repository URL (https://... or git@...)"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: '#1f1f22',
                  border: '1px solid #3b82f6',
                  color: '#ffffff',
                }}
              />
            </form>
          )}
        </div>

        {/* Workspaces Section */}
        {recentWorkspaces.length > 0 && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#9ca3af',
                letterSpacing: '0.1px',
                marginBottom: '4px',
              }}
            >
              Workspaces
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayRecents.map((itemPath) => {
                const info = parseWorkspaceInfo(itemPath);
                return (
                  <div
                    key={itemPath}
                    onClick={() => openWorkspacePath(itemPath)}
                    style={{
                      backgroundColor: '#1e1e1e',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.backgroundColor = '#232326';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.backgroundColor = '#1e1e1e';
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: '#f3f4f6',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {info.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#71717a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {info.displayParent}
                    </span>
                  </div>
                );
              })}
            </div>

            {recentWorkspaces.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllRecents(!showAllRecents)}
                style={{
                  alignSelf: 'center',
                  marginTop: '6px',
                  fontSize: '11.5px',
                  color: '#71717a',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#d1d5db')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
              >
                {showAllRecents ? 'Show Less' : 'Show More...'}
              </button>
            )}
          </div>
        )}

        {/* Extensions / Intelligence Card */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#9ca3af',
              letterSpacing: '0.1px',
              marginBottom: '4px',
            }}
          >
            CoreMind Extensions
          </div>

          <div
            style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Cpu size={16} color="#d1d5db" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#f3f4f6',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  CoreMind Live AI
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#71717a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Autonomous coding and repository intelligence.
                </span>
              </div>
            </div>

            <button
              type="button"
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: '#27272a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                fontSize: '11px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#323236';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#27272a';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              Active
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
