import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Trash2,
  Edit2,
  FilePlus,
  FolderPlus,
} from 'lucide-react';
import { FileNode } from '@shared/types/file';
import { useFilesStore } from '../stores/filesStore';
import { useTabsStore } from '../stores/tabsStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { FileIcon } from '../components/FileIcon';

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({ node, depth }) => {
  const { rootPath } = useWorkspaceStore();
  const {
    expandedPaths,
    selectedPath,
    toggleFolder,
    setSelectedPath,
    createFile,
    createDirectory,
    renameItem,
    deleteItem,
  } = useFilesStore();
  const { openFile } = useTabsStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  // File icon helper
  const renderIcon = () => {
    if (node.isDirectory) {
      return isExpanded ? (
        <FolderOpen size={14} color="#818CF8" />
      ) : (
        <Folder size={14} color="#6366F1" />
      );
    }
    return <FileIcon path={node.path} size={14} />;
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

  const handleRenameSubmit = async (e: React.FormEvent | React.FocusEvent) => {
    e.preventDefault();
    if (!rootPath || !renameValue.trim() || renameValue === node.name) {
      setIsRenaming(false);
      return;
    }
    const parentDir = node.path.substring(0, node.path.lastIndexOf('/'));
    const newPath = `${parentDir}/${renameValue.trim()}`;
    await renameItem(node.path, newPath, rootPath);
    setIsRenaming(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rootPath) return;
    const confirm = window.confirm(`Are you sure you want to delete "${node.name}"?`);
    if (confirm) {
      await deleteItem(node.path, rootPath);
    }
  };

  const handleCreateFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !newFileName.trim()) {
      setIsCreatingFile(false);
      return;
    }
    await createFile(node.path, newFileName.trim(), rootPath);
    setIsCreatingFile(false);
    setNewFileName('');
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    await createDirectory(node.path, newFolderName.trim(), rootPath);
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  return (
    <div>
      <div
        onClick={handleClick}
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
                  }
                }}
                style={{
                  height: '20px',
                  padding: '1px 4px',
                  fontSize: '12px',
                  width: '90%',
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

        {/* Hover Actions */}
        {!isRenaming && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              opacity: isSelected ? 1 : 0.6,
            }}
          >
            {node.isDirectory && (
              <>
                <button
                  onClick={() => setIsCreatingFile(true)}
                  title="New File"
                  style={{ padding: '2px', color: 'var(--text-muted)' }}
                >
                  <FilePlus size={11} />
                </button>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  title="New Folder"
                  style={{ padding: '2px', color: 'var(--text-muted)' }}
                >
                  <FolderPlus size={11} />
                </button>
              </>
            )}
            <button
              onClick={() => {
                setRenameValue(node.name);
                setIsRenaming(true);
              }}
              title="Rename"
              style={{ padding: '2px', color: 'var(--text-muted)' }}
            >
              <Edit2 size={11} />
            </button>
            <button
              onClick={handleDelete}
              title="Delete"
              style={{ padding: '2px', color: 'var(--error)' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Inline Create File inside folder */}
      {isCreatingFile && (
        <form
          onSubmit={handleCreateFileSubmit}
          style={{
            paddingLeft: `${(depth + 1) * 14 + 16}px`,
            paddingTop: '2px',
            paddingBottom: '2px',
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="File name..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => setIsCreatingFile(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsCreatingFile(false);
            }}
            style={{ height: '20px', fontSize: '11px', width: '90%' }}
          />
        </form>
      )}

      {/* Inline Create Folder inside folder */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolderSubmit}
          style={{
            paddingLeft: `${(depth + 1) * 14 + 16}px`,
            paddingTop: '2px',
            paddingBottom: '2px',
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => setIsCreatingFolder(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsCreatingFolder(false);
            }}
            style={{ height: '20px', fontSize: '11px', width: '90%' }}
          />
        </form>
      )}

      {/* Render Children */}
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
