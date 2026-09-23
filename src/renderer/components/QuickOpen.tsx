import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useFilesStore } from '../stores/filesStore';
import { useTabsStore } from '../stores/tabsStore';
import { FileNode } from '@shared/types/file';

export const QuickOpen: React.FC = () => {
  const { isQuickOpenOpen, setQuickOpenOpen } = useUiStore();
  const { rootPath } = useWorkspaceStore();
  const { fileTree } = useFilesStore();
  const { openFile } = useTabsStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten tree into all files
  const getAllFiles = (nodes: FileNode[]): FileNode[] => {
    let result: FileNode[] = [];
    for (const node of nodes) {
      if (!node.isDirectory) {
        result.push(node);
      }
      if (node.children) {
        result = result.concat(getAllFiles(node.children));
      }
    }
    return result;
  };

  const allFiles = getAllFiles(fileTree);
  const filteredFiles = allFiles.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isQuickOpenOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isQuickOpenOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex] && rootPath) {
        openFile(filteredFiles[selectedIndex].path, filteredFiles[selectedIndex].name, rootPath);
        setQuickOpenOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuickOpenOpen(false);
    }
  };

  if (!isQuickOpenOpen) return null;

  return (
    <div
      onClick={() => setQuickOpenOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '60px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxHeight: '400px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <Search size={16} color="var(--accent)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type filename to open..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontSize: '13px',
              padding: 0,
            }}
          />
          <kbd
            style={{
              fontSize: '10px',
              backgroundColor: 'var(--bg-panel)',
              padding: '2px 5px',
              borderRadius: '3px',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ overflowY: 'auto', padding: '6px' }}>
          {filteredFiles.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              {allFiles.length === 0 ? 'No files in workspace' : 'No matching files'}
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              const relativePath = rootPath ? file.path.replace(rootPath, '').replace(/^[/\\]/, '') : file.name;
              return (
                <div
                  key={file.path}
                  onClick={() => {
                    if (rootPath) openFile(file.path, file.name, rootPath);
                    setQuickOpenOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCode size={14} color="var(--accent)" />
                    <span style={{ fontSize: '12px', fontWeight: isSelected ? 500 : 400 }}>
                      {file.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {relativePath}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
