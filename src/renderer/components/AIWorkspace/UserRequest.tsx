import React from 'react';
import { UserRequestEvent } from '../../types/aiWorkspace';

export const UserRequest: React.FC<{ event: UserRequestEvent }> = ({ event }) => {
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.03)',
      borderRadius: '12px',
      padding: '12px 16px',
      margin: '12px 14px 16px 14px',
      color: '#E5E7EB',
      fontSize: '13px',
      lineHeight: '1.5',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap'
    }}>
      {event.content}
    </div>
  );
};
