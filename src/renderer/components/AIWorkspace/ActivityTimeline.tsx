import React, { useEffect, useRef } from 'react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { ActivityItem } from './ActivityItem';

export const ActivityTimeline: React.FC = () => {
  const { events } = useAIWorkspaceStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '24px'
    }}>
      {events.map((event) => (
        <ActivityItem key={event.id} event={event} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
