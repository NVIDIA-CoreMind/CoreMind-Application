import React, { useState } from 'react';
import {
  FolderOpen,
  X,
  FileText,
  Folder,
} from 'lucide-react';

const VscNewFile = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M9 1H3v14h7v-1H4V2h4.586l3.414 3.414V8h1V4.586L9 1zM9.5 2.207L11.793 4.5H9.5V2.207z"/>
    <path d="M15 11h-2V9h-1v2h-2v1h2v2h1v-2h2v-1z"/>
  </svg>
);

const VscNewFolder = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M14 4.5V8h-1V5.5l-.5-.5h-5.793L5 3.293V3H1.5L1 3.5v10l.5.5H8v-1H2V4h2.707l1.5 1.707.5.5H13.5z"/>
    <path d="M15 11h-2V9h-1v2h-2v1h2v2h1v-2h2v-1z"/>
  </svg>
);

const VscRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M4.681 3H2V2h3.5l.5.5V6H5V4a5 5 0 1 0 4.53-.761l.302-.953A6 6 0 1 1 4.681 3z"/>
  </svg>
);

const VscCollapseAll = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M9 3H3v6H2V2.5l.5-.5h6.5l.5.5V3zm2.5 3h-6l-.5.5v6.5l.5.5h6.5l.5-.5v-6.5l-.5-.5zM6 13V7h5v6H6zm-1-3h3v-1H5v1z"/>
  </svg>
);

const VscEllipsis = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M3 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </svg>
);

const VscChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"/>
  </svg>
);

const IconButton = ({ onClick, title, children }: { onClick?: (e: any) => void, title?: string, children: React.ReactNode }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px',
        borderRadius: '4px',
        color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: hover ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {children}
    </button>
  );
};
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useFilesStore } from '../stores/filesStore';
import { FileTree } from './FileTree';
import { ExplorerContextMenu, ContextMenuTarget } from './ExplorerContextMenu';
import { FileNode, FileStat } from '@shared/types/file';

