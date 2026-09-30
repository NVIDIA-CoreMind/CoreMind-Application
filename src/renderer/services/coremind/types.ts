/**
 * CoreMind Backend API Contract Types
 * Authoritative types based on FRONTEND_API_GUIDE.md and FastAPI OpenAPI specifications.
 */

// ==========================================
// 1. Authentication & User Management
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  provider: string;
  role: 'user' | 'admin' | string;
  created_at: string;
  last_login_at?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface GoogleAuthUrlResponse {
  auth_url: string;
  client_id: string;
  state: string;
}

export interface GoogleLoginRequest {
  id_token?: string;
  code?: string;
  redirect_uri?: string;
}

export interface UserProfileUpdateRequest {
  name?: string;
  avatar_url?: string;
}

// ==========================================
// 2. Real-time WebSocket Events & Payloads
// ==========================================

export type AgentEventType =
  | 'agent.started'
  | 'agent.planning'
  | 'plan.created'
  | 'task.started'
  | 'task.completed'
  | 'agent.thinking'
  | 'agent.ai.token'
  | 'agent.ai.usage'
  | 'tool.started'
  | 'tool.completed'
  | 'file.read'
  | 'file.created'
  | 'file.changed'
  | 'file.deleted'
  | 'diff.created'
  | 'command.started'
  | 'command.output'
  | 'command.completed'
  | 'verification.started'
  | 'verification.passed'
  | 'verification.failed'
  | 'agent.waiting_for_user'
  | 'agent.approval.required'
  | 'agent.approval.granted'
  | 'agent.approval.denied'
  | 'agent.completed'
  | 'agent.failed'
  | 'agent.stopped'
  | 'agent.error';

export interface CoreMindEvent<T = any> {
  type: AgentEventType | string;
  agent_id?: string;
  session_id?: string;
  timestamp: string;
  data: T;
}

// Event Data Payloads
export interface AgentStartedPayload {
  task: string;
  project_path: string;
}

export interface PlanCreatedPayload {
  nodes?: TaskNode[];
  tasks?: TaskNode[];
  task_graph?: TaskGraph;
}

export interface TaskLifecyclePayload {
  task_id: string;
  title: string;
  status?: string;
}

export interface AgentThinkingPayload {
  step: number;
  max_steps: number;
}

export interface AgentAiTokenPayload {
  token: string;
}

export interface AgentAiUsagePayload {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ToolStartedPayload {
  tool: string;
  args: Record<string, any>;
}

export interface ToolCompletedPayload {
  tool: string;
  success: boolean;
  result: any;
}

export interface FileEventPayload {
  path: string;
}

export interface DiffCreatedPayload {
  path: string;
  diff: string;
  additions: number;
  deletions: number;
}

export interface CommandStartedPayload {
  command: string;
  cwd?: string;
}

export interface CommandOutputPayload {
  output: string;
}

export interface CommandCompletedPayload {
  command: string;
  exit_code: number;
  duration_ms?: number;
}

export interface VerificationStartedPayload {
  attempt: number;
}

export interface VerificationPassedPayload {
  attempt: number;
  command?: string;
}

export interface VerificationFailedPayload {
  attempt: number;
  exit_code?: number;
  error?: string;
}

export interface AgentWaitingForUserPayload {
  question_id: string;
  question: string;
  options?: string[];
}

export interface AgentApprovalRequiredPayload {
  approval_id: string;
  tool: string;
  args: Record<string, any>;
  description: string;
}

export interface AgentCompletedPayload {
  files_changed: string[];
  steps: number;
  change_id?: string;
  task_graph?: TaskGraph;
}

export interface AgentFailedPayload {
  error: string;
}

// Client to Backend WebSocket Messages
export interface ClientQuestionAnswerMessage {
  type: 'agent.question_answer';
  question_id: string;
  answer: string;
}

export interface ClientApproveMessage {
  type: 'agent.approve';
  approval_id: string;
}

export interface ClientDenyMessage {
  type: 'agent.deny';
  approval_id: string;
  reason?: string;
}

// ==========================================
// 3. Agent Lifecycle & Task Graph
// ==========================================

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'skipped';

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dependencies: string[];
  priority: number;
  created_at?: string;
  completed_at?: string | null;
  result?: any;
  error?: string | null;
}

export interface TaskGraph {
  goal?: string;
  nodes?: TaskNode[];
  tasks?: TaskNode[];
  in_progress_ids?: string[];
  completed_ids?: string[];
  is_completed?: boolean;
  has_failures?: boolean;
}

