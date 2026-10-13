import { create } from 'zustand';
import {
  AIWorkspaceEvent,
  AIRequestStatus,
  TaskGraph,
  TaskNode,
  TerminalEvent,
  AgentExecutionState,
  AGENT_STATE_LABELS,
} from '../types/aiWorkspace';
export { AGENT_STATE_LABELS };
import { agentService } from './coremind/agent';
import { changesService } from './coremind/changes';
import { coremindClient } from './coremind/client';
import { coremindWs } from './coremind/websocket';
import { CoreMindEvent, ChangeSet } from './coremind/types';
import { useTabsStore } from '../stores/tabsStore';
import { useFilesStore } from '../stores/filesStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

export type FileChangeSubscriber = (filePath: string, action?: string, additions?: number, deletions?: number, diff?: string) => void;
export type ChangesResetSubscriber = () => void;
export type SingleFileChangeSubscriber = (filePath: string) => void;

const fileChangeSubscribers = new Set<FileChangeSubscriber>();
const changesResetSubscribers = new Set<ChangesResetSubscriber>();
const singleFileRemovedSubscribers = new Set<SingleFileChangeSubscriber>();

export function subscribeFileChanges(sub: FileChangeSubscriber): () => void {
  fileChangeSubscribers.add(sub);
  return () => {
    fileChangeSubscribers.delete(sub);
  };
}

export function subscribeChangesReset(sub: ChangesResetSubscriber): () => void {
  changesResetSubscribers.add(sub);
  return () => {
    changesResetSubscribers.delete(sub);
  };
}

export function subscribeFileRemoved(sub: SingleFileChangeSubscriber): () => void {
  singleFileRemovedSubscribers.add(sub);
  return () => {
    singleFileRemovedSubscribers.delete(sub);
  };
}

export interface FileChangeInfo {
  file: string;
  action?: 'created' | 'modified' | 'deleted';
  lines?: number;
  additions?: number;
  deletions?: number;
  diff?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  filesChanged?: FileChangeInfo[];
  localUrl?: string;
  terminalCommand?: string;
  terminalEvents?: TerminalEvent[];
  activityEvents?: AIWorkspaceEvent[];
  thoughtSummary?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  chatHistory: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  taskGraph?: TaskGraph | null;
  changeId?: string | null;
}

const SESSIONS_STORAGE_KEY = 'coremind_chat_sessions';
const ACTIVE_SESSION_KEY = 'coremind_active_session';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSessions(): ChatSession[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load chat sessions from localStorage:', e);
  }
  return [];
}

function saveSessions(sessions: ChatSession[]) {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save chat sessions to localStorage:', e);
  }
}

