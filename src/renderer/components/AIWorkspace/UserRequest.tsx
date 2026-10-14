import React from 'react';
import ReactMarkdown from 'react-markdown';
import { UserRequestEvent } from '../../types/aiWorkspace';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';

export const UserRequest: React.FC<{ event: UserRequestEvent }> = ({ event }) => {
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';

  return (
    <div style={{
      backgroundColor: isDark ? '#262626' : '#f0f2f5',
      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
      borderRadius: '20px',
      padding: '10px 18px',
      margin: '4px 0 16px 0',
      color: isDark ? '#f4f4f5' : '#111827',
      fontSize: '13.5px',
      lineHeight: '1.5',
      wordBreak: 'break-word',
      boxShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
    }}>
      <ReactMarkdown
        components={{
          img: ({ src, alt, ...props }: any) => (
            <img
              src={src}
              alt={alt || 'Image'}
              style={{
                maxWidth: '100%',
                maxHeight: '220px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'}`,
                display: 'block',
                margin: '8px 0',
                objectFit: 'contain',
              }}
              {...props}
            />
          ),
          p: ({ children }) => <span style={{ whiteSpace: 'pre-wrap' }}>{children}</span>,
        }}
      >
        {event.content}
      </ReactMarkdown>
    </div>
  );
};
