export type AIWorkspaceEventType =
  | 'UserRequestEvent'
  | 'AgentStartedEvent'
  | 'FileExploredEvent'
  | 'FileReadEvent'
  | 'ThoughtEvent'
  | 'ToolCallEvent'
  | 'TerminalEvent'
  | 'QuestionEvent'
  | 'FileChangedEvent'
  | 'TestEvent'
  | 'CompletedEvent'
  | 'ErrorEvent';

export interface BaseEvent {
  id: string;
  type: AIWorkspaceEventType;
  timestamp: number;
}

export interface UserRequestEvent extends BaseEvent {
  type: 'UserRequestEvent';
  content: string;
}

export interface AgentStartedEvent extends BaseEvent {
  type: 'AgentStartedEvent';
}

export interface FileExploredEvent extends BaseEvent {
  type: 'FileExploredEvent';
  filesCount: number;
}

export interface FileReadEvent extends BaseEvent {
  type: 'FileReadEvent';
  file: string;
  startLine?: number;
  endLine?: number;
}

export interface ThoughtEvent extends BaseEvent {
  type: 'ThoughtEvent';
  summary: string;
  durationMs: number;
}

export interface ToolCallEvent extends BaseEvent {
  type: 'ToolCallEvent';
  tool: string;
  args: any;
}

export interface TerminalEvent extends BaseEvent {
  type: 'TerminalEvent';
  command: string;
  output: string;
  status: 'running' | 'completed' | 'failed';
}

export interface QuestionEvent extends BaseEvent {
  type: 'QuestionEvent';
  question: string;
  options?: string[];
}

export interface FileChangedEvent extends BaseEvent {
  type: 'FileChangedEvent';
  file: string;
  action?: 'created' | 'modified' | 'deleted';
  lines?: number;
  additions?: number;
  deletions?: number;
}

export interface TestEvent extends BaseEvent {
  type: 'TestEvent';
  testName: string;
  status: 'running' | 'passed' | 'failed';
}

export interface CompletedEvent extends BaseEvent {
  type: 'CompletedEvent';
  summary: string;
  filesChanged: string[];
  tests: { name: string; passed: boolean }[];
}

export interface ErrorEvent extends BaseEvent {
  type: 'ErrorEvent';
  command?: string;
  error: string;
}

export type AIWorkspaceEvent =
  | UserRequestEvent
  | AgentStartedEvent
  | FileExploredEvent
  | FileReadEvent
  | ThoughtEvent
  | ToolCallEvent
  | TerminalEvent
  | QuestionEvent
  | FileChangedEvent
  | TestEvent
  | CompletedEvent
  | ErrorEvent;

export type AIRequestStatus =
  | "idle"
  | "running"
  | "waiting"
  | "completed"
  | "stopped"
  | "error";
