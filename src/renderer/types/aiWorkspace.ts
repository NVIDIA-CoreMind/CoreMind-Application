export type AIWorkspaceEventType =
  | 'UserRequestEvent'
  | 'AgentStartedEvent'
  | 'FileExploredEvent'
  | 'FileReadEvent'
  | 'ThoughtEvent'
  | 'ToolCallEvent'
  | 'TerminalEvent'
  | 'QuestionEvent'
  | 'ApprovalEvent'
  | 'FileChangedEvent'
  | 'DiffCreatedEvent'
  | 'PlanCreatedEvent'
  | 'TaskProgressEvent'
  | 'TestEvent'
  | 'CompletedEvent'
  | 'ErrorEvent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface TaskNode {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dependencies?: string[];
  priority?: number;
  result?: any;
  error?: string | null;
}

export interface TaskGraph {
  goal?: string;
  tasks?: TaskNode[];
  nodes?: TaskNode[];
  in_progress_ids?: string[];
  completed_ids?: string[];
  is_completed?: boolean;
  has_failures?: boolean;
}

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
  task?: string;
  projectPath?: string;
}

export interface FileExploredEvent extends BaseEvent {
  type: 'FileExploredEvent';
  filesCount: number;
  path?: string;
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
  step?: number;
  maxSteps?: number;
}

export interface ToolCallEvent extends BaseEvent {
  type: 'ToolCallEvent';
  tool: string;
  args: any;
  result?: any;
  success?: boolean;
  durationMs?: number;
}

export interface TerminalEvent extends BaseEvent {
  type: 'TerminalEvent';
  command: string;
  output: string;
  status: 'running' | 'completed' | 'failed';
  exitCode?: number;
  durationMs?: number;
  cwd?: string;
}

export interface QuestionEvent extends BaseEvent {
  type: 'QuestionEvent';
  questionId?: string;
  question: string;
  options?: string[];
}

export interface ApprovalEvent extends BaseEvent {
  type: 'ApprovalEvent';
  approvalId: string;
  tool: string;
  args: Record<string, any>;
  description: string;
}

export interface FileChangedEvent extends BaseEvent {
  type: 'FileChangedEvent';
  file: string;
  action?: 'created' | 'modified' | 'deleted';
  lines?: number;
  additions?: number;
  deletions?: number;
}

export interface DiffCreatedEvent extends BaseEvent {
  type: 'DiffCreatedEvent';
  path: string;
  diff: string;
  additions: number;
  deletions: number;
  changeId?: string;
}

export interface PlanCreatedEvent extends BaseEvent {
  type: 'PlanCreatedEvent';
  goal?: string;
  tasks: TaskNode[];
}

export interface TaskProgressEvent extends BaseEvent {
  type: 'TaskProgressEvent';
  taskId: string;
  title: string;
  status: TaskStatus;
  result?: any;
  error?: string | null;
}

export interface TestEvent extends BaseEvent {
  type: 'TestEvent';
  testName: string;
  status: 'running' | 'passed' | 'failed';
  attempt?: number;
  command?: string;
  exitCode?: number;
  error?: string;
  durationMs?: number;
  location?: { file: string; line?: number; column?: number };
}

export interface CompletedEvent extends BaseEvent {
  type: 'CompletedEvent';
  summary: string;
  filesChanged: string[];
  tests: { name: string; passed: boolean }[];
  steps?: number;
  changeId?: string;
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
  | ApprovalEvent
  | FileChangedEvent
  | DiffCreatedEvent
  | PlanCreatedEvent
  | TaskProgressEvent
  | TestEvent
  | CompletedEvent
  | ErrorEvent;

export type AIRequestStatus =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'stopped'
  | 'error';

// Diff Parsing & Representation Types
export interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
}

export interface ParsedDiff {
  filePath: string;
  status: 'created' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  rawDiff: string;
}
