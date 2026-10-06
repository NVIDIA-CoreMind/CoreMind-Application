import React, { useState } from 'react';
import { FileNode } from '@shared/types/file';
import { FileTreeItem } from './FileTreeItem';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useFilesStore } from '../stores/filesStore';

interface FileTreeProps {
  nodes: FileNode[];
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renamingPath?: string | null;
  onFinishRename?: () => void;
  creatingInPath?: { path: string; type: 'file' | 'folder' } | null;
  onFinishCreate?: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  onContextMenu,
  renamingPath,
  onFinishRename,
  creatingInPath,
  onFinishCreate,
}) => {
  const { rootPath } = useWorkspaceStore();
  const { createFile, createDirectory } = useFilesStore();
  const [newItemName, setNewItemName] = useState('');

  const isCreatingInRoot = creatingInPath && rootPath && creatingInPath.path === rootPath;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !newItemName.trim() || !creatingInPath) {
      onFinishCreate?.();
      setNewItemName('');
      return;
    }
    if (creatingInPath.type === 'file') {
      await createFile(rootPath, newItemName.trim(), rootPath);
    } else {
      await createDirectory(rootPath, newItemName.trim(), rootPath);
    }
    setNewItemName('');
    onFinishCreate?.();
  };

  return (
    <div style={{ padding: '4px 0' }}>
      {isCreatingInRoot && (
        <form
          onSubmit={handleCreateSubmit}
          style={{
            paddingLeft: '22px', // matches depth 0 (8px + 14px for chevron space ideally)
            paddingTop: '2px',
            paddingBottom: '2px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            type="text"
            placeholder={creatingInPath.type === 'file' ? 'File name...' : 'Folder name...'}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onBlur={() => {
              onFinishCreate?.();
              setNewItemName('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onFinishCreate?.();
                setNewItemName('');
              }
            }}
            style={{
              height: '20px',
              fontSize: '11px',
              width: '90%',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              border: '1px solid var(--accent)',
              borderRadius: '2px',
              outline: 'none',
              padding: '1px 4px',
            }}
          />
        </form>
      )}
      {nodes.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          depth={0}
          onContextMenu={onContextMenu}
          renamingPath={renamingPath}
          onFinishRename={onFinishRename}
          creatingInPath={creatingInPath}
          onFinishCreate={onFinishCreate}
        />
      ))}
      {nodes.length === 0 && !isCreatingInRoot && (
        <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
          Folder is empty
        </div>
      )}
    </div>
  );
};
