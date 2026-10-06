import React, { useState } from 'react';
import { TerminalEvent } from '../../types/aiWorkspace';
import { ChevronRight, ChevronDown, Copy, Square, ExternalLink } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';

export const TerminalActivity: React.FC<{ event: TerminalEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(true);
  const updateEvent = useAIWorkspaceStore(s => s.updateEvent);
  
  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.status === 'running') {
      updateEvent(event.id, { status: 'failed', output: event.output + '\n^C (Stopped by user)' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF', cursor: 'pointer' }}
      >
        <span>Ran <strong style={{ color: '#E5E7EB', fontFamily: 'var(--font-mono)' }}>{event.command}</strong></span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
      
      {expanded && (
        <div style={{
          borderRadius: '8px',
          backgroundColor: '#0F111A', // Deeper terminal color
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginTop: '2px'
        }}>
          <div style={{
            padding: '6px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#A3A3A3',
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>~/.../CoreMind $ </span>
              <span style={{ color: '#D4D4D4', marginLeft: '6px' }}>{event.command}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {event.status === 'running' && (
                <button onClick={handleStop} title="Stop Command" style={iconBtnStyle}>
                  <Square size={12} fill="#DC2626" color="#DC2626" />
                </button>
              )}
              <button title="Copy Output" style={iconBtnStyle}>
                <Copy size={12} />
              </button>
              <button title="Open in Terminal" style={iconBtnStyle}>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
          <div style={{
            padding: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            lineHeight: '1.5',
            color: '#D4D4D4',
            whiteSpace: 'pre-wrap',
            maxHeight: '250px',
            overflowY: 'auto',
          }}>
            {event.output || (event.status === 'running' ? 'Running...' : 'No output')}
            {event.status === 'completed' && <div style={{ marginTop: '8px', color: '#10B981' }}>Exited with 0</div>}
            {event.status === 'failed' && <div style={{ marginTop: '8px', color: '#EF4444' }}>Exited with 1</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#6B7280',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px'
};
