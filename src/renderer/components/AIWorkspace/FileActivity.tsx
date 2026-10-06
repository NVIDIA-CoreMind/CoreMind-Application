import React, { useState } from 'react';
import { FileExploredEvent, FileReadEvent, FileChangedEvent } from '../../types/aiWorkspace';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { FileIcon } from '../FileIcon';

export const FileActivity: React.FC<{ event: FileExploredEvent | FileReadEvent | FileChangedEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  let content = null;
  
  if (event.type === 'FileExploredEvent') {
    content = (
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF', cursor: 'pointer' }}
      >
        <span>Explored <strong style={{ color: '#E5E7EB' }}>{event.filesCount} file{event.filesCount > 1 ? 's' : ''}</strong></span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
    );
  } else if (event.type === 'FileReadEvent') {
    content = (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' }}>
        <span>Analyzed</span>
        <FileIcon path={event.file.split('/').pop() || ''} size={14} />
        <strong style={{ color: '#E5E7EB' }}>{event.file.split('/').pop()}</strong>
        {event.startLine && <span style={{ color: '#9CA3AF' }}>#L{event.startLine}-{event.endLine}</span>}
      </div>
    );
  } else {
    content = (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' }}>
        <span>Modified</span>
        <FileIcon path={event.file.split('/').pop() || ''} size={14} />
        <strong style={{ color: '#E5E7EB' }}>{event.file.split('/').pop()}</strong>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {content}
    </div>
  );
};
