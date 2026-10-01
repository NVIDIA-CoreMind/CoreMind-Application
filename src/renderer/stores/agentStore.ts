import { create } from 'zustand';
import {
  AgentMessage,
  AgentContext,
  AgentStatus,
} from '@shared/types/ipc';
import {
  AgentEventType,
  ChangeSet,
  CoreMindEvent,
  TaskGraph,
  TaskNode,
} from '../services/coremind/types';
import { agentService } from '../services/coremind/agent';
import { changesService } from '../services/coremind/changes';
import { coremindWs } from '../services/coremind/websocket';
import { useWorkspaceStore } from './workspaceStore';
import { useTabsStore } from './tabsStore';
import {
  ChangeMap,
  TrackedChange,
  ChangeStatus,
  countDiff,
  recordChange,
  resolveWorkspacePath,
  reverseApplyUnifiedDiff,
  sortedChanges,
} from '../services/aiChanges';
import {
  notifyExternalChanges,
  openChangeDiff,
  refreshExplorer,
} from '../services/workbenchBridge';

export interface AgentSession {
  id: string;
  title: string;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
  agentId?: string;
  changeId?: string;
  changes?: TrackedChange[];
}

export type AgentLifecycleStage =
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'executing'
  | 'observing'
  | 'verifying'
  | 'fixing'
  | 'completed'
  | 'failed'
  | 'stopped';

export interface ActivityLogItem {
  id: string;
  timestamp: number;
  type: string;
  summary: string;
  details?: any;
}

export interface TaskSummary {
  total: number;
  created: string[];
  modified: string[];
  deleted: string[];
  outsideWorkspace: string[];
  verification: { label: string; ok: boolean }[];
}

const READ_ONLY_TOOL = /read|list|search|grep|find|stat|view|glob|tree/i;
const PATH_ARG_KEYS = ['path', 'file_path', 'filepath', 'file', 'filename', 'target_file'];

// Pre-change content captured when a tool starts, used as the left side of the real VS Code diff.
const baselines = new Map<string, string | null>();

function formatSummary(summary: TaskSummary): string {
  if (summary.total === 0) {
    return 'Task completed.\n\nNo files were created or modified.';
  }
  const section = (title: string, files: string[]) =>
    files.length > 0 ? `\n${title}\n${files.map((f) => `  ${f}`).join('\n')}\n` : '';
  const verification = summary.verification.map((v) => `  ${v.ok ? '✓' : '✗'} ${v.label}`).join('\n');
  return (
    `Task completed successfully.\n\nFiles changed: ${summary.total}\n` +
    section('Created', summary.created) +
    section('Modified', summary.modified) +
    section('Deleted', summary.deleted) +
    section('Outside the open workspace', summary.outsideWorkspace) +
    `\nVerification\n${verification}`
  ).trimEnd();
}

function extractPathArg(args: Record<string, unknown> | undefined): string | null {
  if (!args) return null;
  for (const key of PATH_ARG_KEYS) {
    const value = args[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

async function readCurrent(absPath: string, rootPath: string): Promise<string | null | undefined> {
  const api = window.coreMindAPI;
  if (!api) return undefined;
  const result = await api.readFile(absPath, rootPath);
  if (result.success) return result.data;
  return result.error.code === 'ENOENT' ? null : undefined;
}

async function captureBaseline(rawPath: string): Promise<void> {
  const rootPath = useWorkspaceStore.getState().rootPath;
  const resolved = resolveWorkspacePath(rawPath, rootPath);
  if (!resolved || resolved.outsideWorkspace || !rootPath || baselines.has(resolved.absPath)) return;
  const content = await readCurrent(resolved.absPath, rootPath);
  if (content !== undefined && !baselines.has(resolved.absPath)) {
    baselines.set(resolved.absPath, content);
  }
}

const STORAGE_KEY_SESSIONS = 'coremind:agent-sessions';
const STORAGE_KEY_MODEL = 'coremind:agent-model';

function getInitialSessions(): AgentSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out old seed mocks
        const cleaned = parsed.filter((s) => !s.id.startsWith('session-seed-'));
        return cleaned;
      }
    }
  } catch {
    // fallback
  }
  return [];
}

function saveSessions(sessions: AgentSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch {
    // Ignore error
  }
}

