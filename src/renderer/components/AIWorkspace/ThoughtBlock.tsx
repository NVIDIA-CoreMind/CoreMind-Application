import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ThoughtEvent } from '../../types/aiWorkspace';

export const ThoughtBlock: React.FC<{ event: ThoughtEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          color: '#9CA3AF'
        }}
      >
        <span>Thought for {Math.round(event.durationMs / 1000)}s</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
      {expanded && (
        <div style={{
          fontSize: '12px',
          color: '#D1D5DB',
          lineHeight: '1.6',
          marginTop: '4px',
          marginBottom: '8px'
        }}>
          {event.summary}
        </div>
      )}
    </div>
  );
};
