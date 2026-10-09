import { create } from 'zustand';
import {
  AIWorkspaceEvent,
  AIRequestStatus,
  TaskGraph,
  TaskNode,
} from '../types/aiWorkspace';
import { agentService } from './coremind/agent';
import { changesService } from './coremind/changes';
import { useTabsStore } from '../stores/tabsStore';
import { useFilesStore } from '../stores/filesStore';

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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
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
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save chat sessions to localStorage:', e);
  }
}

function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

function saveActiveSessionId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
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

export type AgentPhase = 'thinking' | 'searching' | 'working' | 'planning' | 'verifying';
export type WorkspaceViewTab = 'chat' | 'plan' | 'activity' | 'changes';
export type AgentOperationMode = 'agent' | 'chat';

interface AIWorkspaceStore {
  events: AIWorkspaceEvent[];
  chatHistory: ChatMessage[];
  currentState: AIRequestStatus;
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

  // Session management
  sessions: ChatSession[];
  activeSessionId: string | null;
  isHistoryOpen: boolean;
  draftPrompt: string;

  // State setters
  setAgentMode: (mode: AgentOperationMode) => void;
  setActiveView: (view: WorkspaceViewTab) => void;
  addEvent: (event: AIWorkspaceEvent) => void;
  updateEvent: (id: string, updates: Partial<AIWorkspaceEvent>) => void;
  setDraftPrompt: (prompt: string) => void;
  setAgentPhase: (phase: AgentPhase, detail?: string) => void;
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
  setPendingQuestion: (question: { question_id: string; question: string; options?: string[] } | null) => void;
  setPendingApproval: (approval: { approval_id: string; tool: string; args: Record<string, any>; description: string } | null) => void;

  // Agent Actions
  submitAnswer: (answer: string) => Promise<boolean>;
  approveAction: () => Promise<boolean>;
  denyAction: (reason?: string) => Promise<boolean>;
  cancelRequest: () => void;
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

export const useAIWorkspaceStore = create<AIWorkspaceStore>((set, get) => {
  const savedSessions = loadSessions();
  const savedActiveId = loadActiveSessionId();
  const activeSession = savedSessions.find((s) => s.id === savedActiveId);

  return {
    events: [],
    chatHistory: activeSession?.chatHistory ?? [],
    currentState: 'idle',
    agentPhase: 'thinking',
    agentPhaseDetail: undefined,
    selectedModel: 'Nemotron-3-Ultra',
    agentMode: 'agent',
    activeView: 'chat',
    abortController: null,

    agentId: null,
    taskGraph: activeSession?.taskGraph ?? null,
    trackedChanges: {},
    changeId: activeSession?.changeId ?? null,
    pendingQuestion: null,
    pendingApproval: null,
    streamMessageId: null,

    sessions: savedSessions,
    activeSessionId: activeSession ? activeSession.id : null,
    isHistoryOpen: false,
    draftPrompt: '',

    setAgentMode: (mode) => set({ agentMode: mode }),
    setActiveView: (view) => set({ activeView: view }),
    addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
    updateEvent: (id, updates) =>
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? ({ ...e, ...updates } as AIWorkspaceEvent) : e)),
      })),

    setDraftPrompt: (prompt) => set({ draftPrompt: prompt }),
    setAgentPhase: (phase, detail) => set({ agentPhase: phase, agentPhaseDetail: detail }),

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
          const updatedHistory = state.chatHistory.map((m) =>
            m.id === msgId ? { ...m, content: m.content + chunk } : m
          );
          return { chatHistory: updatedHistory, streamMessageId: msgId };
        }
        // Create new assistant message
        const newMsg: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: chunk,
          timestamp: Date.now(),
        };
        return { chatHistory: [...state.chatHistory, newMsg], streamMessageId: msgId };
      });
    },

    setState: (newState) =>
      set((state) => ({
        currentState: newState,
        agentPhase: newState === 'running' ? state.agentPhase : 'thinking',
        agentPhaseDetail: newState === 'running' ? state.agentPhaseDetail : undefined,
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
    },

    setChangeId: (changeId) => set({ changeId }),
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
      const { abortController, currentState, agentId } = get();
      if (currentState === 'running' || currentState === 'waiting') {
        if (abortController) {
          abortController.abort();
        }
        if (agentId) {
          agentService.stop(agentId).catch(() => {});
        }
        if (window.coreMindAPI?.cancelAgentTask) {
          window.coreMindAPI.cancelAgentTask().catch(() => {});
        }
        set({ currentState: 'stopped', abortController: null });
      }
    },

    acceptAllChanges: async () => {
      const { changeId } = get();
      if (!changeId) return false;
      try {
        await changesService.acceptChanges(changeId);
        set({ changeId: null, trackedChanges: {} });
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
        set({ changeId: null, trackedChanges: {} });
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
        abortController: null,
        activeSessionId: null,
        taskGraph: null,
        trackedChanges: {},
        changeId: null,
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
        abortController: null,
        activeSessionId: null,
        isHistoryOpen: false,
        taskGraph: null,
        trackedChanges: {},
        changeId: null,
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
          abortController: null,
          isHistoryOpen: false,
          taskGraph: session.taskGraph ?? null,
          changeId: session.changeId ?? null,
          trackedChanges: {},
          streamMessageId: null,
        });
        saveActiveSessionId(sessionId);
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
            taskGraph: null,
            changeId: null,
            trackedChanges: {},
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
  };
});