export interface AgentRunRequest {
  task: string;
  project_path: string;
  session_id?: string;
}

export interface AgentRunResponse {
  agent_id: string;
  session_id: string;
  status: string;
}

export interface AgentStatusResponse {
  task_id: string;
  session_id: string;
  agent_id: string;
  task: string;
  project_path: string;
  status: 'started' | 'running' | 'completed' | 'failed' | 'stopped' | 'waiting_for_user' | 'waiting_for_approval';
  created_at: string;
  completed_at?: string | null;
  steps_completed: number;
  files_changed: string[];
  tool_calls_count: number;
  error?: string | null;
  task_graph?: TaskGraph;
}

export interface QuestionAnswerRequest {
  question_id: string;
  answer: string;
}

export interface ApprovalRequest {
  agent_id?: string;
  approval_id: string;
}

export interface ApprovalDenyRequest {
  agent_id?: string;
  approval_id: string;
  reason?: string;
}

// ==========================================
// 4. Unified Diff & Changes Review
// ==========================================

export type FileChangeStatus = 'modified' | 'created' | 'deleted';

export interface ChangeFile {
  path: string;
  diff: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  accepted?: boolean;
}

export interface ChangeSet {
  change_id: string;
  agent_id: string;
  project_path: string;
  created_at: string;
  files: ChangeFile[];
}

export interface ChangeActionResponse {
  status: 'accepted' | 'rejected';
  change_id: string;
  file_path?: string;
}

// ==========================================
// 5. Project & Code Intelligence
// ==========================================

export interface ProjectMetadata {
  path: string;
  name: string;
  language: string;
  framework?: string;
  package_manager?: string;
  main_entry?: string;
  test_command?: string;
  config_file?: string;
  file_count: number;
  total_size: number;
}

export interface ProjectTreeNode {
  name: string;
  path: string;
  type?: 'file' | 'directory';
  is_dir?: boolean;
  size?: number;
  children?: ProjectTreeNode[];
}

export interface ProjectTreeResponse {
  project_path: string;
  tree: ProjectTreeNode[];
}

export interface ProjectSearchMatch {
  file?: string;
  file_path?: string;
  line?: number;
  line_number?: number;
  content?: string;
  preview?: string;
  match_type?: string;
  score?: number;
  context_lines?: string[];
}

export interface ProjectSearchResponse {
  project_path: string;
  query: string;
  total: number;
  matches: ProjectSearchMatch[];
}

export interface RepoMapDetails {
  files?: Record<string, {
    classes?: string[];
    functions?: string[];
  }>;
}

export interface RepoMapResponse {
  project_path: string;
  summary: string;
  details?: RepoMapDetails;
}

// ==========================================
// 6. Persistent Terminal & Background Processes
// ==========================================

export interface TerminalSession {
  session_id: string;
  project_path: string;
  cwd: string;
  is_active: boolean;
}

export interface TerminalExecuteResponse {
  session_id?: string;
  command: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  cwd?: string;
  success?: boolean;
}

export interface BackgroundProcess {
  process_id: string;
  pid: number;
  command: string;
  cwd: string;
  is_running: boolean;
  started_at?: string;
}

export interface ProcessStatusResponse {
  process_id: string;
  pid: number;
  command: string;
  cwd: string;
  is_running: boolean;
  exit_code?: number | null;
}

export interface ProcessLogsResponse {
  process_id: string;
  logs: string[];
}

// ==========================================
// 7. Direct Tools & Sandbox
// ==========================================

export interface DirectToolPayload {
  tool: string;
  args: Record<string, any>;
  project_path: string;
}

export interface DirectToolResponse<T = any> {
  tool: string;
  success: boolean;
  result: T;
  error?: string;
}

export interface SandboxInstance {
  sandbox_id: string;
  project_path: string;
  status: string;
}

export interface SandboxExecuteResponse {
  sandbox_id: string;
  command: string;
  stdout: string;
  stderr: string;
  exit_code: number;
}

// ==========================================
// 8. Settings & Diagnostics
// ==========================================

export interface SafeSettingsResponse {
  model: string;
  max_agent_steps: number;
  command_timeout_ms: number;
  sandbox_type: string;
  host: string;
  port: number;
}

export interface AITestResponse {
  status: string;
  provider: string;
  model: string;
  response: string;
}

export interface AIUsageMetrics {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  request_count: number;
}

export interface AIUsageResponse {
  provider: string;
  usage: AIUsageMetrics;
}

// ==========================================
// 9. Error Handling
// ==========================================

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
