import React from 'react';
import { UserRequestEvent } from '../../types/aiWorkspace';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

export const UserRequest: React.FC<{ event: UserRequestEvent }> = ({ event }) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  return (
    <div style={{
      backgroundColor: tokens.bgCard,
      border: `1px solid ${tokens.border}`,
      borderRadius: '14px',
      padding: '12px 16px',
      margin: '4px 0 16px 0',
      color: tokens.textPrimary,
      fontSize: '13.5px',
      lineHeight: '1.5',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
      boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
    }}>
      {event.content}
    </div>
  );
};
