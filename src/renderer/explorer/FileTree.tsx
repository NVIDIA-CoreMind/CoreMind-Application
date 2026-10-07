import React, { useState } from 'react';
import { FileNode } from '@shared/types/file';
import { FileTreeItem } from './FileTreeItem';
import { FileText, Folder } from 'lucide-react';
import { useFilesStore } from '../stores/filesStore';

interface FileTreeProps {
  nodes: FileNode[];
  rootPath?: string | null;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renamingPath?: string | null;
  onFinishRename?: () => void;
  creatingInPath?: { path: string; type: 'file' | 'folder' } | null;
  onFinishCreate?: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  rootPath,
  onContextMenu,
  renamingPath,
  onFinishRename,
  creatingInPath,
  onFinishCreate,
}) => {
  const { createFile, createDirectory } = useFilesStore();
  const [rootItemName, setRootItemName] = useState('');

  const isCreatingAtRoot = Boolean(
    creatingInPath &&
      rootPath &&
      (creatingInPath.path === rootPath || !creatingInPath.path)
  );

  const handleRootCreateSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = rootItemName.trim();
    if (!rootPath || !trimmed || !creatingInPath) {
      onFinishCreate?.();
      setRootItemName('');
      return;
    }
    if (creatingInPath.type === 'file') {
      await createFile(rootPath, trimmed, rootPath);
    } else {
      await createDirectory(rootPath, trimmed, rootPath);
    }
    setRootItemName('');
    onFinishCreate?.();
  };

  if (nodes.length === 0 && !isCreatingAtRoot) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
        Folder is empty
      </div>
    );
  }

  return (
    <div style={{ padding: '2px 0' }}>
      {/* Inline Create directly at workspace root */}
      {isCreatingAtRoot && creatingInPath && (
        <form
          onSubmit={handleRootCreateSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            height: '24px',
            paddingLeft: '26px',
            paddingRight: '8px',
            backgroundColor: 'var(--bg-active)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {creatingInPath.type === 'file' ? (
            <FileText size={14} color="var(--text-muted)" />
          ) : (
            <Folder size={14} color="#6366F1" />
          )}
          <input
            autoFocus
            type="text"
            placeholder={creatingInPath.type === 'file' ? 'File name...' : 'Folder name...'}
            value={rootItemName}
            onChange={(e) => setRootItemName(e.target.value)}
            onBlur={() => {
              if (rootItemName.trim()) {
                void handleRootCreateSubmit();
              } else {
                onFinishCreate?.();
                setRootItemName('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onFinishCreate?.();
                setRootItemName('');
              }
            }}
            style={{
              height: '20px',
              fontSize: '12px',
              flex: 1,
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              border: '1px solid var(--accent, #3b82f6)',
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
    </div>
  );
};
