import React, { useState } from 'react';
import { QuestionEvent } from '../../types/aiWorkspace';
import { HelpCircle } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';

export const QuestionCard: React.FC<{ event: QuestionEvent }> = ({ event }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const submitAnswer = useAIWorkspaceStore(s => s.submitAnswer);
  const currentState = useAIWorkspaceStore(s => s.currentState);

  const isActive = currentState === 'waiting';

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface, #28292B)',
      border: '1px solid var(--border-color, #3C4043)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: 'none',
      marginTop: '8px',
      marginBottom: '8px'
    }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ 
          width: '22px', height: '22px', 
          backgroundColor: 'rgba(138, 180, 248, 0.12)', 
          borderRadius: '4px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px'
        }}>
          <HelpCircle size={14} color="var(--accent, #8AB4F8)" />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-primary, #E8EAED)', lineHeight: '1.5' }}>
          {event.question}
        </div>
      </div>
      
      {event.options && event.options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '34px' }}>
          {event.options.map((opt, index) => (
            <div 
              key={opt}
              onClick={() => { if (isActive) setSelected(opt); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', 
                fontSize: '12.5px', color: 'var(--text-secondary, #9AA0A6)', 
                cursor: isActive ? 'pointer' : 'default',
                opacity: (selected && selected !== opt) ? 0.5 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              <div style={{ 
                backgroundColor: 'var(--bg-hover, #303134)', 
                borderRadius: '4px', 
                width: '18px', height: '18px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '11px', flexShrink: 0,
                color: 'var(--text-secondary, #9AA0A6)'
              }}>
                {index + 1}
              </div>
              <span style={{ lineHeight: '1.4' }}>{opt}</span>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginLeft: '34px', marginTop: '4px' }}>
        <input 
          type="text" 
          placeholder="Other answer..." 
          value={custom}
          onChange={e => {
            setCustom(e.target.value);
            setSelected(null);
          }}
          disabled={!isActive}
          style={{
            width: '100%',
            fontSize: '12.5px',
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border-color, #3C4043)',
            color: 'var(--text-primary, #E8EAED)',
            outline: 'none',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderBottomColor = 'var(--accent, #8AB4F8)'}
          onBlur={e => e.target.style.borderBottomColor = 'var(--border-color, #3C4043)'}
        />
      </div>

      {isActive && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button 
            onClick={() => submitAnswer('skip')}
            style={{
              padding: '6px 14px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted, #70757A)',
              border: 'none',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            Skip
          </button>
          <button 
            onClick={() => submitAnswer(custom || selected || '')}
            disabled={!custom && !selected}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--accent, #8AB4F8)',
              color: '#1E1F20',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: (!custom && !selected) ? 'default' : 'pointer',
              opacity: (!custom && !selected) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Submit ↵
          </button>
        </div>
      )}
    </div>
  );
};