function loadActiveSessionId(): string | null {
  try {
    const storage = getStorage();
    if (!storage) return null;
    return storage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

function saveActiveSessionId(id: string | null) {
  try {
    const storage = getStorage();
    if (!storage) return;
    if (id) {
      storage.setItem(ACTIVE_SESSION_KEY, id);
    } else {
      storage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

/** Derive a short title from the first user message */
function deriveTitle(content: string): string {
  const cleaned = content.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 48) return cleaned;
  return cleaned.slice(0, 45) + '...';
}

/**
 * Extracts and strips internal model reasoning tags (<think>...</think> or <thought>...</thought>)
 * so internal reasoning doesn't pollute the final assistant answer.
 */
export function parseReasoningAndContent(rawText: string): { cleanContent: string; thoughtSummary?: string } {
  if (!rawText) return { cleanContent: '' };

  let thoughtSummary: string | undefined;
  let cleanContent = rawText;

  // 1. Complete closed reasoning tags
  const thinkRegex = /<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/gi;
  const matches = [...rawText.matchAll(thinkRegex)];
  if (matches.length > 0) {
    thoughtSummary = matches.map((m) => m[1].trim()).join('\n\n');
    cleanContent = cleanContent.replace(thinkRegex, '').trimStart();
  }

  // 2. Open unclosed tag at end of streaming chunk
  const unclosedMatch = cleanContent.match(/<(?:think|thought)>([\s\S]*)$/i);
  if (unclosedMatch) {
    const unclosedThought = unclosedMatch[1].trim();
    thoughtSummary = thoughtSummary ? `${thoughtSummary}\n\n${unclosedThought}` : unclosedThought;
    cleanContent = cleanContent.replace(/<(?:think|thought)>[\s\S]*$/i, '').trimStart();
  }

  return { cleanContent, thoughtSummary };
}

/**
 * Generates a clean, trustworthy summary when the agent finishes its work.
 */
export function formatTaskCompletedSummary(
  stepsOrOptions:
    | number
    | {
        steps?: number;
        files_changed?: string[];
        filesChanged?: string[];
        tests_passed?: number;
        tests_failed?: number;
        trackedChanges?: Record<string, FileChangeInfo>;
        hasVerifications?: boolean;
        verificationPassed?: boolean;
      } = 1,
  filesChanged: string[] = [],
  trackedChanges: Record<string, FileChangeInfo> = {},
  hasVerifications: boolean = false,
  verificationPassed: boolean = true
): string {
  let steps = 1;
  let finalFiles: string[] = filesChanged;
  let finalTracked: Record<string, FileChangeInfo> = trackedChanges;
  let finalHasVerifications = hasVerifications;
  let finalVerificationPassed = verificationPassed;

  if (typeof stepsOrOptions === 'object' && stepsOrOptions !== null) {
    steps = stepsOrOptions.steps || 1;
    finalFiles = stepsOrOptions.files_changed || stepsOrOptions.filesChanged || [];
    finalTracked = stepsOrOptions.trackedChanges || {};
    if (typeof stepsOrOptions.tests_passed === 'number' || typeof stepsOrOptions.tests_failed === 'number') {
      finalHasVerifications = true;
      finalVerificationPassed = (stepsOrOptions.tests_failed ?? 0) === 0;
    } else if (stepsOrOptions.hasVerifications !== undefined) {
      finalHasVerifications = stepsOrOptions.hasVerifications;
      finalVerificationPassed = stepsOrOptions.verificationPassed ?? true;
    }
  } else if (typeof stepsOrOptions === 'number') {
    steps = stepsOrOptions;
  }

  const parts: string[] = [];
  parts.push(`### Task Completed\n\nThe autonomous agent finished execution in **${steps}** ${steps === 1 ? 'step' : 'steps'}.`);

  const fileKeys = Array.isArray(finalFiles) && finalFiles.length > 0 ? finalFiles : Object.keys(finalTracked);
  if (fileKeys.length > 0) {
    parts.push(`\n#### Files Changed (${fileKeys.length})\n`);
    for (const file of fileKeys) {
      const clean = file.replace(/^\/+/, '').trim();
      const info = finalTracked[clean];
      const adds = info?.additions ? `+${info.additions}` : '';
      const dels = info?.deletions ? `-${info.deletions}` : '';
      const diffStat = [adds, dels].filter(Boolean).join(', ');
      const action = info?.action ? ` (${info.action})` : '';
      parts.push(`- \`${clean}\`${action}${diffStat ? ` [${diffStat}]` : ''}`);
    }
  } else {
    parts.push('\nNo files were modified during this task.');
  }

  if (finalHasVerifications) {
    if (typeof stepsOrOptions === 'object' && typeof stepsOrOptions?.tests_passed === 'number') {
      const passed = stepsOrOptions.tests_passed;
      const failed = stepsOrOptions.tests_failed ?? 0;
      parts.push(`\n#### Verification\n✓ ${passed} tests passed${failed > 0 ? `, ✗ ${failed} tests failed` : ''}.`);
    } else {
      parts.push(`\n#### Verification\n${finalVerificationPassed ? '✓ All verification checks passed.' : '✗ Verification checks failed.'}`);
    }
  }

  return parts.join('\n');
}

export type AgentPhase =
  | 'thinking'
  | 'inspecting'
  | 'editing'
  | 'running_command'
  | 'testing'
  | 'searching'
  | 'working'
  | 'planning'
  | 'verifying';

export function resolveExecutionState(
  status: AIRequestStatus,
  phase?: AgentPhase
): AgentExecutionState {
  if (status === 'completed') return 'completed';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status === 'cancelled' || status === 'stopped') return 'cancelled';
  if (status === 'idle') return 'idle';

  switch (phase) {
    case 'inspecting':
    case 'searching':
      return 'inspecting';
    case 'editing':
      return 'editing';
    case 'running_command':
      return 'running_command';
    case 'testing':
    case 'verifying':
      return 'testing';
    case 'thinking':
    case 'planning':
    default:
      return 'thinking';
  }
}

export type WorkspaceViewTab = 'chat' | 'plan' | 'activity' | 'changes';
export type AgentOperationMode = 'agent' | 'chat';

interface AIWorkspaceStore {
  events: AIWorkspaceEvent[];
  chatHistory: ChatMessage[];
  currentState: AIRequestStatus;
  executionState: AgentExecutionState;
  agentPhase: AgentPhase;
  agentPhaseDetail?: string;
  selectedModel: string;
  agentMode: AgentOperationMode;
  activeView: WorkspaceViewTab;
  abortController: AbortController | null;

  // Real Agent Execution State
  agentId: string | null;
  taskGraph: TaskGraph | null;
  trackedChanges: Record<string, FileChangeInfo>;
  changeId: string | null;
  pendingQuestion: { question_id: string; question: string; options?: string[] } | null;
  pendingApproval: { approval_id: string; tool: string; args: Record<string, any>; description: string } | null;
  streamMessageId: string | null;
  activeTurnStartTime: number | null;
  tokenUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;

  // Session management
  sessions: ChatSession[];
  activeSessionId: string | null;
  isHistoryOpen: boolean;
  isAiSettingsOpen: boolean;
  draftPrompt: string;

  // State setters
  setIsAiSettingsOpen: (open: boolean) => void;
  setAgentMode: (mode: AgentOperationMode) => void;
  setActiveView: (view: WorkspaceViewTab) => void;
  addEvent: (event: AIWorkspaceEvent) => void;
  updateEvent: (id: string, updates: Partial<AIWorkspaceEvent>) => void;
  setDraftPrompt: (prompt: string) => void;
  setAgentPhase: (phase: AgentPhase, detail?: string) => void;
  setExecutionState: (state: AgentExecutionState, detail?: string) => void;
  resetForNewTurn: () => void;
  setActiveTurnStartTime: (time: number | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  appendStreamChunk: (msgId: string, chunk: string) => void;
  setState: (state: AIRequestStatus) => void;
  setSelectedModel: (model: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  setAgentId: (id: string | null) => void;
  setTaskGraph: (graph: TaskGraph | null) => void;
  updateTaskNode: (taskId: string, updates: Partial<TaskNode>) => void;
  recordFileChange: (file: string, action?: 'created' | 'modified' | 'deleted', additions?: number, deletions?: number, diff?: string) => void;
  setChangeId: (changeId: string | null) => void;
  changeSet: ChangeSet | null;
  setChangeSet: (cs: ChangeSet | null) => void;
  loadChanges: (changeId: string) => Promise<void>;
  setPendingQuestion: (question: { question_id: string; question: string; options?: string[] } | null) => void;
  setPendingApproval: (approval: { approval_id: string; tool: string; args: Record<string, any>; description: string } | null) => void;

  // Agent Actions
  submitPrompt: (prompt: string) => Promise<boolean>;
  handleCoreMindEvent: (event: CoreMindEvent) => void;
  finalizeActiveAssistantTurn: (params: { steps?: number; filesChanged?: string[]; status: 'completed' | 'failed' | 'cancelled'; error?: string; response?: string }) => void;
  initWsListeners: () => void;
  submitAnswer: (answer: string) => Promise<boolean>;
  approveAction: () => Promise<boolean>;
  denyAction: (reason?: string) => Promise<boolean>;
  cancelRequest: () => void;
  cancelTask: () => void;
  handleWorkspaceSwitch: (newPath?: string) => void;
  acceptAllChanges: () => Promise<boolean>;
  rejectAllChanges: () => Promise<boolean>;
  acceptFileChange: (filePath: string) => Promise<boolean>;
  rejectFileChange: (filePath: string) => Promise<boolean>;
  safeRefreshEditorBuffers: (affectedFiles: string[], rootPath: string) => Promise<void>;
  clear: () => void;

  // Session actions
  setHistoryOpen: (open: boolean) => void;
  toggleHistory: () => void;
  newSession: () => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  _persistCurrentSession: () => void;
}

let wsSubscribed = false;

export const useAIWorkspaceStore = create<AIWorkspaceStore>((set, get) => {
  const savedSessions = loadSessions();
  const savedActiveId = loadActiveSessionId();
  const activeSession = savedSessions.find((s) => s.id === savedActiveId);

  return {
    events: [],
    chatHistory: activeSession?.chatHistory ?? [],
    currentState: 'idle',
    executionState: 'idle',
    agentPhase: 'thinking',
    agentPhaseDetail: undefined,
    selectedModel: 'NVIDIA Nemotron 3.5 Lightning',
    agentMode: 'agent',
    activeView: 'chat',
    abortController: null,

    agentId: null,
    taskGraph: activeSession?.taskGraph ?? null,
    trackedChanges: {},
    changeId: activeSession?.changeId ?? null,
    changeSet: null,
    pendingQuestion: null,
    pendingApproval: null,
    streamMessageId: null,
    activeTurnStartTime: null,
    tokenUsage: null,

    sessions: savedSessions,
    activeSessionId: activeSession ? activeSession.id : null,
    isHistoryOpen: false,
    isAiSettingsOpen: false,
    draftPrompt: '',

    setIsAiSettingsOpen: (open) => set({ isAiSettingsOpen: open }),
    setAgentMode: (mode) => set({ agentMode: mode }),
    setActiveView: (view) => set({ activeView: view }),
    addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
    updateEvent: (id, updates) =>
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? ({ ...e, ...updates } as AIWorkspaceEvent) : e)),
      })),

    setDraftPrompt: (prompt) => set({ draftPrompt: prompt }),
    setAgentPhase: (phase, detail) =>
      set((state) => ({
        agentPhase: phase,
        agentPhaseDetail: detail !== undefined ? detail : state.agentPhaseDetail,
        executionState: resolveExecutionState(state.currentState, phase),
      })),
    setExecutionState: (state, detail) => {
      const statusMap: Record<AgentExecutionState, AIRequestStatus> = {
        idle: 'idle',
        thinking: 'running',
        inspecting: 'running',
        editing: 'running',
        running_command: 'running',
        testing: 'running',
        completed: 'completed',
        failed: 'failed',
        cancelled: 'cancelled',
      };
      const phaseMap: Record<AgentExecutionState, AgentPhase> = {
        idle: 'thinking',
        thinking: 'thinking',
        inspecting: 'inspecting',
        editing: 'editing',
        running_command: 'running_command',
        testing: 'testing',
        completed: 'thinking',
        failed: 'thinking',
        cancelled: 'thinking',
      };
      set((s) => ({
        executionState: state,
        currentState: statusMap[state] ?? 'running',
        agentPhase: phaseMap[state] ?? s.agentPhase,
        agentPhaseDetail: detail !== undefined ? detail : s.agentPhaseDetail,
      }));
    },
    resetForNewTurn: () => {
      set({
        currentState: 'running',
        executionState: 'thinking',
        agentPhase: 'thinking',
        agentPhaseDetail: undefined,
        streamMessageId: null,
        activeTurnStartTime: Date.now(),
      });
    },
    setActiveTurnStartTime: (time) => set({ activeTurnStartTime: time }),

    addChatMessage: (msg) => {
      set((state) => {
        const newHistory = [...state.chatHistory, msg];
        let { sessions, activeSessionId, taskGraph, changeId } = state;

        if (!activeSessionId) {
          const newId = generateId();
          const title = msg.role === 'user' ? deriveTitle(msg.content) : 'New AI Task';
          const newSession: ChatSession = {
            id: newId,
            title,
            chatHistory: newHistory,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            taskGraph,
            changeId,
          };
          sessions = [newSession, ...sessions];
          activeSessionId = newId;
          saveSessions(sessions);
          saveActiveSessionId(newId);
          return { chatHistory: newHistory, sessions, activeSessionId };
        }

        sessions = sessions.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                chatHistory: newHistory,
                updatedAt: Date.now(),
                taskGraph: taskGraph ?? s.taskGraph,
                changeId: changeId ?? s.changeId,
                title: (s.title === 'New AI Task' || s.title === 'New Chat') && msg.role === 'user'
                  ? deriveTitle(msg.content)
                  : s.title,
              }
            : s
        );
        saveSessions(sessions);

        return { chatHistory: newHistory, sessions };
      });
    },

    appendStreamChunk: (msgId, chunk) => {
      set((state) => {
        const existing = state.chatHistory.find((m) => m.id === msgId);
        if (existing) {
          const rawCombined = (existing.content || '') + chunk;
          const { cleanContent, thoughtSummary } = parseReasoningAndContent(rawCombined);
          const updatedHistory = state.chatHistory.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  content: cleanContent,
                  thoughtSummary: thoughtSummary || m.thoughtSummary,
                }
              : m
          );
          return { chatHistory: updatedHistory, streamMessageId: msgId };
        }
        // Create new assistant message
        const { cleanContent, thoughtSummary } = parseReasoningAndContent(chunk);
        const newMsg: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: cleanContent,
          thoughtSummary,
          timestamp: Date.now(),
          activityEvents: [],
          filesChanged: [],
          terminalEvents: [],
        };
        return { chatHistory: [...state.chatHistory, newMsg], streamMessageId: msgId };
      });
    },

    setState: (newState) =>
      set((state) => ({
        currentState: newState,
        executionState: resolveExecutionState(newState, state.agentPhase),
        agentPhase: (newState === 'running' || newState === 'thinking' || newState === 'inspecting' || newState === 'editing' || newState === 'running_command' || newState === 'testing')
          ? state.agentPhase
          : 'thinking',
        agentPhaseDetail: (newState === 'running' || newState === 'thinking' || newState === 'inspecting' || newState === 'editing' || newState === 'running_command' || newState === 'testing')
          ? state.agentPhaseDetail
          : undefined,
      })),

    setSelectedModel: (model) => set({ selectedModel: model }),
    setAbortController: (controller) => set({ abortController: controller }),
    setAgentId: (id) => set({ agentId: id }),
    setTaskGraph: (graph) => set({ taskGraph: graph }),

    updateTaskNode: (taskId, updates) => {
      set((state) => {
        if (!state.taskGraph) return state;
        const currentTasks = state.taskGraph.tasks || state.taskGraph.nodes || [];
        const updatedTasks = currentTasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
        return {
          taskGraph: {
            ...state.taskGraph,
            tasks: updatedTasks,
            nodes: updatedTasks,
          },
        };
      });
    },

    recordFileChange: (file, action = 'modified', additions = 0, deletions = 0, diff) => {
      const cleanPath = file.replace(/^\/+/, '').trim();
      set((state) => {
        const prev = state.trackedChanges[cleanPath];
        const updatedInfo: FileChangeInfo = {
          file: cleanPath,
          action: action || prev?.action || 'modified',
          lines: additions || prev?.lines,
          additions: additions || prev?.additions || 0,
          deletions: deletions || prev?.deletions || 0,
          diff: diff || prev?.diff,
        };
        return {
          trackedChanges: {
            ...state.trackedChanges,
            [cleanPath]: updatedInfo,
          },
        };
      });
      fileChangeSubscribers.forEach((sub) => {
        try {
          sub(cleanPath, action, additions, deletions, diff);
        } catch {
          // ignore
        }
      });
    },

    setChangeId: (changeId) => set({ changeId }),
    setChangeSet: (cs) => set({ changeSet: cs }),

    loadChanges: async (changeId: string) => {
      try {
        const cs = await changesService.getChanges(changeId);
        set({ changeSet: cs, changeId: cs.change_id });
        if (cs.files && cs.files.length > 0) {
          for (const f of cs.files) {
            get().recordFileChange(f.path, f.status, f.additions, f.deletions, f.diff);
          }
        }
      } catch (err) {
        console.warn('[CoreMind] Failed to load changes from backend:', err);
      }
    },

    setPendingQuestion: (question) => set({ pendingQuestion: question }),
    setPendingApproval: (approval) => set({ pendingApproval: approval }),

    submitAnswer: async (answer) => {
      const { pendingQuestion } = get();
      if (!pendingQuestion) return false;
      try {
        await agentService.answerQuestion(pendingQuestion.question_id, answer);
        set({ pendingQuestion: null, currentState: 'running' });
        return true;
      } catch (err) {
        console.error('Failed to answer question:', err);
        return false;
      }
    },

    approveAction: async () => {
      const { pendingApproval, agentId } = get();
      if (!pendingApproval) return false;
      try {
        await agentService.approveAction(pendingApproval.approval_id, agentId || undefined);
        set({ pendingApproval: null });
        return true;
      } catch (err) {
        console.error('Failed to approve action:', err);
        return false;
      }
    },

    denyAction: async (reason) => {
      const { pendingApproval, agentId } = get();
      if (!pendingApproval) return false;
      try {
        await agentService.denyAction(pendingApproval.approval_id, agentId || undefined, reason);
        set({ pendingApproval: null });
        return true;
      } catch (err) {
        console.error('Failed to deny action:', err);
        return false;
      }
    },

    cancelRequest: () => {
      const { abortController, currentState, executionState, agentId } = get();
      const isBusy =
        currentState === 'running' ||
        currentState === 'waiting' ||
        executionState === 'thinking' ||
        executionState === 'inspecting' ||
        executionState === 'editing' ||
        executionState === 'running_command' ||
        executionState === 'testing' ||
        !!abortController;

      if (isBusy) {
        if (abortController) {
          abortController.abort();
        }
        if (agentId) {
          try {
            coremindWs.stop(agentId);
          } catch {}
          agentService.stop(agentId).catch(() => {});
        }
        if (window.coreMindAPI?.cancelAgentTask) {
          window.coreMindAPI.cancelAgentTask().catch(() => {});
        }
        set({
          currentState: 'stopped',
          executionState: 'cancelled',
          agentPhaseDetail: 'Task was cancelled.',
          abortController: null,
        });
        get().finalizeActiveAssistantTurn({ status: 'cancelled' });
      }
    },

    cancelTask: () => {
      get().cancelRequest();
    },

    handleWorkspaceSwitch: (_newPath?: string) => {
      const { abortController, agentId } = get();
      if (abortController) {
        try {
          abortController.abort();
        } catch {}
      }
      if (agentId) {
        try {
          coremindWs.stop(agentId);
        } catch {}
        agentService.stop(agentId).catch(() => {});
      }
      set({
        currentState: 'idle',
        executionState: 'idle',
        agentPhase: undefined,
        agentPhaseDetail: '',
        agentId: null,
        changeId: null,
        changeSet: null,
        trackedChanges: {},
        events: [],
        taskGraph: null,
        pendingQuestion: null,
        pendingApproval: null,
        draftPrompt: '',
        abortController: null,
      });
    },

    acceptAllChanges: async () => {
      const { changeId } = get();
      if (!changeId) return false;
      try {
        await changesService.acceptChanges(changeId);
        set({ changeId: null, changeSet: null, trackedChanges: {} });
        changesResetSubscribers.forEach((sub) => {
          try {
            sub();
          } catch {}
        });
        return true;
      } catch (err) {
        console.error('Failed to accept changes:', err);
        return false;
      }
    },

    rejectAllChanges: async () => {
      const { changeId } = get();
      if (!changeId) return false;
      try {
        await changesService.rejectChanges(changeId);
        set({ changeId: null, changeSet: null, trackedChanges: {} });
        changesResetSubscribers.forEach((sub) => {
          try {
            sub();
          } catch {}
        });
        const rootPath = useWorkspaceStore.getState().rootPath;
        if (rootPath) {
          await useFilesStore.getState().loadWorkspaceTree(rootPath);
        }
        return true;
      } catch (err) {
        console.error('Failed to reject changes:', err);
        return false;
      }
    },

    acceptFileChange: async (filePath) => {
      const { changeId, trackedChanges } = get();
      if (!changeId) return false;
      try {
        await changesService.acceptFile(changeId, filePath);
        const copy = { ...trackedChanges };
        delete copy[filePath];
        set({ trackedChanges: copy });
        singleFileRemovedSubscribers.forEach((sub) => {
          try {
            sub(filePath);
          } catch {}
        });
        return true;
      } catch (err) {
        console.error('Failed to accept file change:', err);
        return false;
      }
    },

    rejectFileChange: async (filePath) => {
      const { changeId, trackedChanges } = get();
      if (!changeId) return false;
      try {
        await changesService.rejectFile(changeId, filePath);
        const copy = { ...trackedChanges };
        delete copy[filePath];
        set({ trackedChanges: copy });
        singleFileRemovedSubscribers.forEach((sub) => {
          try {
            sub(filePath);
          } catch {}
        });
        return true;
      } catch (err) {
        console.error('Failed to reject file change:', err);
        return false;
      }
    },

    /**
     * Safely refreshes workspace tree and open editor buffers.
     * Protects dirty editor buffers from being overwritten without user consent!
     */
    safeRefreshEditorBuffers: async (affectedFiles, rootPath) => {
      if (!rootPath) return;

      // 1. Refresh file explorer tree
      try {
        await useFilesStore.getState().loadWorkspaceTree(rootPath);
      } catch (err) {
        console.warn('Workspace tree reload error:', err);
      }

      // 2. Safe tab reload
      const tabsState = useTabsStore.getState();
      const openTabs = tabsState.tabs;

      for (const relPath of affectedFiles) {
        const cleanPath = relPath.replace(/^\/+/, '').trim();
        const fullPath = relPath.startsWith('/') ? relPath : `${rootPath}/${cleanPath}`;

        const existingTab = openTabs.find((t) => t.filePath === fullPath || t.id === fullPath);
        if (existingTab) {
          // If the user has unsaved edits in their editor, protect their work!
          if (existingTab.isDirty) {
            console.warn(`[Safe Buffer Refresh] Skipping overwrite for dirty tab: ${existingTab.fileName}`);
            continue;
          }

          if (window.coreMindAPI?.readFile) {
            try {
              const res = await window.coreMindAPI.readFile(fullPath, rootPath);
              if (res.success && typeof res.data === 'string') {
                tabsState.updateTabContent(existingTab.id, res.data);
                useTabsStore.setState((s) => ({
                  tabs: s.tabs.map((t) =>
                    t.id === existingTab.id ? { ...t, content: res.data, savedContent: res.data } : t
                  ),
                }));
              }
            } catch (rErr) {
              console.warn('Failed to reload file into tab:', rErr);
            }
          }
        }
      }
    },

    clear: () => {
      const { abortController } = get();
      if (abortController) {
        abortController.abort();
      }
      get()._persistCurrentSession();
      set({
        events: [],
        chatHistory: [],
        currentState: 'idle',
        executionState: 'idle',
        agentPhase: 'thinking',
        agentPhaseDetail: undefined,
        abortController: null,
        activeSessionId: null,
        taskGraph: null,
        trackedChanges: {},
        changeId: null,
        changeSet: null,
        streamMessageId: null,
      });
      saveActiveSessionId(null);
    },

    // Session management
    setHistoryOpen: (open) => set({ isHistoryOpen: open }),
    toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),

    newSession: () => {
      const { abortController } = get();
      if (abortController) {
        abortController.abort();
      }
      get()._persistCurrentSession();
      set({
        events: [],
        chatHistory: [],
        currentState: 'idle',
        executionState: 'idle',
        agentPhase: 'thinking',
        agentPhaseDetail: undefined,
        abortController: null,
        activeSessionId: null,
        isHistoryOpen: false,
        taskGraph: null,
        trackedChanges: {},
        changeId: null,
        changeSet: null,
        streamMessageId: null,
      });
      saveActiveSessionId(null);
    },

    loadSession: (sessionId) => {
      const { sessions, abortController } = get();
      if (abortController) {
        abortController.abort();
      }
      get()._persistCurrentSession();

      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        set({
          chatHistory: [...session.chatHistory],
          activeSessionId: sessionId,
          events: [],
          currentState: 'idle',
          executionState: 'idle',
          abortController: null,
          isHistoryOpen: false,
          taskGraph: session.taskGraph ?? null,
          changeId: session.changeId ?? null,
          changeSet: null,
          trackedChanges: {},
          streamMessageId: null,
        });
        saveActiveSessionId(sessionId);
        if (session.changeId) {
          void get().loadChanges(session.changeId);
        }
      }
    },

    deleteSession: (sessionId) => {
      set((state) => {
        const sessions = state.sessions.filter((s) => s.id !== sessionId);
        saveSessions(sessions);

        if (state.activeSessionId === sessionId) {
          saveActiveSessionId(null);
          return {
            sessions,
            chatHistory: [],
            activeSessionId: null,
            events: [],
            currentState: 'idle' as AIRequestStatus,
            executionState: 'idle' as AgentExecutionState,
            taskGraph: null,
            changeId: null,
            changeSet: null,
            trackedChanges: {},
            streamMessageId: null,
          };
        }
        return { sessions };
      });
    },

    renameSession: (sessionId, newTitle) => {
      set((state) => {
        const sessions = state.sessions.map((s) =>
          s.id === sessionId ? { ...s, title: newTitle, updatedAt: Date.now() } : s
        );
        saveSessions(sessions);
        return { sessions };
      });
    },

    _persistCurrentSession: () => {
      const { activeSessionId, chatHistory, sessions, taskGraph, changeId } = get();
      if (activeSessionId && chatHistory.length > 0) {
        const updated = sessions.map((s) =>
          s.id === activeSessionId
            ? { ...s, chatHistory, updatedAt: Date.now(), taskGraph, changeId }
            : s
        );
        saveSessions(updated);
        set({ sessions: updated });
      }
    },

    initWsListeners: () => {
      if (wsSubscribed) return;
      wsSubscribed = true;
      coremindWs.onAny((event) => {
        get().handleCoreMindEvent(event);
      });
    },

    handleCoreMindEvent: (event: CoreMindEvent) => {
      const state = get();
      const now = Date.now();

      // Correlate event with active agent/session (supporting both agent_id and task_id)
      const eventTaskId = event.agent_id || event.task_id || (event.data as any)?.agent_id || (event.data as any)?.task_id;
      if (state.agentId && eventTaskId && eventTaskId !== state.agentId) {
        return;
      }
      const eventSessionId = event.session_id || (event.data as any)?.session_id;
      if (state.activeSessionId && eventSessionId && eventSessionId !== state.activeSessionId) {
        return;
      }

      switch (event.type) {
        case 'agent.started': {
          const effectiveAgentId = event.agent_id || event.task_id || (event.data as any)?.agent_id || (event.data as any)?.task_id || state.agentId;
          set({
            agentId: effectiveAgentId,
            currentState: 'running',
            executionState: 'thinking',
            agentPhase: 'thinking',
            agentPhaseDetail: event.data?.task || 'Starting agent task...',
          });
          get().addEvent({
            id: `evt-started-${now}`,
            type: 'AgentStartedEvent',
            task: event.data?.task,
            projectPath: event.data?.project_path,
            timestamp: now,
          });
          break;
        }

        case 'agent.planning': {
          get().setAgentPhase('planning', 'Constructing implementation plan...');
          get().addEvent({
            id: `evt-planning-${now}`,
            type: 'ThoughtEvent',
            summary: 'Constructing implementation plan and analyzing repository context...',
            durationMs: 0,
            timestamp: now,
          });
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
          set({ taskGraph: graph });
          get().setAgentPhase('working', `Executing plan (${rawNodes.length} tasks)`);
          get().addEvent({
            id: `evt-plan-${now}`,
            type: 'PlanCreatedEvent',
            goal: event.data?.goal,
            tasks: rawNodes,
            timestamp: now,
          });
          break;
        }

        case 'task.started': {
          const taskId = event.data?.task_id;
          const title = event.data?.title || taskId;
          if (taskId) {
            get().updateTaskNode(taskId, { status: 'in_progress' });
          }
          get().setAgentPhase('working', title);
          get().addEvent({
            id: `evt-task-start-${now}`,
            type: 'TaskProgressEvent',
            taskId: taskId || `task-${now}`,
            title: title || 'Subtask',
            status: 'in_progress',
            timestamp: now,
          });
          break;
        }

        case 'task.completed': {
          const taskId = event.data?.task_id;
          const title = event.data?.title || taskId;
          if (taskId) {
            get().updateTaskNode(taskId, { status: 'completed', result: event.data?.result });
          }
          get().addEvent({
            id: `evt-task-done-${now}`,
            type: 'TaskProgressEvent',
            taskId: taskId || `task-${now}`,
            title: title || 'Subtask',
            status: 'completed',
            result: event.data?.result,
            timestamp: now,
          });
          break;
        }

        case 'agent.thinking': {
          get().setAgentPhase('thinking', `Step ${event.data?.step || 1} of ${event.data?.max_steps || '...'}`);
          get().addEvent({
            id: `evt-thought-${now}`,
            type: 'ThoughtEvent',
            summary: `Reasoning step ${event.data?.step || 1}...`,
            durationMs: 0,
            step: event.data?.step,
            maxSteps: event.data?.max_steps,
            timestamp: now,
          });
          break;
        }

        case 'agent.ai.token': {
          const token = event.data?.token || '';
          if (token) {
            const streamId = get().streamMessageId;
            if (streamId) {
              get().appendStreamChunk(streamId, token);
            }
          }
          break;
        }

        case 'agent.ai.usage': {
          if (event.data) {
            set({ tokenUsage: event.data });
          }
          break;
        }

        case 'tool.started': {
          const tool = event.data?.tool || 'tool';
          const query = event.data?.args?.query || event.data?.args?.path || event.data?.args?.pattern;
          if (/search|grep|find|read|scan|list/i.test(tool)) {
            get().setAgentPhase('inspecting', query ? `${tool}: ${query}` : tool);
            if (/read|view/i.test(tool) && event.data?.args?.path) {
              get().addEvent({
                id: `evt-read-${now}`,
                type: 'FileReadEvent',
                file: event.data.args.path,
                startLine: event.data.args.StartLine || event.data.args.startLine,
                endLine: event.data.args.EndLine || event.data.args.endLine,
                timestamp: now,
              });
            }
          } else {
            get().setAgentPhase('working', `Tool: ${tool}`);
          }
          get().addEvent({
            id: `evt-tool-${now}`,
            type: 'ToolCallEvent',
            tool,
            args: event.data?.args || {},
            timestamp: now,
          });
          break;
        }

        case 'tool.completed': {
          get().addEvent({
            id: `evt-tool-done-${now}`,
            type: 'ToolCallEvent',
            tool: event.data?.tool || 'tool',
            args: {},
            result: event.data?.result,
            success: event.data?.success !== false,
            timestamp: now,
          });
          break;
        }

        case 'file.read': {
          const path = event.data?.path || '';
          get().setAgentPhase('inspecting', `Reading ${path.split('/').pop() || path}`);
          get().addEvent({
            id: `evt-read-${now}`,
            type: 'FileReadEvent',
            file: path,
            timestamp: now,
          });
          break;
        }

        case 'file.created':
        case 'file.changed':
        case 'file.deleted': {
          const path = event.data?.path || event.data?.file || '';
          const action = event.type === 'file.created' ? 'created' : event.type === 'file.deleted' ? 'deleted' : 'modified';
          if (path) {
            get().recordFileChange(path, action, event.data?.additions || event.data?.lines, event.data?.deletions);
            const rootPath = useWorkspaceStore.getState().rootPath;
            if (rootPath) {
              void get().safeRefreshEditorBuffers([path], rootPath);
            }
          }
          get().setAgentPhase('editing', `${action === 'created' ? 'Created' : 'Updated'} ${path.split('/').pop() || path}`);
          get().addEvent({
            id: `evt-file-${now}`,
            type: 'FileChangedEvent',
            file: path,
            action,
            lines: event.data?.lines,
            additions: event.data?.additions,
            deletions: event.data?.deletions,
            timestamp: now,
          });
          break;
        }

        case 'diff.created': {
          const path = event.data?.path || '';
          if (path) {
            get().recordFileChange(path, 'modified', event.data?.additions, event.data?.deletions, event.data?.diff);
          }
          get().addEvent({
            id: `evt-diff-${now}`,
            type: 'DiffCreatedEvent',
            path,
            diff: event.data?.diff,
            additions: event.data?.additions || 0,
            deletions: event.data?.deletions || 0,
            timestamp: now,
          });
          break;
        }

        case 'command.started': {
          get().setAgentPhase('running_command', `$ ${event.data?.command || 'shell'}`);
          get().addEvent({
            id: `evt-cmd-${now}`,
            type: 'TerminalEvent',
            command: event.data?.command || '',
            output: '',
            status: 'running',
            timestamp: now,
          });
          break;
        }

        case 'command.output': {
          const out = event.data?.output || '';
          const currentEvents = get().events;
          const lastCmd = [...currentEvents].reverse().find((e) => e.type === 'TerminalEvent') as TerminalEvent | undefined;
          if (lastCmd) {
            get().updateEvent(lastCmd.id, { output: (lastCmd.output || '') + out });
          }
          break;
        }

        case 'command.completed': {
          const currentEvents = get().events;
          const lastCmd = [...currentEvents].reverse().find((e) => e.type === 'TerminalEvent') as TerminalEvent | undefined;
          if (lastCmd) {
            get().updateEvent(lastCmd.id, {
              status: event.data?.exit_code === 0 ? 'completed' : 'failed',
              exitCode: event.data?.exit_code,
              durationMs: event.data?.duration_ms,
            });
          }
          break;
        }

        case 'verification.started': {
          get().setAgentPhase('verifying', `Verification attempt ${event.data?.attempt || 1}...`);
          get().addEvent({
            id: `evt-verify-${now}`,
            type: 'TestEvent',
            testName: `Verification (Attempt ${event.data?.attempt || 1})`,
            status: 'running',
            attempt: event.data?.attempt,
            timestamp: now,
          });
          break;
        }

        case 'verification.passed': {
          get().addEvent({
            id: `evt-verify-pass-${now}`,
            type: 'TestEvent',
            testName: 'Verification Checks',
            status: 'passed',
            command: event.data?.command,
            timestamp: now,
          });
          break;
        }

        case 'verification.failed': {
          get().setAgentPhase('working', 'Self-healing / fixing test issues...');
          get().addEvent({
            id: `evt-verify-fail-${now}`,
            type: 'TestEvent',
            testName: 'Verification Failure',
            status: 'failed',
            error: event.data?.error || `Command exited with code ${event.data?.exit_code}`,
            exitCode: event.data?.exit_code,
            timestamp: now,
          });
          break;
        }

        case 'agent.waiting_for_user': {
          set({
            currentState: 'waiting',
            pendingQuestion: {
              question_id: event.data?.question_id,
              question: event.data?.question,
              options: event.data?.options,
            },
          });
          get().addEvent({
            id: `evt-q-${now}`,
            type: 'QuestionEvent',
            questionId: event.data?.question_id,
            question: event.data?.question,
            options: event.data?.options,
            timestamp: now,
          });
          break;
        }

        case 'agent.approval.required': {
          set({
            currentState: 'waiting',
            pendingApproval: {
              approval_id: event.data?.approval_id,
              tool: event.data?.tool,
              args: event.data?.args || {},
              description: event.data?.description || `Approve tool: ${event.data?.tool}`,
            },
          });
          get().addEvent({
            id: `evt-appr-${now}`,
            type: 'ApprovalEvent',
            approvalId: event.data?.approval_id,
            tool: event.data?.tool,
            args: event.data?.args || {},
            description: event.data?.description || '',
            timestamp: now,
          });
          break;
        }

        case 'agent.approval.granted':
        case 'agent.approval.denied': {
          set({ pendingApproval: null, currentState: 'running' });
          break;
        }

        case 'agent.completed': {
          set({
            currentState: 'completed',
            executionState: 'completed',
            agentPhaseDetail: 'Task completed.',
          });
          if (event.data?.change_id) {
            void get().loadChanges(event.data.change_id);
          }
          if (event.data?.task_graph) {
            set({ taskGraph: event.data.task_graph });
          }
          const rootPath = useWorkspaceStore.getState().rootPath;
          if (Array.isArray(event.data?.files_changed) && rootPath) {
            void get().safeRefreshEditorBuffers(event.data.files_changed, rootPath);
          }
          get().addEvent({
            id: `evt-complete-${now}`,
            type: 'CompletedEvent',
            summary: `Agent completed execution in ${event.data?.steps || 0} steps.`,
            filesChanged: event.data?.files_changed || [],
            tests: [],
            changeId: event.data?.change_id,
            timestamp: now,
          });

          get().finalizeActiveAssistantTurn({
            steps: event.data?.steps || 1,
            filesChanged: event.data?.files_changed || [],
            status: 'completed',
            response: event.data?.response || event.data?.summary,
          });
          break;
        }

        case 'agent.failed':
        case 'agent.error': {
          const errMsg = event.data?.error || 'Agent encountered an error.';
          set({
            currentState: 'error',
            executionState: 'failed',
            agentPhaseDetail: errMsg,
          });
          get().addEvent({
            id: `evt-err-${now}`,
            type: 'ErrorEvent',
            error: errMsg,
            timestamp: now,
          });
          get().finalizeActiveAssistantTurn({
            status: 'failed',
            error: errMsg,
          });
          break;
        }

        case 'agent.stopped': {
          set({
            currentState: 'stopped',
            executionState: 'cancelled',
            agentPhaseDetail: 'Task was cancelled.',
            abortController: null,
          });
          get().finalizeActiveAssistantTurn({
            status: 'cancelled',
          });
          break;
        }
      }
    },

    finalizeActiveAssistantTurn: (params) => {
      const store = get();
      const streamId = store.streamMessageId;
      const startTime = store.activeTurnStartTime || 0;
      const turnEvents = store.events.filter(
        (e) => (startTime ? e.timestamp >= startTime - 2000 : true)
      );
      const turnTermEvents = turnEvents.filter(
        (e): e is TerminalEvent => e.type === 'TerminalEvent'
      );
      const realtimeFiles: FileChangeInfo[] = Object.values(store.trackedChanges);

      const tests = turnEvents.filter((e) => e.type === 'TestEvent');
      const hasVerifications = tests.length > 0;
      const verificationPassed = hasVerifications && !tests.some((t: any) => t.status === 'failed');

      set((s) => {
        const updatedHistory = s.chatHistory.map((m) => {
          if (streamId && m.id === streamId) {
            let content = m.content.trim();
            if (!content) {
              if (params.response && params.response.trim()) {
                content = params.response.trim();
              } else if (params.status === 'completed') {
                content = formatTaskCompletedSummary(
                  params.steps || 1,
                  params.filesChanged || [],
                  s.trackedChanges,
                  hasVerifications,
                  verificationPassed
                );
              } else if (params.status === 'failed') {
                content = `### Agent Task Failed\n\n${params.error || 'Execution encountered an error.'}`;
              } else if (params.status === 'cancelled') {
                content = '### Execution Stopped\n\nThe active operation was cancelled by the user.';
              }
            }
            return {
              ...m,
              content,
              filesChanged: realtimeFiles.length > 0 ? realtimeFiles : (m.filesChanged || []),
              terminalEvents: turnTermEvents.length > 0 ? turnTermEvents : (m.terminalEvents || []),
              activityEvents: turnEvents.length > 0 ? turnEvents : (m.activityEvents || []),
            };
          }
          return m;
        });
        return {
          chatHistory: updatedHistory,
          streamMessageId: null,
        };
      });
      get()._persistCurrentSession();
    },

    submitPrompt: async (prompt: string): Promise<boolean> => {
      const store = get();
      const trimmed = prompt.trim();
      const isBusy =
        store.currentState === 'running' ||
        store.currentState === 'waiting' ||
        store.executionState === 'thinking' ||
        store.executionState === 'inspecting' ||
        store.executionState === 'editing' ||
        store.executionState === 'running_command' ||
        store.executionState === 'testing';

      if (!trimmed || isBusy) return false;

      const isAgent = get().agentMode === 'agent';
      const rootPath = useWorkspaceStore.getState().rootPath;
      if (isAgent && !rootPath) {
        alert('Please open a workspace folder before executing AI Agent coding tasks.');
        return false;
      }
      const effectivePath = rootPath || '.';

      // Ensure WebSocket listeners are initialized
      get().initWsListeners();
      coremindWs.connect();

      const abortController = new AbortController();
      set({ abortController, agentId: null });
      get().resetForNewTurn();
      get().setExecutionState('thinking', isAgent ? 'Analyzing instructions and repository context...' : 'Thinking...');

      // 1. Add user message
      const userMsgId = `user-${Date.now()}`;
      get().addChatMessage({
        id: userMsgId,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      });

      // 2. Add placeholder assistant message
      const assistantMsgId = `asst-${Date.now()}`;
      get().addChatMessage({
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        activityEvents: [],
        filesChanged: [],
        terminalEvents: [],
      });
      set({ streamMessageId: assistantMsgId });

      const activeSessionId = get().activeSessionId;

      if (isAgent) {
        try {
          get().setExecutionState('thinking', 'Starting autonomous agent on CoreMind backend...');
          const cleanTask = trimmed.replace(/^\/(?:agent|autonomous|plan)\s+/, '');
          const runRes = await agentService.run(cleanTask, effectivePath, activeSessionId || undefined);

          if (abortController.signal.aborted) {
            get().setExecutionState('cancelled', 'Task was cancelled.');
            return false;
          }

          if (runRes?.agent_id) {
            set({ agentId: runRes.agent_id });
          }

          // If backend friendly chat returned direct completion response in HTTP payload
          if (runRes?.response) {
            set((s) => ({
              currentState: 'completed',
              executionState: 'completed',
              agentPhaseDetail: 'Task completed.',
              chatHistory: s.chatHistory.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: runRes.response! }
                  : m
              ),
              streamMessageId: null,
            }));
            get()._persistCurrentSession();
            return true;
          }

          return true;
        } catch (err: any) {
          if (abortController.signal.aborted) {
            get().setExecutionState('cancelled', 'Task was cancelled.');
            return false;
          }
          const errMsg = err?.message || 'Failed to start AI Agent on backend.';
          get().setExecutionState('failed', errMsg);
          set((s) => ({
            chatHistory: s.chatHistory.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: `### Agent Error\n\nFailed to start task on CoreMind backend: ${errMsg}\n\nPlease ensure the backend service is running and accessible.`,
                  }
                : m
            ),
            abortController: null,
          }));
          return false;
        }
      } else {
        // Direct chat streaming (Friendly Chat)
        try {
          get().setExecutionState('thinking', 'Streaming assistant response...');
          // Exclude assistantMsgId AND the newly added userMsgId so query isn't duplicated
          const history = get().chatHistory
            .filter((m) => m.id !== assistantMsgId && m.id !== userMsgId)
            .map((m) => ({ role: m.role, content: m.content }));

          let accumulated = '';
          await coremindClient.streamChat(
            trimmed,
            effectivePath,
            history,
            (token) => {
              accumulated += token;
              const { cleanContent, thoughtSummary } = parseReasoningAndContent(accumulated);
              set((s) => ({
                chatHistory: s.chatHistory.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: cleanContent, thoughtSummary }
                    : m
                ),
              }));
            },
            abortController.signal
          );

          if (abortController.signal.aborted) {
            get().setExecutionState('cancelled', 'Chat request was cancelled.');
            return false;
          }

          get().setExecutionState('completed', 'Response completed.');
          get()._persistCurrentSession();
          return true;
        } catch (err: any) {
          if (abortController.signal.aborted) {
            get().setExecutionState('cancelled', 'Chat request was cancelled.');
            return false;
          }
          const errMsg = err?.message || 'Failed to stream chat response.';
          get().setExecutionState('failed', errMsg);
          set((s) => ({
            chatHistory: s.chatHistory.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `**Chat Error:** ${errMsg}\n\nPlease check backend connection or retry.` }
                : m
            ),
            abortController: null,
          }));
          return false;
        }
      }
    }
};
});