export const FileExplorer: React.FC = () => {
  const { rootPath, rootName, openFolderDialog, isLoading, error: workspaceError } = useWorkspaceStore();
  const {
    fileTree,
    selectedPath,
    loadWorkspaceTree,
    error: filesError,
  } = useFilesStore();

  // Context menu state
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creatingInPath, setCreatingInPath] = useState<{ path: string; type: 'file' | 'folder' } | null>(null);

  // File Properties Info Modal
  const [propertiesNode, setPropertiesNode] = useState<FileNode | null>(null);
  const [propertiesStat, setPropertiesStat] = useState<FileStat | null>(null);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const handleOpenFolder = async () => {
    await openFolderDialog();
  };

  const handleRefresh = async () => {
    if (rootPath) {
      await loadWorkspaceTree(rootPath);
    }
  };

  const handleItemContextMenu = (e: React.MouseEvent, node: FileNode) => {
    setContextMenuTarget({
      type: node.isDirectory ? 'folder' : 'file',
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleShowProperties = async (node: FileNode) => {
    setPropertiesNode(node);
    setLoadingProperties(true);
    setPropertiesStat(null);
    if (rootPath && window.coreMindAPI?.stat) {
      try {
        const res = await window.coreMindAPI.stat(node.path, rootPath);
        if (res.success) {
          setPropertiesStat(res.data);
        }
      } catch {
        // Fallback to node metadata
      }
    }
    setLoadingProperties(false);
  };

  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatModifiedDate = (timestamp?: number): string => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  // Determine target directory: if a directory is selected, create inside it; otherwise create in workspace root
  const getTargetDirectory = (): string => {
    if (!rootPath) return '';
    if (selectedPath) {
      const findNode = (nodes: any[]): any => {
        for (const n of nodes) {
          if (n.path === selectedPath) return n;
          if (n.children) {
            const found = findNode(n.children);
            if (found) return found;
          }
        }
        return null;
      };
      const node = findNode(fileTree);
      if (node?.isDirectory) {
        return node.path;
      } else if (node) {
        return selectedPath.substring(0, selectedPath.lastIndexOf('/'));
      }
    }
    return rootPath;
  };



  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        overflow: 'hidden',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          height: '35px',
          padding: '0 10px 0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Explorer
        </span>
        <IconButton title="Views and More Actions...">
          <VscEllipsis />
        </IconButton>
      </div>

      {/* Explorer Workspace Sub-header */}
      {rootPath && (
        <div
          style={{
            padding: '2px 6px 2px 2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', overflow: 'hidden' }}>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <VscChevronDown />
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {rootName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                const targetDir = getTargetDirectory();
                setCreatingInPath({ path: targetDir, type: 'file' });
              }}
              title="New File..."
            >
              <VscNewFile />
            </IconButton>

            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                const targetDir = getTargetDirectory();
                setCreatingInPath({ path: targetDir, type: 'folder' });
              }}
              title="New Folder..."
            >
              <VscNewFolder />
            </IconButton>

            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              title="Refresh Explorer"
            >
              <VscRefresh />
            </IconButton>

            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                // Optional: Implement collapse all in tree logic
              }}
              title="Collapse Folders in Explorer"
            >
              <VscCollapseAll />
            </IconButton>
          </div>
        </div>
      )}

      {/* Main Content Tree Area */}
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          if (rootPath) {
            setContextMenuTarget({
              type: 'workspace',
              x: e.clientX,
              y: e.clientY,
            });
          }
        }}
        style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}
      >
        {/* Error notification */}
        {(workspaceError || filesError) && (
          <div
            style={{
              margin: '6px 8px',
              padding: '6px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '11px',
              color: '#F87171',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span>{workspaceError || filesError}</span>
          </div>
        )}

        {!rootPath ? (
          <div
            style={{
              padding: '28px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              No folder is open.
            </p>
            <button
              onClick={handleOpenFolder}
              disabled={isLoading}
              style={{
                padding: '6px 14px',
                borderRadius: '5px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              <FolderOpen size={14} />
              Open Folder
            </button>
          </div>
        ) : (
          <div>
            {/* Filesystem Tree with Right Click Context Menu */}
            <FileTree
              nodes={fileTree}
              onContextMenu={handleItemContextMenu}
              renamingPath={renamingPath}
              onFinishRename={() => setRenamingPath(null)}
              creatingInPath={creatingInPath}
              onFinishCreate={() => setCreatingInPath(null)}
            />
          </div>
        )}
      </div>
      {/* Right Click Context Menu */}
      {contextMenuTarget && (
        <ExplorerContextMenu
          target={contextMenuTarget}
          onClose={() => setContextMenuTarget(null)}
          onStartRename={(node) => setRenamingPath(node.path)}
          onStartCreateFile={(parentDir) => setCreatingInPath({ path: parentDir, type: 'file' })}
          onStartCreateFolder={(parentDir) => setCreatingInPath({ path: parentDir, type: 'folder' })}
          onShowProperties={handleShowProperties}
        />
      )}

      {/* Properties / Info Modal */}
      {propertiesNode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setPropertiesNode(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '380px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {propertiesNode.isDirectory ? (
                  <Folder size={18} color="#6366F1" />
                ) : (
                  <FileText size={18} color="#38BDF8" />
                )}
                <span style={{ fontWeight: 600, fontSize: '13px' }}>
                  {propertiesNode.isDirectory ? 'Folder Info' : 'File Info'}
                </span>
              </div>
              <button
                onClick={() => setPropertiesNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                  Name
                </span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{propertiesNode.name}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                  Path
                </span>
                <span
                  style={{
                    wordBreak: 'break-all',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-app)',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    display: 'block',
                  }}
                >
                  {propertiesNode.path}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                    Type
                  </span>
                  <span>{propertiesNode.isDirectory ? 'Directory' : propertiesNode.extension || 'File'}</span>
                </div>

                {!propertiesNode.isDirectory && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                      Size
                    </span>
                    <span>{loadingProperties ? 'Loading...' : formatFileSize(propertiesStat?.size ?? propertiesNode.size)}</span>
                  </div>
                )}
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
                  Last Modified
                </span>
                <span>{loadingProperties ? 'Loading...' : formatModifiedDate(propertiesStat?.lastModified ?? propertiesNode.lastModified)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setPropertiesNode(null)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
