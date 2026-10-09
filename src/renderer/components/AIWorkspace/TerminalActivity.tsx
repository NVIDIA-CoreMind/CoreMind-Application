import React, { useState } from 'react';
import { TerminalEvent } from '../../types/aiWorkspace';
import { ChevronRight, ChevronDown, Copy, Square, Terminal } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';

import { useThemeStore } from '../../stores/themeStore';

export const TerminalActivity: React.FC<{ event: TerminalEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(true);
  const updateEvent = useAIWorkspaceStore(s => s.updateEvent);
  const theme = useThemeStore(s => s.theme);
  const isDark = theme === 'dark';
  
  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.status === 'running') {
      updateEvent(event.id, { status: 'failed', output: event.output + '\n^C (Stopped by user)' });
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.output) {
      navigator.clipboard.writeText(event.output);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          color: isDark ? '#94A3B8' : '#475569',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        <Terminal size={13} color="var(--accent)" />
        <span>Ran <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{event.command}</strong></span>
        {event.status === 'running' && (
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#3B82F6',
            boxShadow: '0 0 6px #3B82F6',
            animation: 'pulse-dot 1.5s infinite',
            display: 'inline-block',
            marginLeft: '4px',
          }} />
        )}
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
      
      {expanded && (
        <div style={{
          borderRadius: '8px',
          backgroundColor: isDark ? '#141414' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginTop: '2px',
          boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            padding: '6px 12px',
            backgroundColor: isDark ? '#1E1E1E' : '#F8FAFC',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>$ </span>
              <span style={{ color: 'var(--text-primary)', marginLeft: '6px', fontWeight: 600 }}>{event.command}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {event.status === 'running' && (
                <button onClick={handleStop} title="Stop Command" style={iconBtnStyle}>
                  <Square size={12} fill="#DC2626" color="#DC2626" />
                </button>
              )}
              <button onClick={handleCopy} title="Copy Output" style={iconBtnStyle}>
                <Copy size={12} />
              </button>
            </div>
          </div>
          <div style={{
            padding: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11.5px',
            lineHeight: '1.5',
            color: isDark ? '#E2E8F0' : '#1E293B',
            backgroundColor: isDark ? '#141414' : '#FFFFFF',
            whiteSpace: 'pre-wrap',
            maxHeight: '250px',
            overflowY: 'auto',
          }}>
            {event.output || (event.status === 'running' ? 'Executing in real terminal...' : 'No output')}
            {event.status === 'completed' && <div style={{ marginTop: '8px', color: '#3B82F6', fontWeight: 600 }}>✔ Process exited with code 0</div>}
            {event.status === 'failed' && <div style={{ marginTop: '8px', color: '#EF4444', fontWeight: 600 }}>✖ Process exited with error code</div>}
          </div>
        </div>
      )}
    </div>
  );
};

const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
};

