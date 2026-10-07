import React from 'react';
import { CompletedEvent } from '../../types/aiWorkspace';
import { CheckCircle2 } from 'lucide-react';

export const FinalResult: React.FC<{ event: CompletedEvent }> = ({ event }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginTop: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981' }}>
        <CheckCircle2 size={14} />
        <span style={{ fontSize: '12px', fontWeight: 500 }}>Completed</span>
      </div>
      
      <div style={{
        fontSize: '13px',
        color: 'var(--text-primary, #0F172A)',
        lineHeight: '1.6'
      }}>
        <p>{event.summary}</p>
        {event.filesChanged.length > 0 && (
          <ul style={{ paddingLeft: '20px', marginTop: '8px', color: 'var(--text-secondary, #64748B)' }}>
            {event.filesChanged.map(f => (
              <li key={f} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{f}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
