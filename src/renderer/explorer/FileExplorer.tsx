import React, { useState } from 'react';
import {
  FilePlus,
  FolderPlus,
  RefreshCw,
  FolderOpen,
  Plus,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useFilesStore } from '../stores/filesStore';
import { FileTree } from './FileTree';

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

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleOpenFolder = async () => {
    await openFolderDialog();
  };

  const handleRefresh = async () => {
    if (rootPath) {
      await loadWorkspaceTree(rootPath);
    }
  };

  // Determine target directory: if a directory is selected, create inside it; otherwise create in workspace root
  const getTargetDirectory = (): string => {
    if (!rootPath) return '';
    if (selectedPath) {
      // Find if selectedPath is a directory in tree
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
        // If file is selected, use its parent directory
        return selectedPath.substring(0, selectedPath.lastIndexOf('/'));
      }
    }
    return rootPath;
  };

  const validateName = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError('Name cannot be empty.');
      return false;
    }
    if (trimmed.includes('..')) {
      setValidationError('Path traversal (..) is not allowed.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleCreateFile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = newFileName.trim();
    if (!validateName(name) || !rootPath) return;

    const targetDir = getTargetDirectory();
    const success = await createFile(targetDir, name, rootPath);
    if (success) {
      setIsCreatingFile(false);
      setNewFileName('');
      setValidationError(null);
    }
  };

  const handleCreateFolder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = newFolderName.trim();
    if (!validateName(name) || !rootPath) return;

    const targetDir = getTargetDirectory();
    const success = await createDirectory(targetDir, name, rootPath);
    if (success) {
      setIsCreatingFolder(false);
      setNewFolderName('');
      setValidationError(null);
    }
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
                setIsCreatingFile(true);
                setIsCreatingFolder(false);
                setValidationError(null);
              }}
              title="New File"
              style={{
                padding: '3px 5px',
                borderRadius: '3px',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                gap: '3px',
              }}
            >
              <FilePlus size={13} />
            </button>

            <button
              onClick={() => {
                setIsCreatingFolder(true);
                setIsCreatingFile(false);
                setValidationError(null);
              }}
              title="New Folder"
              style={{
                padding: '3px 5px',
                borderRadius: '3px',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                gap: '3px',
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
                setIsCreatingFile(true);
                setIsCreatingFolder(false);
              }}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: 'var(--bg-active)',
                color: 'var(--text-secondary)',
                gap: '3px',
              }}
              title="Create new file in workspace"
            >
              <Plus size={10} />
              <span>File</span>
            </button>
            <button
              onClick={() => {
                setIsCreatingFolder(true);
                setIsCreatingFile(false);
              }}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: 'var(--bg-active)',
                color: 'var(--text-secondary)',
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {/* Error notification */}
        {(workspaceError || filesError || validationError) && (
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
            <span>{validationError || workspaceError || filesError}</span>
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
                gap: '6px',
                width: '100%',
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
            {/* Inline New File Form */}
            {isCreatingFile && (
              <form
                onSubmit={handleCreateFile}
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  File name:
                </div>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Button.tsx or utils/helper.ts"
                  value={newFileName}
                  onChange={(e) => {
                    setNewFileName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsCreatingFile(false);
                      setNewFileName('');
                      setValidationError(null);
                    }
                  }}
                  style={{ width: '100%', height: '24px', fontSize: '11px' }}
                />
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFile(false);
                      setNewFileName('');
                      setValidationError(null);
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--accent)',
                      color: '#ffffff',
                      fontWeight: 500,
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Inline New Folder Form */}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolder}
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Folder name:
                </div>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. components or lib/core"
                  value={newFolderName}
                  onChange={(e) => {
                    setNewFolderName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                      setValidationError(null);
                    }
                  }}
                  style={{ width: '100%', height: '24px', fontSize: '11px' }}
                />
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                      setValidationError(null);
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--accent)',
                      color: '#ffffff',
                      fontWeight: 500,
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Filesystem Tree */}
            <FileTree nodes={fileTree} />
          </div>
        )}
      </div>
    </div>
  );
};
