import React from 'react';
import { AIWorkspaceEvent } from '../../types/aiWorkspace';
import { UserRequest } from './UserRequest';
import { ThoughtBlock } from './ThoughtBlock';
import { FileActivity } from './FileActivity';
import { TerminalActivity } from './TerminalActivity';
import { QuestionCard } from './QuestionCard';
import { FinalResult } from './FinalResult';
import { ErrorState } from './ErrorState';

export const ActivityItem: React.FC<{ event: AIWorkspaceEvent }> = ({ event }) => {
  let content = null;

  switch (event.type) {
    case 'UserRequestEvent':
      return <UserRequest event={event} />;
    case 'ThoughtEvent':
      content = <ThoughtBlock event={event} />;
      break;
    case 'FileExploredEvent':
    case 'FileReadEvent':
    case 'FileChangedEvent':
      content = <FileActivity event={event} />;
      break;
    case 'TerminalEvent':
      content = <TerminalActivity event={event} />;
      break;
    case 'QuestionEvent':
      content = <QuestionCard event={event} />;
      break;
    case 'CompletedEvent':
      content = <FinalResult event={event} />;
      break;
    case 'ErrorEvent':
      content = <ErrorState event={event} />;
      break;
    case 'AgentStartedEvent':
    case 'ToolCallEvent':
    case 'TestEvent':
      return null;
    default:
      return null;
  }

  if (!content) return null;

  // The QuestionCard should be full width with margin, while regular activities should be indented
  const isQuestion = event.type === 'QuestionEvent';

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      padding: isQuestion ? '16px 14px' : '6px 14px 6px 28px',
      width: '100%'
    }}>
      {content}
    </div>
  );
};
