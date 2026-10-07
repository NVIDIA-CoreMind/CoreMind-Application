import React, { useState } from 'react';
import { FileExploredEvent, FileReadEvent, FileChangedEvent } from '../../types/aiWorkspace';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FileIcon } from '../FileIcon';
import { useTabsStore } from '../../stores/tabsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export const FileActivity: React.FC<{ event: FileExploredEvent | FileReadEvent | FileChangedEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);

  const handleOpenFile = async (relPath: string) => {
    if (!rootPath) return;
    const cleanPath = relPath.replace(/^\/+/, '').trim();
    const fullPath = relPath.startsWith('/') ? relPath : `${rootPath}/${cleanPath}`;
    const fileName = cleanPath.split('/').pop() || cleanPath;
    try {
      await openFile(fullPath, fileName, rootPath);
    } catch (e) {
      console.warn('Failed to open file from activity:', e);
    }
  };

  let content = null;
  
  if (event.type === 'FileExploredEvent') {
    content = (
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary, #64748B)', cursor: 'pointer' }}
      >
        <span>Explored <strong style={{ color: 'var(--text-primary, #0F172A)' }}>{event.filesCount} file{event.filesCount > 1 ? 's' : ''}</strong></span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
    );
  } else if (event.type === 'FileReadEvent') {
    content = (
      <div 
        onClick={() => handleOpenFile(event.file)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary, #64748B)', cursor: 'pointer' }}
      >
        <span>Analyzed</span>
        <FileIcon path={event.file.split('/').pop() || ''} size={14} />
        <strong style={{ color: 'var(--text-primary, #0F172A)' }}>{event.file.split('/').pop()}</strong>
        {event.startLine && <span style={{ color: 'var(--text-muted, #94A3B8)' }}>#L{event.startLine}-{event.endLine}</span>}
      </div>
    );
  } else {
    const isCreated = event.action === 'created';
    const lines = event.lines || event.additions;

    content = (
      <div 
        onClick={() => handleOpenFile(event.file)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          color: 'var(--text-secondary, #64748B)',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: isCreated ? '#059669' : '#2563EB', fontWeight: 600 }}>
          {isCreated ? 'Created' : 'Modified'}
        </span>
        <FileIcon path={event.file.split('/').pop() || ''} size={14} />
        <strong style={{ color: 'var(--text-primary, #0F172A)' }}>{event.file.split('/').pop()}</strong>
        {lines !== undefined && lines > 0 && (
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              color: '#475569',
            }}
          >
            {lines} {lines === 1 ? 'line' : 'lines'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {content}
    </div>
  );
};
