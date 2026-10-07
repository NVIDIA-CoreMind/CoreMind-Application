import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  X,
  FileText,
  Folder,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  NewFileCodicon,
  NewFolderCodicon,
  RefreshCodicon,
  CollapseAllCodicon,
  EllipsisCodicon,
} from '../components/Codicons';
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
    expandedPaths,
    loadWorkspaceTree,
    toggleFolder,
    collapseAll,
    error: filesError,
  } = useFilesStore();

  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creatingInPath, setCreatingInPath] = useState<{ path: string; type: 'file' | 'folder' } | null>(null);

  // File Properties Info Modal
  const [propertiesNode, setPropertiesNode] = useState<FileNode | null>(null);
  const [propertiesStat, setPropertiesStat] = useState<FileStat | null>(null);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMoreMenuOpen]);

  const handleOpenFolder = async () => {
    await openFolderDialog();
  };

  const handleRefresh = async () => {
    if (rootPath) {
      setIsRefreshing(true);
      try {
        await loadWorkspaceTree(rootPath);
      } finally {
        setTimeout(() => setIsRefreshing(false), 350);
      }
    }
  };

  const handleStartCreate = async (type: 'file' | 'folder') => {
    if (!rootPath) return;
    setIsWorkspaceExpanded(true);

    let targetDir = rootPath;
    if (selectedPath) {
      const findNode = (nodes: FileNode[]): FileNode | null => {
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
        targetDir = node.path;
        if (!expandedPaths.has(node.path)) {
          await toggleFolder(node.path, rootPath);
        }
      } else if (node) {
        targetDir = selectedPath.substring(0, selectedPath.lastIndexOf('/')) || rootPath;
      }
    }

    setCreatingInPath({ path: targetDir, type });
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

  const actionBtnStyle: React.CSSProperties = {
    width: '22px',
    height: '22px',
    padding: 0,
    borderRadius: '3px',
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.1s, color 0.1s',
  };

  const handleActionBtnEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'var(--bg-active, rgba(255, 255, 255, 0.08))';
    e.currentTarget.style.color = 'var(--text-primary)';
  };

  const handleActionBtnLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = 'var(--text-secondary)';
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
      {/* 1. Explorer Top Header Bar */}
      <div
        style={{
          height: '35px',
          padding: '0 8px 0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.5px',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Explorer
        </span>

        {/* More Actions (...) button */}
        <div ref={moreMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsMoreMenuOpen((v) => !v)}
            title="More Actions..."
            style={actionBtnStyle}
            onMouseEnter={handleActionBtnEnter}
            onMouseLeave={handleActionBtnLeave}
          >
            <EllipsisCodicon size={16} />
          </button>

          {isMoreMenuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '26px',
                minWidth: '200px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                padding: '4px 0',
                zIndex: 1000,
                fontSize: '12px',
                userSelect: 'none',
              }}
            >
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  void handleRefresh();
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '12px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-active)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RefreshCodicon size={14} />
                <span>Refresh Explorer</span>
              </button>
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  collapseAll();
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '12px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-active)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <CollapseAllCodicon size={14} />
                <span>Collapse Folders in Explorer</span>
              </button>
              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  void handleOpenFolder();
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '12px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-active)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FolderOpen size={14} />
                <span>Open Folder...</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Workspace Section Header with Action Icons */}
      {rootPath && (
        <div
          style={{
            height: '26px',
            padding: '0 8px 0 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
          className="explorer-workspace-section-header"
        >
          {/* Left: Chevron + Workspace Root Name */}
          <div
            onClick={() => setIsWorkspaceExpanded((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflow: 'hidden',
              cursor: 'pointer',
              flex: 1,
              userSelect: 'none',
              paddingRight: '6px',
            }}
            title={rootPath}
          >
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
              {isWorkspaceExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                letterSpacing: '0.2px',
              }}
            >
              {rootName}
            </span>
          </div>

          {/* Right: 4 Action Symbols (New File, New Folder, Refresh, Collapse Folders) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleStartCreate('file');
              }}
              title="New File..."
              style={actionBtnStyle}
              onMouseEnter={handleActionBtnEnter}
              onMouseLeave={handleActionBtnLeave}
            >
              <NewFileCodicon size={16} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleStartCreate('folder');
              }}
              title="New Folder..."
              style={actionBtnStyle}
              onMouseEnter={handleActionBtnEnter}
              onMouseLeave={handleActionBtnLeave}
            >
              <NewFolderCodicon size={16} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleRefresh();
              }}
              title="Refresh Explorer"
              style={actionBtnStyle}
              onMouseEnter={handleActionBtnEnter}
              onMouseLeave={handleActionBtnLeave}
            >
              <RefreshCodicon
                size={16}
                style={{
                  transition: 'transform 0.4s ease',
                  transform: isRefreshing ? 'rotate(360deg)' : 'none',
                }}
              />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                collapseAll();
              }}
              title="Collapse Folders in Explorer"
              style={actionBtnStyle}
              onMouseEnter={handleActionBtnEnter}
              onMouseLeave={handleActionBtnLeave}
            >
              <CollapseAllCodicon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Content Tree Area */}
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
        ) : isWorkspaceExpanded ? (
          <div>
            {/* Filesystem Tree with Right Click Context Menu */}
            <FileTree
              nodes={fileTree}
              rootPath={rootPath}
              onContextMenu={handleItemContextMenu}
              renamingPath={renamingPath}
              onFinishRename={() => setRenamingPath(null)}
              creatingInPath={creatingInPath}
              onFinishCreate={() => setCreatingInPath(null)}
            />
          </div>
        ) : null}
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
