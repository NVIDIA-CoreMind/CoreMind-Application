import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  FolderOpen,
  Edit2,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  ExternalLink,
  Info,
  Folder,
  Columns,
} from 'lucide-react';
import {
  NewFileCodicon,
  NewFolderCodicon,
  RefreshCodicon,
  CollapseAllCodicon,
} from '../components/Codicons';
import { FileNode } from '@shared/types/file';
import { useFilesStore } from '../stores/filesStore';
import { useTabsStore } from '../stores/tabsStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { isMacClient } from '../../shared/utils/shortcuts';

export interface ContextMenuTarget {
  type: 'file' | 'folder' | 'workspace';
  x: number;
  y: number;
  node?: FileNode;
}

interface ExplorerContextMenuProps {
  target: ContextMenuTarget;
  onClose: () => void;
  onStartRename?: (node: FileNode) => void;
  onStartCreateFile?: (parentDir: string) => void;
  onStartCreateFolder?: (parentDir: string) => void;
  onShowProperties?: (node: FileNode) => void;
}

interface MenuItemDef {
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export const ExplorerContextMenu: React.FC<ExplorerContextMenuProps> = ({
  target,
  onClose,
  onStartRename,
  onStartCreateFile,
  onStartCreateFolder,
  onShowProperties,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { rootPath } = useWorkspaceStore();
  const {
    clipboardItem,
    setClipboardItem,
    pasteItem,
    deleteItem,
    loadWorkspaceTree,
    toggleFolder,
    collapseAll,
    revealInExplorer,
    expandedPaths,
  } = useFilesStore();
  const { openFile } = useTabsStore();

  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const node = target.node;

  // Calculate relative path
  const getRelativePath = (fullPath: string): string => {
    if (!rootPath) return fullPath;
    const cleanRoot = rootPath.replace(/[/\\]+$/, '');
    if (fullPath.startsWith(cleanRoot)) {
      return fullPath.substring(cleanRoot.length).replace(/^[/\\]+/, '');
    }
    return fullPath;
  };

  // Target parent directory for creating new items
  const getParentDirectory = (): string => {
    if (!rootPath) return '';
    if (target.type === 'folder' && node) {
      return node.path;
    }
    if (target.type === 'file' && node) {
      return node.path.substring(0, node.path.lastIndexOf('/'));
    }
    return rootPath;
  };

  // Close on outside click or Escape
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust menu position so it stays inside viewport
  const [position, setPosition] = useState({ x: target.x, y: target.y });
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 10;
      const maxY = window.innerHeight - rect.height - 10;
      setPosition({
        x: Math.max(10, Math.min(target.x, maxX)),
        y: Math.max(10, Math.min(target.y, maxY)),
      });
    }
  }, [target.x, target.y]);

  const handleCopyPath = () => {
    if (node) {
      navigator.clipboard.writeText(node.path);
    } else if (rootPath) {
      navigator.clipboard.writeText(rootPath);
    }
    onClose();
  };

  const handleCopyRelativePath = () => {
    if (node) {
      navigator.clipboard.writeText(getRelativePath(node.path));
    } else {
      navigator.clipboard.writeText('.');
    }
    onClose();
  };

  const handleCut = () => {
    if (node) {
      setClipboardItem({
        path: node.path,
        name: node.name,
        isDirectory: node.isDirectory,
        operation: 'cut',
      });
    }
    onClose();
  };

  const handleCopy = () => {
    if (node) {
      setClipboardItem({
        path: node.path,
        name: node.name,
        isDirectory: node.isDirectory,
        operation: 'copy',
      });
    }
    onClose();
  };

  const handlePaste = async () => {
    if (!rootPath || !clipboardItem) return;
    const destDir = getParentDirectory();
    await pasteItem(destDir, rootPath);
    onClose();
  };

  const handleDelete = async () => {
    if (!node || !rootPath) return;
    onClose();
    const confirmed = window.confirm(
      `Are you sure you want to delete "${node.name}"?`
    );
    if (confirmed) {
      await deleteItem(node.path, rootPath);
    }
  };

  const handleReveal = async () => {
    const itemPath = node?.path || rootPath;
    if (itemPath) {
      await revealInExplorer(itemPath);
    }
    onClose();
  };

  const handleRefresh = async () => {
    if (rootPath) {
      await loadWorkspaceTree(rootPath);
    }
    onClose();
  };

  // Build menu items based on type
  const items: MenuItemDef[] = [];

  if (target.type === 'file' && node) {
    items.push(
      {
        label: 'Open',
        icon: <FileText size={13} />,
        action: () => {
          if (rootPath) openFile(node.path, node.name, rootPath);
          onClose();
        },
      },
      {
        label: 'Open to the Side',
        icon: <Columns size={13} />,
        action: () => {
          if (rootPath) openFile(node.path, node.name, rootPath);
          onClose();
        },
      },
      { separator: true },
      {
        label: 'Cut',
        icon: <Scissors size={13} />,
        shortcut: isMac ? '⌘X' : 'Ctrl+X',
        action: handleCut,
      },
      {
        label: 'Copy',
        icon: <Copy size={13} />,
        shortcut: isMac ? '⌘C' : 'Ctrl+C',
        action: handleCopy,
      },
      {
        label: 'Paste',
        icon: <Clipboard size={13} />,
        shortcut: isMac ? '⌘V' : 'Ctrl+V',
        disabled: !clipboardItem,
        action: handlePaste,
      },
      { separator: true },
      {
        label: 'Copy Path',
        action: handleCopyPath,
      },
      {
        label: 'Copy Relative Path',
        action: handleCopyRelativePath,
      },
      {
        label: isMac ? 'Reveal in Finder' : 'Reveal in File Explorer',
        icon: <ExternalLink size={13} />,
        action: handleReveal,
      },
      { separator: true },
      {
        label: 'Rename...',
        icon: <Edit2 size={13} />,
        shortcut: 'Enter',
        action: () => {
          onClose();
          onStartRename?.(node);
        },
      },
      {
        label: 'Delete',
        icon: <Trash2 size={13} />,
        danger: true,
        action: handleDelete,
      },
      { separator: true },
      {
        label: 'New File',
        icon: <NewFileCodicon size={14} />,
        action: () => {
          onClose();
          onStartCreateFile?.(getParentDirectory());
        },
      },
      {
        label: 'New Folder',
        icon: <NewFolderCodicon size={14} />,
        action: () => {
          onClose();
          onStartCreateFolder?.(getParentDirectory());
        },
      },
      {
        label: 'Refresh',
        icon: <RefreshCodicon size={14} />,
        action: handleRefresh,
      },
      { separator: true },
      {
        label: 'Properties / Info',
        icon: <Info size={13} />,
        action: () => {
          onClose();
          onShowProperties?.(node);
        },
      }
    );
  } else if (target.type === 'folder' && node) {
    const isExpanded = expandedPaths.has(node.path);
    items.push(
      {
        label: isExpanded ? 'Collapse' : 'Expand',
        icon: isExpanded ? <Folder size={13} /> : <FolderOpen size={13} />,
        action: () => {
          if (rootPath) void toggleFolder(node.path, rootPath);
          onClose();
        },
      },
      { separator: true },
      {
        label: 'New File',
        icon: <NewFileCodicon size={14} />,
        action: () => {
          onClose();
          onStartCreateFile?.(node.path);
        },
      },
      {
        label: 'New Folder',
        icon: <NewFolderCodicon size={14} />,
        action: () => {
          onClose();
          onStartCreateFolder?.(node.path);
        },
      },
      { separator: true },
      {
        label: 'Cut',
        icon: <Scissors size={13} />,
        shortcut: isMac ? '⌘X' : 'Ctrl+X',
        action: handleCut,
      },
      {
        label: 'Copy',
        icon: <Copy size={13} />,
        shortcut: isMac ? '⌘C' : 'Ctrl+C',
        action: handleCopy,
      },
      {
        label: 'Paste',
        icon: <Clipboard size={13} />,
        shortcut: isMac ? '⌘V' : 'Ctrl+V',
        disabled: !clipboardItem,
        action: handlePaste,
      },
      { separator: true },
      {
        label: 'Copy Path',
        action: handleCopyPath,
      },
      {
        label: 'Copy Relative Path',
        action: handleCopyRelativePath,
      },
      {
        label: isMac ? 'Reveal in Finder' : 'Reveal in File Explorer',
        icon: <ExternalLink size={13} />,
        action: handleReveal,
      },
      { separator: true },
      {
        label: 'Rename...',
        icon: <Edit2 size={13} />,
        action: () => {
          onClose();
          onStartRename?.(node);
        },
      },
      {
        label: 'Delete',
        icon: <Trash2 size={13} />,
        danger: true,
        action: handleDelete,
      },
      { separator: true },
      {
        label: 'Refresh',
        icon: <RefreshCodicon size={14} />,
        action: handleRefresh,
      },
      { separator: true },
      {
        label: 'Properties / Info',
        icon: <Info size={13} />,
        action: () => {
          onClose();
          onShowProperties?.(node);
        },
      }
    );
  } else {
    // Workspace / Empty area
    items.push(
      {
        label: 'New File',
        icon: <NewFileCodicon size={14} />,
        action: () => {
          onClose();
          onStartCreateFile?.(rootPath || '');
        },
      },
      {
        label: 'New Folder',
        icon: <NewFolderCodicon size={14} />,
        action: () => {
          onClose();
          onStartCreateFolder?.(rootPath || '');
        },
      },
      { separator: true },
      {
        label: 'Paste',
        icon: <Clipboard size={13} />,
        disabled: !clipboardItem,
        action: handlePaste,
      },
      { separator: true },
      {
        label: 'Refresh',
        icon: <RefreshCodicon size={14} />,
        action: handleRefresh,
      },
      {
        label: 'Collapse Folders in Explorer',
        icon: <CollapseAllCodicon size={14} />,
        action: () => {
          collapseAll();
          onClose();
        },
      },
      {
        label: isMac ? 'Reveal in Finder' : 'Reveal in File Explorer',
        icon: <ExternalLink size={13} />,
        action: handleReveal,
      }
    );
  }

  return (
    <div
      ref={menuRef}
      className="app-no-drag"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: '200px',
        maxWidth: '280px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        padding: '4px 0',
        zIndex: 9999,
        userSelect: 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: '12px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${idx}`}
              style={{
                height: '1px',
                backgroundColor: 'var(--border-color)',
                margin: '4px 0',
              }}
            />
          );
        }

        return (
          <div
            key={item.label || idx}
            onClick={() => {
              if (item.disabled) return;
              item.action?.();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              fontSize: '12px',
              color: item.disabled
                ? 'var(--text-muted)'
                : item.danger
                ? 'var(--error)'
                : 'var(--text-primary)',
              cursor: item.disabled ? 'default' : 'pointer',
              backgroundColor: 'transparent',
              opacity: item.disabled ? 0.5 : 1,
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = item.danger
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'var(--bg-hover)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {item.icon && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: item.danger ? 'var(--error)' : 'var(--text-secondary)',
                  }}
                >
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </div>

            {item.shortcut && (
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginLeft: '20px',
                }}
              >
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