interface AgentStore {
  // Session & Chat
  sessions: AgentSession[];
  currentSessionId: string | null;
  messages: AgentMessage[];
  isLoading: boolean;
  status: AgentStatus | null;
  error: string | null;
  selectedModel: string;
  availableModels: string[];

  // Real Backend Agent State
  agentId: string | null;
  lifecycleStage: AgentLifecycleStage;
  taskGraph: TaskGraph | null;
  activityLogs: ActivityLogItem[];
  pendingQuestion: { question_id: string; question: string; options?: string[] } | null;
  pendingApproval: { approval_id: string; tool: string; args: Record<string, any>; description: string } | null;
  activeChangeId: string | null;
  changeSet: ChangeSet | null;
  trackedChanges: ChangeMap;
  taskSummary: TaskSummary | null;
  reviewIndex: number | null;
  changeNotice: string | null;
  tokenUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  steps: { current: number; max: number } | null;
  liveOutput: string;
  runStartedAt: number | null;
  streamMessageId: string | null;
  runEndedAt: number | null;

  // Methods
  initWsListeners: () => void;
  sendMessage: (prompt: string) => Promise<boolean>;
  stopAgent: () => Promise<boolean>;
  answerQuestion: (answer: string) => Promise<boolean>;
  approveAction: () => Promise<boolean>;
  denyAction: (reason?: string) => Promise<boolean>;
  loadChanges: (changeId: string) => Promise<void>;
  openChange: (path: string) => Promise<void>;
  reviewChanges: () => Promise<void>;
  reviewStep: (delta: 1 | -1) => Promise<void>;
  acceptAllChanges: () => Promise<boolean>;
  rejectAllChanges: () => Promise<boolean>;
  acceptFileChange: (filePath: string) => Promise<boolean>;
  rejectFileChange: (filePath: string) => Promise<boolean>;
  finalizeTask: (reportedFiles: string[]) => Promise<void>;
  recordFileEvent: (type: ChangeStatus, rawPath: string, extra?: { diff?: string }) => void;

  clearMessages: () => void;
  newSession: () => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  setSelectedModel: (model: string) => void;
  buildCurrentContext: () => AgentContext;
}

type StoreSet = (partial: Partial<AgentStore> | ((s: AgentStore) => Partial<AgentStore>)) => void;
type StoreGet = () => AgentStore;

function persistChanges(get: StoreGet): void {
  const { currentSessionId, sessions, trackedChanges } = get();
  if (!currentSessionId) return;
  const updated = sessions.map((sess) =>
    sess.id === currentSessionId ? { ...sess, changes: sortedChanges(trackedChanges) } : sess
  );
  useAgentStore.setState({ sessions: updated });
  saveSessions(updated);
}

function removeChange(set: StoreSet, get: StoreGet, path: string): void {
  const { [path]: _removed, ...rest } = get().trackedChanges;
  const remaining = Object.keys(rest).length;
  set({
    trackedChanges: rest,
    reviewIndex: null,
    ...(remaining === 0 ? { changeSet: null, activeChangeId: null, taskSummary: null } : {}),
  });
  persistChanges(get);
}

async function finishRejection(changes: TrackedChange[], set: StoreSet, get: StoreGet): Promise<void> {
  notifyExternalChanges(changes.filter((c) => !c.outsideWorkspace).map((c) => ({ path: c.absPath, type: 'changed' as const })));
  baselines.clear();
  set({ changeSet: null, activeChangeId: null, trackedChanges: {}, taskSummary: null, reviewIndex: null, changeNotice: null });
  persistChanges(get);
  await refreshExplorer();
}

// Reverts a single file using the captured original content; refuses when the original is unknown.
async function revertLocally(change: TrackedChange): Promise<void> {
  const api = window.coreMindAPI;
  const rootPath = useWorkspaceStore.getState().rootPath;
  if (!api || !rootPath) throw new Error('No workspace is open.');
  if (change.status === 'created') {
    const result = await api.delete(change.absPath, rootPath);
    if (!result.success) throw new Error(result.error.message);
    return;
  }
  if (typeof change.baseline !== 'string') {
    throw new Error(`Cannot reject ${change.path}: its original content was not captured.`);
  }
  const result = await api.writeFile(change.absPath, change.baseline, rootPath);
  if (!result.success) throw new Error(result.error.message);
}

