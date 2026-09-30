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
import { useFilesStore } from './filesStore';

export interface AgentSession {
  id: string;
  title: string;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
  agentId?: string;
  changeId?: string;
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
  isReviewingChanges: boolean;
  tokenUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  steps: { current: number; max: number } | null;
  liveOutput: string;

  // Methods
  initWsListeners: () => void;
  sendMessage: (prompt: string) => Promise<boolean>;
  stopAgent: () => Promise<boolean>;
  answerQuestion: (answer: string) => Promise<boolean>;
  approveAction: () => Promise<boolean>;
  denyAction: (reason?: string) => Promise<boolean>;
  loadChanges: (changeId: string) => Promise<void>;
  setIsReviewingChanges: (open: boolean) => void;
  acceptAllChanges: () => Promise<boolean>;
  rejectAllChanges: () => Promise<boolean>;
  acceptFileChange: (filePath: string) => Promise<boolean>;
  rejectFileChange: (filePath: string) => Promise<boolean>;

  clearMessages: () => void;
  newSession: () => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  setSelectedModel: (model: string) => void;
  buildCurrentContext: () => AgentContext;
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
  isReviewingChanges: false,
  tokenUsage: null,
  steps: null,
  liveOutput: '',

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
          });
          break;
        }

        case 'agent.ai.token': {
          const chunk = event.data?.token || '';
          if (chunk) {
            set((s) => {
              const msgs = [...s.messages];
              const lastMsg = msgs[msgs.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content += chunk;
                return { messages: msgs };
              } else {
                msgs.push({
                  id: `ai-stream-${Date.now()}`,
                  role: 'assistant',
                  content: chunk,
                  timestamp: Date.now(),
                });
                return { messages: msgs };
              }
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
          const logItem: ActivityLogItem = {
            id: `log-${now}`,
            timestamp: now,
            type: 'tool.started',
            summary: `Executing tool: ${toolName}`,
            details: event.data?.args,
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
            details: event.data?.result,
          };
          set((s) => ({ activityLogs: [...s.activityLogs, logItem] }));
          break;
        }

        case 'file.changed':
        case 'file.created':
        case 'file.deleted': {
          const path = event.data?.path || '';
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
            activeChangeId: changeId || null,
          });

          if (changeId) {
            get().loadChanges(changeId);
          }

          // If assistant message was not closed, append completion notice
          set((s) => {
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (!lastMsg || lastMsg.role !== 'assistant') {
              msgs.push({
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: `Task completed successfully in ${event.data?.steps || 1} steps.`,
                timestamp: Date.now(),
              });
            }
            return { messages: msgs };
          });

          // Sync session
          const currentSessId = state.currentSessionId;
          if (currentSessId) {
            const updated = get().sessions.map((sess) =>
              sess.id === currentSessId
                ? {
                    ...sess,
                    messages: get().messages,
                    updatedAt: Date.now(),
                    changeId,
                  }
                : sess
            );
            set({ sessions: updated });
            saveSessions(updated);
          }
          break;
        }

        case 'agent.failed': {
          const errMsg = event.data?.error || 'Agent failed to complete task.';
          set({
            lifecycleStage: 'failed',
            isLoading: false,
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
      isReviewingChanges: false,
      tokenUsage: null,
      steps: null,
      liveOutput: '',
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
    });

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

  loadChanges: async (changeId: string) => {
    try {
      const changeSet = await changesService.getChanges(changeId);
      set({ changeSet, activeChangeId: changeId });
    } catch (err: unknown) {
      console.warn('Failed to load changes for review:', err);
    }
  },

  setIsReviewingChanges: (open: boolean) => {
    set({ isReviewingChanges: open });
  },

  acceptAllChanges: async (): Promise<boolean> => {
    const { activeChangeId } = get();
    if (!activeChangeId) return false;

    try {
      await changesService.acceptChanges(activeChangeId);
      // Reload changes and reload workspace files
      const rootPath = useWorkspaceStore.getState().rootPath;
      if (rootPath) {
        await useFilesStore.getState().loadWorkspaceTree(rootPath);
      }
      set({ isReviewingChanges: false, changeSet: null, activeChangeId: null });
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  rejectAllChanges: async (): Promise<boolean> => {
    const { activeChangeId } = get();
    if (!activeChangeId) return false;

    try {
      await changesService.rejectChanges(activeChangeId);
      const rootPath = useWorkspaceStore.getState().rootPath;
      if (rootPath) {
        await useFilesStore.getState().loadWorkspaceTree(rootPath);
      }
      set({ isReviewingChanges: false, changeSet: null, activeChangeId: null });
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  acceptFileChange: async (filePath: string): Promise<boolean> => {
    const { activeChangeId } = get();
    if (!activeChangeId) return false;

    try {
      await changesService.acceptFile(activeChangeId, filePath);
      await get().loadChanges(activeChangeId);
      const rootPath = useWorkspaceStore.getState().rootPath;
      if (rootPath) {
        await useFilesStore.getState().loadWorkspaceTree(rootPath);
      }
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  rejectFileChange: async (filePath: string): Promise<boolean> => {
    const { activeChangeId } = get();
    if (!activeChangeId) return false;

    try {
      await changesService.rejectFile(activeChangeId, filePath);
      await get().loadChanges(activeChangeId);
      const rootPath = useWorkspaceStore.getState().rootPath;
      if (rootPath) {
        await useFilesStore.getState().loadWorkspaceTree(rootPath);
      }
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
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
