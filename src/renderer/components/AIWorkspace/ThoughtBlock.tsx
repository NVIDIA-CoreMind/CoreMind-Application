import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ThoughtEvent } from '../../types/aiWorkspace';
import { useThemeStore } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

export const ThoughtBlock: React.FC<{ event: ThoughtEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tokens = getAITheme(isDark);

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
          color: tokens.textMuted,
        }}
      >
        <span>Thought for {Math.round(event.durationMs / 1000)}s</span>
        {expanded ? <ChevronDown size={12} color="currentColor" /> : <ChevronRight size={12} color="currentColor" />}
      </div>
      {expanded && (
        <div style={{
          fontSize: '12px',
          color: tokens.textSecondary,
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