let wsInitialized = false;

export const useAgentStore = create<AgentStore>((set, get) => ({
  sessions: getInitialSessions(),
  currentSessionId: null,
  messages: [],
  isLoading: false,
  status: null,
  error: null,
  selectedModel: localStorage.getItem(STORAGE_KEY_MODEL) || 'nvidia/Nemotron-3-Ultra-550b-a55b',
  availableModels: [
    'nvidia/Nemotron-3-Ultra-550b-a55b',
    'nvidia/llama-3.3-nemotron-super-49b-v1',
    'meta-llama/Meta-Llama-3.1-70B-Instruct',
    'Gemini 3.8 Flash Medium',
    'Claude 3.5 Sonnet',
    'GPT-4o',
  ],

  // Real Agent State
  agentId: null,
  lifecycleStage: 'idle',
  taskGraph: null,
  activityLogs: [],
  pendingQuestion: null,
  pendingApproval: null,
  activeChangeId: null,
  changeSet: null,
  trackedChanges: {},
  taskSummary: null,
  reviewIndex: null,
  changeNotice: null,
  tokenUsage: null,
  steps: null,
  liveOutput: '',
  runStartedAt: null,
  streamMessageId: null,
  runEndedAt: null,

  initWsListeners: () => {
    if (wsInitialized) return;
    wsInitialized = true;

    coremindWs.onAny((event: CoreMindEvent) => {
      const state = get();
      const now = Date.now();

      // Only process events matching the current agent or general events
      if (state.agentId && event.agent_id && event.agent_id !== state.agentId) {
        return;
      }

      switch (event.type as AgentEventType) {
        case 'agent.started': {
          set({
            lifecycleStage: 'analyzing',
            isLoading: true,
            error: null,
            liveOutput: '',
          });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'agent.started',
            summary: `Agent started: "${event.data?.task || 'Coding task'}"`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'agent.planning': {
          set({ lifecycleStage: 'planning' });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'agent.planning',
            summary: 'Constructing task execution plan...',
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'plan.created': {
          const rawNodes: TaskNode[] =
            event.data?.nodes ||
            event.data?.tasks ||
            event.data?.task_graph?.tasks ||
            event.data?.task_graph?.nodes ||
            [];
          const graph: TaskGraph = event.data?.task_graph || {
            goal: event.data?.goal,
            tasks: rawNodes,
            nodes: rawNodes,
          };
          set({
            lifecycleStage: 'executing',
            taskGraph: graph,
          });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'plan.created',
            summary: `Execution plan established (${rawNodes.length} steps)`,
            details: graph,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'task.started': {
          const taskId = event.data?.task_id;
          const title = event.data?.title || taskId;
          set((s) => {
            if (!s.taskGraph) return s;
            const updatedTasks = (s.taskGraph.tasks || s.taskGraph.nodes || []).map((t) =>
              t.id === taskId ? { ...t, status: 'in_progress' as const } : t
            );
            return {
              taskGraph: {
                ...s.taskGraph,
                tasks: updatedTasks,
                nodes: updatedTasks,
              },
            };
          });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'task.started',
            summary: `Subtask started: ${title}`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'task.completed': {
          const taskId = event.data?.task_id;
          const title = event.data?.title || taskId;
          set((s) => {
            if (!s.taskGraph) return s;
            const updatedTasks = (s.taskGraph.tasks || s.taskGraph.nodes || []).map((t) =>
              t.id === taskId ? { ...t, status: 'completed' as const } : t
            );
            return {
              taskGraph: {
                ...s.taskGraph,
                tasks: updatedTasks,
                nodes: updatedTasks,
              },
            };
          });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'task.completed',
            summary: `Subtask completed: ${title}`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'agent.thinking': {
          set({
            steps: { current: event.data?.step, max: event.data?.max_steps },
            lifecycleStage: 'executing',
            streamMessageId: null,
          });
          break;
        }

        case 'agent.ai.token': {
          const chunk = event.data?.token || '';
          if (chunk) {
            // Each LLM step streams into its own message so consecutive answers are not glued together.
            set((s) => {
              const streamId = s.streamMessageId;
              if (streamId && s.messages.some((m) => m.id === streamId)) {
                return {
                  messages: s.messages.map((m) => (m.id === streamId ? { ...m, content: m.content + chunk } : m)),
                };
              }
              const id = `ai-stream-${Date.now()}-${s.messages.length}`;
              return {
                streamMessageId: id,
                messages: [...s.messages, { id, role: 'assistant', content: chunk, timestamp: Date.now() }],
              };
            });
          }
          break;
        }

        case 'agent.ai.usage': {
          set({ tokenUsage: event.data });
          break;
        }

        case 'tool.started': {
          const toolName = event.data?.tool || 'tool';
          const targetPath = extractPathArg(event.data?.args);
          if (targetPath && !READ_ONLY_TOOL.test(toolName)) {
            void captureBaseline(targetPath);
          }
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'tool.started',
            summary: `Executing tool: ${toolName}`,
            details: { tool: toolName, args: event.data?.args },
          };
          set((s) => ({
            lifecycleStage: 'executing',
            activityLogs: [...s.activityLogs, logItem],
          }));
          break;
        }

        case 'tool.completed': {
          const toolName = event.data?.tool || 'tool';
          const success = event.data?.success;
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'tool.completed',
            summary: `Completed tool: ${toolName} (${success ? 'Success' : 'Failed'})`,
            details: { tool: toolName, success, result: event.data?.result },
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'file.changed':
        case 'file.created':
        case 'file.deleted': {
          const path = event.data?.path || '';
          if (path) {
            const status: ChangeStatus =
              event.type === 'file.created' ? 'created' : event.type === 'file.deleted' ? 'deleted' : 'modified';
            get().recordFileEvent(status, path);
          }
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: event.type,
            summary: `File ${event.type.split('.')[1]}: ${path}`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'diff.created': {
          const path = event.data?.path;
          if (path) {
            get().recordFileEvent('modified', path, { diff: event.data?.diff });
          }
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'diff.created',
            summary: `Diff created: ${path} (+${event.data?.additions || 0}/-${event.data?.deletions || 0})`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'command.started': {
          const cmd = event.data?.command || '';
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'command.started',
            summary: `Running shell: ${cmd}`,
            details: event.data,
          };
          set((s) => ({
            lifecycleStage: 'executing',
            activityLogs: [...s.activityLogs, logItem],
            liveOutput: `> ${cmd}\n`,
          }));
          break;
        }

        case 'command.output': {
          const output = event.data?.output || '';
          set((s) => ({ liveOutput: s.liveOutput + output }));
          break;
        }

        case 'command.completed': {
          const exitCode = event.data?.exit_code;
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'command.completed',
            summary: `Command finished (exit code ${exitCode})`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'verification.started': {
          set({ lifecycleStage: 'verifying' });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'verification.started',
            summary: `Verifying changes (attempt ${event.data?.attempt || 1})...`,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'verification.passed': {
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'verification.passed',
            summary: 'Verification passed successfully!',
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'verification.failed': {
          set({ lifecycleStage: 'fixing' });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'verification.failed',
            summary: `Verification failed. CoreMind is self-healing...`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'agent.waiting_for_user': {
          set({
            lifecycleStage: 'observing',
            pendingQuestion: {
              question_id: event.data?.question_id,
              question: event.data?.question,
              options: event.data?.options || [],
            },
          });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'agent.waiting_for_user',
            summary: `Clarification needed: "${event.data?.question}"`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'agent.approval.required': {
          set({
            lifecycleStage: 'observing',
            pendingApproval: {
              approval_id: event.data?.approval_id,
              tool: event.data?.tool,
              args: event.data?.args || {},
              description: event.data?.description || 'Execute tool action',
            },
          });
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'agent.approval.required',
            summary: `Approval requested: ${event.data?.tool}`,
            details: event.data,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'agent.approval.granted': {
          set({ pendingApproval: null });
          break;
        }

        case 'agent.approval.denied': {
          set({ pendingApproval: null });
          break;
        }

        case 'agent.completed': {
          const changeId = event.data?.change_id;
          set({
            lifecycleStage: 'completed',
            isLoading: false,
            runEndedAt: Date.now(),
            streamMessageId: null,
            activeChangeId: changeId || null,
          });

          const reported: string[] = Array.isArray(event.data?.files_changed) ? event.data.files_changed : [];
          const sessionId = state.currentSessionId;
          const finalize = async () => {
            if (changeId) await get().loadChanges(changeId);
            await get().finalizeTask(reported);

            const summary = get().taskSummary;
            const content = summary
              ? formatSummary(summary)
              : `Task completed successfully in ${event.data?.steps || 1} steps.`;
            set((s) => ({
              messages: [
                ...s.messages,
                { id: `ai-${Date.now()}`, role: 'assistant', content, timestamp: Date.now() },
              ],
            }));

            if (sessionId) {
              const updated = get().sessions.map((sess) =>
                sess.id === sessionId
                  ? {
                      ...sess,
                      messages: get().messages,
                      updatedAt: Date.now(),
                      changeId,
                      changes: sortedChanges(get().trackedChanges),
                    }
                  : sess
              );
              set({ sessions: updated });
              saveSessions(updated);
            }
          };
          void finalize();
          break;
        }

        case 'agent.failed': {
          const errMsg = event.data?.error || 'Agent failed to complete task.';
          set({
            lifecycleStage: 'failed',
            isLoading: false,
            runEndedAt: Date.now(),
            error: errMsg,
          });
          set((s) => ({
            messages: [
              ...s.messages,
              {
                id: `err-${Date.now()}`,
                role: 'assistant',
                content: `Agent Failed: ${errMsg}`,
                timestamp: Date.now(),
              },
            ],
          }));
          break;
        }

        case 'agent.stopped': {
          set({
            lifecycleStage: 'stopped',
            isLoading: false,
            runEndedAt: Date.now(),
          });
          set((s) => ({
            messages: [
              ...s.messages,
              {
                id: `stop-${Date.now()}`,
                role: 'assistant',
                content: `Agent execution was stopped.`,
                timestamp: Date.now(),
              },
            ],
          }));
          break;
        }

        case 'agent.error': {
          const errMsg = event.data?.error || 'Unhandled agent error.';
          set({
            error: errMsg,
            isLoading: false,
          });
          break;
        }
      }
    });
  },

  setSelectedModel: (model: string) => {
    localStorage.setItem(STORAGE_KEY_MODEL, model);
    set({ selectedModel: model });
  },

  buildCurrentContext: (): AgentContext => {
    const { rootPath } = useWorkspaceStore.getState();
    const { tabs, activeTabId } = useTabsStore.getState();
    const activeTab = tabs.find((t) => t.id === activeTabId);

    return {
      workspacePath: rootPath,
      activeFile: activeTab ? activeTab.fileName : null,
      activeFileContent: activeTab ? activeTab.content : null,
      selectedCode: null,
      terminalOutput: null,
    };
  },

  newSession: () => {
    set({
      currentSessionId: null,
      messages: [],
      error: null,
      agentId: null,
      lifecycleStage: 'idle',
      taskGraph: null,
      activityLogs: [],
      pendingQuestion: null,
      pendingApproval: null,
      activeChangeId: null,
      changeSet: null,
      trackedChanges: {},
      taskSummary: null,
      reviewIndex: null,
      changeNotice: null,
      tokenUsage: null,
      steps: null,
      liveOutput: '',
      runStartedAt: null,
      streamMessageId: null,
      runEndedAt: null,
    });
  },

  loadSession: (sessionId: string) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (session) {
      set({
        currentSessionId: session.id,
        messages: session.messages,
        agentId: session.agentId || null,
        activeChangeId: session.changeId || null,
        trackedChanges: Object.fromEntries((session.changes ?? []).map((c) => [c.path, c])),
        taskSummary: null,
        reviewIndex: null,
        changeNotice: null,
        error: null,
        lifecycleStage: 'completed',
      });
      if (session.changeId) {
        get().loadChanges(session.changeId);
      }
    }
  },

  deleteSession: (sessionId: string) => {
    const remaining = get().sessions.filter((s) => s.id !== sessionId);
    saveSessions(remaining);
    if (get().currentSessionId === sessionId) {
      get().newSession();
    }
    set({ sessions: remaining });
  },

  sendMessage: async (prompt: string): Promise<boolean> => {
    const trimmed = prompt.trim();
    if (!trimmed) return false;

    // Ensure WebSocket listeners are initialized
    get().initWsListeners();

    // The agent must never write into an unknown location.
    if (!useWorkspaceStore.getState().rootPath) {
      set((s) => ({
        messages: [
          ...s.messages,
          { id: `user-${Date.now()}`, role: 'user', content: trimmed, timestamp: Date.now() },
          {
            id: `sys-${Date.now()}`,
            role: 'assistant',
            content: 'No workspace is open. Open a folder (or create a project) first so I know where to create files.',
            timestamp: Date.now(),
          },
        ],
      }));
      return false;
    }

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    let sessionId = get().currentSessionId;
    let sessions = [...get().sessions];

    if (!sessionId) {
      const title = trimmed.length > 40 ? trimmed.slice(0, 40) + '...' : trimmed;
      sessionId = `session-${Date.now()}`;
      const newSessionObj: AgentSession = {
        id: sessionId,
        title,
        messages: [userMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      sessions.unshift(newSessionObj);
      set({ currentSessionId: sessionId, sessions });
      saveSessions(sessions);
    }

    const currentMessages = [...get().messages, userMessage];
    set({
      messages: currentMessages,
      isLoading: true,
      error: null,
      lifecycleStage: 'analyzing',
      runStartedAt: Date.now(),
      streamMessageId: null,
      runEndedAt: null,
      liveOutput: '',
      taskGraph: null,
      activityLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: Date.now(),
          type: 'user.prompt',
          summary: `Request dispatched: "${trimmed}"`,
        },
      ],
      pendingQuestion: null,
      pendingApproval: null,
      activeChangeId: null,
      changeSet: null,
      trackedChanges: {},
      taskSummary: null,
      reviewIndex: null,
      changeNotice: null,
    });
    baselines.clear();

    const rootPath = useWorkspaceStore.getState().rootPath || '';

    try {
      // Trigger real agent backend run
      const runRes = await agentService.run(trimmed, rootPath, sessionId);
      const agentId = runRes.agent_id;

      set({
        agentId,
        lifecycleStage: 'analyzing',
      });

      // Update session with agentId
      const updatedSessions = get().sessions.map((s) =>
        s.id === sessionId ? { ...s, agentId, updatedAt: Date.now() } : s
      );
      set({ sessions: updatedSessions });
      saveSessions(updatedSessions);

      return true;
    } catch (err: unknown) {
      const error = err as Error;
      const errorMsg = error.message || 'Failed to start AI Agent on backend.';
      set({
        isLoading: false,
        lifecycleStage: 'failed',
        error: errorMsg,
        messages: [
          ...currentMessages,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `CoreMind Agent Error: ${errorMsg}. Ensure backend is running at http://localhost:43110.`,
            timestamp: Date.now(),
          },
        ],
      });
      return false;
    }
  },

  stopAgent: async (): Promise<boolean> => {
    const { agentId } = get();
    if (!agentId) return false;

    try {
      await agentService.stop(agentId);
      set({
        isLoading: false,
        lifecycleStage: 'stopped',
      });
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  answerQuestion: async (answer: string): Promise<boolean> => {
    const { pendingQuestion } = get();
    if (!pendingQuestion) return false;

    const qId = pendingQuestion.question_id;

    // Send answer via WebSocket (or fallback to REST)
    let ok = coremindWs.answerQuestion(qId, answer);
    if (!ok) {
      try {
        await agentService.answerQuestion(qId, answer);
        ok = true;
      } catch {
        ok = false;
      }
    }

    if (ok) {
      // Append answer to conversation
      set((s) => ({
        pendingQuestion: null,
        messages: [
          ...s.messages,
          {
            id: `ans-${Date.now()}`,
            role: 'user',
            content: `[Clarification Answer]: ${answer}`,
            timestamp: Date.now(),
          },
        ],
      }));
      return true;
    }
    return false;
  },

  approveAction: async (): Promise<boolean> => {
    const { pendingApproval, agentId } = get();
    if (!pendingApproval) return false;

    const approvalId = pendingApproval.approval_id;
    let ok = coremindWs.approve(approvalId);
    if (!ok) {
      try {
        await agentService.approveAction(approvalId, agentId || undefined);
        ok = true;
      } catch {
        ok = false;
      }
    }

    if (ok) {
      set({ pendingApproval: null });
      return true;
    }
    return false;
  },

  denyAction: async (reason?: string): Promise<boolean> => {
    const { pendingApproval, agentId } = get();
    if (!pendingApproval) return false;

    const approvalId = pendingApproval.approval_id;
    let ok = coremindWs.deny(approvalId, reason);
    if (!ok) {
      try {
        await agentService.denyAction(approvalId, agentId || undefined, reason);
        ok = true;
      } catch {
        ok = false;
      }
    }

    if (ok) {
      set({ pendingApproval: null });
      return true;
    }
    return false;
  },

  recordFileEvent: (type, rawPath, extra) => {
    const resolved = resolveWorkspacePath(rawPath, useWorkspaceStore.getState().rootPath);
    if (!resolved) return;
    const counts = extra?.diff ? countDiff(extra.diff) : {};
    set((s) => ({ trackedChanges: recordChange(s.trackedChanges, resolved, type, { ...extra, ...counts }) }));
    if (!resolved.outsideWorkspace) {
      notifyExternalChanges([{ path: resolved.absPath, type: type === 'deleted' ? 'deleted' : 'changed' }]);
    }
  },

  loadChanges: async (changeId: string) => {
    try {
      const changeSet = await changesService.getChanges(changeId);
      const rootPath = useWorkspaceStore.getState().rootPath;
      set((s) => {
        let tracked = s.trackedChanges;
        for (const file of changeSet.files || []) {
          const resolved = resolveWorkspacePath(file.path, rootPath);
          if (!resolved) continue;
          const prev = tracked[resolved.path];
          const counts = file.diff ? countDiff(file.diff) : { additions: file.additions, deletions: file.deletions };
          // The backend change set is authoritative for status and diff of the files it reports.
          tracked = {
            ...tracked,
            [resolved.path]: {
              path: resolved.path,
              absPath: resolved.absPath,
              outsideWorkspace: resolved.outsideWorkspace,
              status: file.status,
              additions: counts.additions ?? 0,
              deletions: counts.deletions ?? 0,
              diff: file.diff || prev?.diff,
              baseline: prev?.baseline,
            },
          };
        }
        return { changeSet, activeChangeId: changeId, trackedChanges: tracked };
      });
    } catch (err: unknown) {
      console.warn('Failed to load changes for review:', err);
      set({ activeChangeId: changeId });
    }
  },

  // Reconciles everything reported by events, the backend change set and the completion payload
  // against the real filesystem, then builds the task summary from what is actually on disk.
  finalizeTask: async (reportedFiles) => {
    const rootPath = useWorkspaceStore.getState().rootPath;
    let tracked = get().trackedChanges;
    for (const raw of reportedFiles) {
      const resolved = resolveWorkspacePath(raw, rootPath);
      if (resolved && !tracked[resolved.path]) {
        tracked = recordChange(tracked, resolved, 'modified');
      }
    }

    const failures: string[] = [];
    const verified: ChangeMap = {};
    for (const change of Object.values(tracked)) {
      let next: TrackedChange = { ...change };
      if (!change.outsideWorkspace && rootPath) {
        const current = await readCurrent(change.absPath, rootPath);
        if (current === undefined) {
          failures.push(change.path);
        } else {
          const exists = current !== null;
          if (!exists && next.status === 'created') continue; // created then removed again: no net change
          if (!exists) next = { ...next, status: 'deleted' };
          else if (next.status === 'deleted') next = { ...next, status: 'modified' };

          if (next.status === 'created') {
            next.baseline = null;
          } else if (next.diff) {
            const reconstructed = reverseApplyUnifiedDiff(current ?? '', next.diff);
            if (reconstructed !== null) next.baseline = reconstructed;
          }
          if (next.baseline === undefined && baselines.has(next.absPath)) {
            next.baseline = baselines.get(next.absPath);
          }
          if (next.baseline !== undefined && next.baseline !== null && current === next.baseline) {
            continue; // content identical to the original: nothing changed
          }
        }
      }
      verified[next.path] = next;
    }

    const list = sortedChanges(verified);
    const pathsOf = (status: ChangeStatus) => list.filter((c) => c.status === status).map((c) => c.path);
    const outside = list.filter((c) => c.outsideWorkspace).map((c) => c.absPath);
    const verification: TaskSummary['verification'] = [];
    if (list.length > 0) {
      if (list.some((c) => c.status === 'created')) {
        verification.push({ label: 'Files created', ok: !failures.some((f) => verified[f]?.status === 'created') });
      }
      verification.push({ label: 'Changes applied on disk', ok: failures.length === 0 });
      verification.push({ label: 'All changes inside the workspace', ok: outside.length === 0 });
    }

    set({
      trackedChanges: verified,
      reviewIndex: null,
      changeNotice:
        outside.length > 0
          ? `${outside.length} file(s) were changed outside the open workspace and are not shown in the Explorer.`
          : null,
      taskSummary: {
        total: list.length,
        created: pathsOf('created'),
        modified: pathsOf('modified'),
        deleted: pathsOf('deleted'),
        outsideWorkspace: outside,
        verification,
      },
    });
    notifyExternalChanges(
      list.filter((c) => !c.outsideWorkspace).map((c) => ({
        path: c.absPath,
        type: c.status === 'deleted' ? ('deleted' as const) : ('changed' as const),
      }))
    );
  },

  openChange: async (path: string) => {
    const list = sortedChanges(get().trackedChanges);
    const index = list.findIndex((c) => c.path === path);
    const change = list[index];
    if (!change) return;
    set({ reviewIndex: index, changeNotice: null });
    try {
      if (change.outsideWorkspace) {
        set({ changeNotice: `${change.absPath} is outside the open workspace and cannot be opened in the editor.` });
        return;
      }
      const outcome = await openChangeDiff(change);
      if (outcome === 'file') {
        set({ changeNotice: `Original content of ${change.path} is unavailable; showing the current file instead.` });
      }
    } catch (err: unknown) {
      set({ changeNotice: (err as Error).message });
    }
  },

  reviewChanges: async () => {
    const first = sortedChanges(get().trackedChanges)[0];
    if (first) await get().openChange(first.path);
  },

  reviewStep: async (delta) => {
    const list = sortedChanges(get().trackedChanges);
    if (list.length === 0) return;
    const current = get().reviewIndex ?? (delta === 1 ? -1 : 0);
    const next = (current + delta + list.length) % list.length;
    await get().openChange(list[next].path);
  },

  acceptAllChanges: async (): Promise<boolean> => {
    const { activeChangeId } = get();
    try {
      if (activeChangeId) await changesService.acceptChanges(activeChangeId);
      baselines.clear();
      set({ changeSet: null, activeChangeId: null, trackedChanges: {}, taskSummary: null, reviewIndex: null, changeNotice: null });
      persistChanges(get);
      return true;
    } catch (err: unknown) {
      set({ error: (err as Error).message });
      return false;
    }
  },

  rejectAllChanges: async (): Promise<boolean> => {
    const { activeChangeId, trackedChanges } = get();
    try {
      if (activeChangeId) {
        await changesService.rejectChanges(activeChangeId);
        await finishRejection(Object.values(trackedChanges), set, get);
        return true;
      }
      for (const change of sortedChanges(trackedChanges)) {
        const ok = await get().rejectFileChange(change.path);
        if (!ok) return false;
      }
      return true;
    } catch (err: unknown) {
      set({ error: (err as Error).message });
      return false;
    }
  },

  acceptFileChange: async (filePath: string): Promise<boolean> => {
    const { activeChangeId } = get();
    try {
      if (activeChangeId) await changesService.acceptFile(activeChangeId, filePath);
      removeChange(set, get, filePath);
      return true;
    } catch (err: unknown) {
      set({ error: (err as Error).message });
      return false;
    }
  },

  rejectFileChange: async (filePath: string): Promise<boolean> => {
    const { activeChangeId, trackedChanges } = get();
    const change = trackedChanges[filePath];
    if (!change) return false;
    try {
      if (activeChangeId) {
        await changesService.rejectFile(activeChangeId, filePath);
      } else {
        await revertLocally(change);
      }
      notifyExternalChanges([{ path: change.absPath, type: change.baseline === null ? 'deleted' : 'changed' }]);
      removeChange(set, get, filePath);
      await refreshExplorer();
      return true;
    } catch (err: unknown) {
      set({ changeNotice: (err as Error).message });
      return false;
    }
  },

  clearMessages: () => {
    set({
      messages: [],
      error: null,
      activityLogs: [],
      liveOutput: '',
      taskGraph: null,
      lifecycleStage: 'idle',
    });
  },
}));
