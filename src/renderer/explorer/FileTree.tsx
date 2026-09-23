import React from 'react';
import { FileNode } from '@shared/types/file';
import { FileTreeItem } from './FileTreeItem';

interface FileTreeProps {
  nodes: FileNode[];
}

export const FileTree: React.FC<FileTreeProps> = ({ nodes }) => {
  if (nodes.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
        Folder is empty
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {nodes.map((node) => (
        <FileTreeItem key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
};
