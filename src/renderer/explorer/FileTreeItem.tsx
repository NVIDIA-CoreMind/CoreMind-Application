import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  FileJson,
} from 'lucide-react';
import { FileNode } from '@shared/types/file';
import { useFilesStore } from '../stores/filesStore';
import { useTabsStore } from '../stores/tabsStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renamingPath?: string | null;
  onFinishRename?: () => void;
  creatingInPath?: { path: string; type: 'file' | 'folder' } | null;
  onFinishCreate?: () => void;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  depth,
  onContextMenu,
  renamingPath,
  onFinishRename,
  creatingInPath,
  onFinishCreate,
}) => {
  const { rootPath } = useWorkspaceStore();
  const {
    expandedPaths,
    selectedPath,
    toggleFolder,
    setSelectedPath,
    createFile,
    createDirectory,
    renameItem,
  } = useFilesStore();
  const { openFile } = useTabsStore();

  const [isRenaming, setIsRenaming] = useState(renamingPath === node.path);
  const [renameValue, setRenameValue] = useState(node.name);
  const [newItemName, setNewItemName] = useState('');

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isCreatingInside = creatingInPath && creatingInPath.path === node.path;

  useEffect(() => {
    if (renamingPath === node.path) {
      setIsRenaming(true);
      setRenameValue(node.name);
    } else {
      setIsRenaming(false);
    }
  }, [renamingPath, node.path, node.name]);

  // File icon helper
  const renderIcon = () => {
    if (node.isDirectory) {
      return isExpanded ? (
        <FolderOpen size={14} color="#818CF8" />
      ) : (
        <Folder size={14} color="#6366F1" />
      );
    }
    const ext = node.extension?.toLowerCase();
    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
      return <FileCode size={14} color="#38BDF8" />;
    }
    if (ext === '.json') {
      return <FileJson size={14} color="#FBBF24" />;
    }
    if (ext === '.md' || ext === '.txt') {
      return <FileText size={14} color="#94A3B8" />;
    }
    if (ext === '.py') {
      return <FileCode size={14} color="#4ADE80" />;
    }
    return <File size={14} color="#94A3B8" />;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPath(node.path);
    if (!rootPath) return;

    if (node.isDirectory) {
      toggleFolder(node.path, rootPath);
    } else {
      openFile(node.path, node.name, rootPath);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPath(node.path);
    onContextMenu(e, node);
  };

  const handleRenameSubmit = async (e: React.FormEvent | React.FocusEvent) => {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!rootPath || !trimmed || trimmed === node.name) {
      setIsRenaming(false);
      onFinishRename?.();
      return;
    }
    const parentDir = node.path.substring(0, node.path.lastIndexOf('/'));
    const newPath = `${parentDir}/${trimmed}`;
    await renameItem(node.path, newPath, rootPath);
    setIsRenaming(false);
    onFinishRename?.();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !newItemName.trim() || !creatingInPath) {
      onFinishCreate?.();
      setNewItemName('');
      return;
    }
    if (creatingInPath.type === 'file') {
      await createFile(node.path, newItemName.trim(), rootPath);
    } else {
      await createDirectory(node.path, newItemName.trim(), rootPath);
    }
    setNewItemName('');
    onFinishCreate?.();
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '24px',
          paddingLeft: `${depth * 14 + 8}px`,
          paddingRight: '6px',
          cursor: 'pointer',
          backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
          borderRadius: '3px',
          position: 'relative',
        }}
        className="tree-item-row"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', flex: 1 }}>
          {/* Chevron for folder */}
          {node.isDirectory ? (
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          ) : (
            <span style={{ width: '13px' }} />
          )}

          {renderIcon()}

          {/* Label or Rename Input */}
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsRenaming(false);
                    setRenameValue(node.name);
                    onFinishRename?.();
                  }
                }}
                style={{
                  height: '20px',
                  padding: '1px 4px',
                  fontSize: '12px',
                  width: '90%',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--accent)',
                  borderRadius: '2px',
                  outline: 'none',
                }}
              />
            </form>
          ) : (
            <span
              style={{
                fontSize: '12px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {node.name}
            </span>
          )}
        </div>
      </div>

      {/* Inline Create inside folder when triggered */}
      {isCreatingInside && (
        <form
          onSubmit={handleCreateSubmit}
          style={{
            paddingLeft: `${(depth + 1) * 14 + 16}px`,
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

      {/* Render Children */}
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              onFinishRename={onFinishRename}
              creatingInPath={creatingInPath}
              onFinishCreate={onFinishCreate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
