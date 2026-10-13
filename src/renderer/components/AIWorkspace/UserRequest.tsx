import React from 'react';
import { UserRequestEvent } from '../../types/aiWorkspace';
import { useThemeStore } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';

export const UserRequest: React.FC<{ event: UserRequestEvent }> = ({ event }) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tokens = getAITheme(isDark);

  return (
    <div style={{
      backgroundColor: tokens.bgCard,
      border: `1px solid ${tokens.border}`,
      borderRadius: '8px',
      padding: '12px 16px',
      margin: '12px 14px 16px 14px',
      color: tokens.textPrimary,
      fontSize: '13px',
      lineHeight: '1.5',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap'
    }}>
      {event.content}
    </div>
  );
};
