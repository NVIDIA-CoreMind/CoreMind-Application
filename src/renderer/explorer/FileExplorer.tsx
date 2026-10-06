import React, { useState } from 'react';
import {
  FilePlus,
  FolderPlus,
  RefreshCw,
  FolderOpen,
  Plus,
  X,
  FileText,
  Folder,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useFilesStore } from '../stores/filesStore';
import { FileTree } from './FileTree';
import { ExplorerContextMenu, ContextMenuTarget } from './ExplorerContextMenu';
import { FileNode, FileStat } from '@shared/types/file';
import { CreateFileDialog } from '../components/CreateFileDialog';

export const FileExplorer: React.FC = () => {
  const { rootPath, rootName, openFolderDialog, isLoading, error: workspaceError } = useWorkspaceStore();
  const {
    fileTree,
    selectedPath,
    loadWorkspaceTree,
    createFile,
    createDirectory,
    error: filesError,
  } = useFilesStore();

  const [isCreatingFileDialogOpen, setIsCreatingFileDialogOpen] = useState(false);
  const [isCreatingFolderDialogOpen, setIsCreatingFolderDialogOpen] = useState(false);

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
          padding: '0 10px',
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
          EXPLORER
        </span>

        {rootPath && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              onClick={() => {
                setIsCreatingFileDialogOpen(true);
                setIsCreatingFolderDialogOpen(false);
              }}
              title="New File"
              style={{
                padding: '3px 5px',
                borderRadius: '3px',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <FilePlus size={13} />
            </button>

            <button
              onClick={() => {
                setIsCreatingFolderDialogOpen(true);
                setIsCreatingFileDialogOpen(false);
              }}
              title="New Folder"
              style={{
                padding: '3px 5px',
                borderRadius: '3px',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <FolderPlus size={13} />
            </button>

            <button
              onClick={handleRefresh}
              title="Refresh Explorer"
              style={{
                padding: '3px',
                borderRadius: '3px',
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Explorer Workspace Sub-header */}
      {rootPath && (
        <div
          style={{
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {rootName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => {
                setIsCreatingFileDialogOpen(true);
                setIsCreatingFolderDialogOpen(false);
              }}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: 'var(--bg-active)',
                color: 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Create new file in workspace"
            >
              <Plus size={10} />
              <span>File</span>
            </button>
            <button
              onClick={() => {
                setIsCreatingFolderDialogOpen(true);
                setIsCreatingFileDialogOpen(false);
              }}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: 'var(--bg-active)',
                color: 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Create new folder in workspace"
            >
              <Plus size={10} />
              <span>Folder</span>
            </button>
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

      <CreateFileDialog
        isOpen={isCreatingFileDialogOpen}
        title="Create New File"
        placeholder="e.g. main.py, package.json"
        errorMessage={filesError}
        onClose={() => setIsCreatingFileDialogOpen(false)}
        onSubmit={async (filename) => {
          if (!rootPath) return;
          const targetDir = getTargetDirectory();
          const success = await createFile(targetDir, filename, rootPath);
          if (success) {
            setIsCreatingFileDialogOpen(false);
          }
        }}
      />
      <CreateFileDialog
        isOpen={isCreatingFolderDialogOpen}
        title="Create New Folder"
        placeholder="e.g. components or lib/core"
        errorMessage={filesError}
        onClose={() => setIsCreatingFolderDialogOpen(false)}
        onSubmit={async (foldername) => {
          if (!rootPath) return;
          const targetDir = getTargetDirectory();
          const success = await createDirectory(targetDir, foldername, rootPath);
          if (success) {
            setIsCreatingFolderDialogOpen(false);
          }
        }}
      />
    </div>
  );
};
