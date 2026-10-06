export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: string;
  role: 'user' | 'admin';
  created_at: string;
  last_login_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export type AgentEventType =
  | 'agent.started'
  | 'agent.planning'
  | 'agent.thinking'
  | 'agent.waiting_for_user'
  | 'agent.approval.required'
  | 'agent.approval.granted'
  | 'agent.approval.denied'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.stopped'
  | 'plan.created'
  | 'task.started'
  | 'task.completed'
  | 'tool.started'
  | 'tool.completed'
  | 'file.read'
  | 'file.changed'
  | 'file.created'
  | 'file.deleted'
  | 'diff.created'
  | 'command.started'
  | 'command.output'
  | 'command.completed'
  | 'verification.started'
  | 'verification.passed'
  | 'verification.failed';

export interface CoreMindEvent<T = any> {
  type: AgentEventType;
  agent_id?: string;
  session_id?: string;
  timestamp: string;
  data: T;
}

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed' | 'skipped';
  dependencies: string[];
  priority: number;
}
