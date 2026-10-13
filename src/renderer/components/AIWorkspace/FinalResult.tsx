import React from 'react';
import { CompletedEvent } from '../../types/aiWorkspace';
import { CheckCircle2 } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

export const FinalResult: React.FC<{ event: CompletedEvent }> = ({ event }) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tokens = getAITheme(isDark);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginTop: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tokens.accentSuccess }}>
        <CheckCircle2 size={14} color="currentColor" />
        <span style={{ fontSize: '12px', fontWeight: 600, color: tokens.textPrimary }}>Completed</span>
      </div>
      
      <div style={{
        fontSize: '13px',
        color: tokens.textPrimary,
        lineHeight: '1.6'
      }}>
        <p>{event.summary}</p>
        {event.filesChanged.length > 0 && (
          <ul style={{ paddingLeft: '20px', marginTop: '8px', color: tokens.textSecondary }}>
            {event.filesChanged.map(f => (
              <li key={f} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '12px' }}>{f}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
