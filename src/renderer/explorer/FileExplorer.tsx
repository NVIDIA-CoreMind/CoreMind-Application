import React, { useState } from 'react';
import { FolderOpen, FilePlus, FolderPlus, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useFilesStore } from '../stores/filesStore';
import { FileTree } from './FileTree';

export const FileExplorer: React.FC = () => {
  const { rootPath, rootName, openFolderDialog, isLoading } = useWorkspaceStore();
  const {
    fileTree,
    loadWorkspaceTree,
    createFile,
    createDirectory,
  } = useFilesStore();

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleOpenFolder = async () => {
    const selected = await openFolderDialog();
    if (selected) {
      await loadWorkspaceTree(selected);
    }
  };

  const handleRefresh = async () => {
    if (rootPath) {
      await loadWorkspaceTree(rootPath);
    }
  };

  const handleCreateRootFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !newFileName.trim()) {
      setIsCreatingFile(false);
      return;
    }
    await createFile(rootPath, newFileName.trim(), rootPath);
    setIsCreatingFile(false);
    setNewFileName('');
  };

  const handleCreateRootFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    await createDirectory(rootPath, newFolderName.trim(), rootPath);
    setIsCreatingFolder(false);
    setNewFolderName('');
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
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rootName ? rootName : 'Explorer'}
        </span>

        {rootPath && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setIsCreatingFile(true)}
              title="New File"
              style={{ padding: '3px', color: 'var(--text-muted)' }}
            >
              <FilePlus size={14} />
            </button>
            <button
              onClick={() => setIsCreatingFolder(true)}
              title="New Folder"
              style={{ padding: '3px', color: 'var(--text-muted)' }}
            >
              <FolderPlus size={14} />
            </button>
            <button
              onClick={handleRefresh}
              title="Refresh Explorer"
              style={{ padding: '3px', color: 'var(--text-muted)' }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!rootPath ? (
          <div
            style={{
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              No folder is currently open in this workspace.
            </p>
            <button
              onClick={handleOpenFolder}
              disabled={isLoading}
              style={{
                padding: '6px 14px',
                borderRadius: '5px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                gap: '6px',
                width: '100%',
              }}
            >
              <FolderOpen size={14} />
              Open Folder
            </button>
          </div>
        ) : (
          <div>
            {/* Inline Root File Creation */}
            {isCreatingFile && (
              <form
                onSubmit={handleCreateRootFile}
                style={{ padding: '4px 12px', backgroundColor: 'var(--bg-panel)' }}
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="New file name..."
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onBlur={() => setIsCreatingFile(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsCreatingFile(false);
                  }}
                  style={{ width: '100%', height: '22px' }}
                />
              </form>
            )}

            {/* Inline Root Folder Creation */}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateRootFolder}
                style={{ padding: '4px 12px', backgroundColor: 'var(--bg-panel)' }}
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="New folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => setIsCreatingFolder(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsCreatingFolder(false);
                  }}
                  style={{ width: '100%', height: '22px' }}
                />
              </form>
            )}

            <FileTree nodes={fileTree} />
          </div>
        )}
      </div>
    </div>
  );
};
