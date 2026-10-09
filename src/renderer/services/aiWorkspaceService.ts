import { create } from 'zustand';
import { AIWorkspaceEvent, AIRequestStatus } from '../types/aiWorkspace';

export interface FileChangeInfo {
  file: string;
  action?: 'created' | 'modified' | 'deleted';
  lines?: number;
  additions?: number;
  deletions?: number;
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
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 47) + '...';
}

interface AIWorkspaceStore {
  events: AIWorkspaceEvent[];
  chatHistory: ChatMessage[];
  currentState: AIRequestStatus;
  selectedModel: string;
  abortController: AbortController | null;

  // Session management
  sessions: ChatSession[];
  activeSessionId: string | null;
  isHistoryOpen: boolean;
  draftPrompt: string;

  addEvent: (event: AIWorkspaceEvent) => void;
  setDraftPrompt: (prompt: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  updateEvent: (id: string, updates: Partial<AIWorkspaceEvent>) => void;
  setState: (state: AIRequestStatus) => void;
  setSelectedModel: (model: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  clear: () => void;
  submitAnswer: (answer: string) => void;
  cancelRequest: () => void;

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
  // Initialize from localStorage
  const savedSessions = loadSessions();
  const savedActiveId = loadActiveSessionId();
  const activeSession = savedSessions.find(s => s.id === savedActiveId);

  return {
    events: [],
    chatHistory: activeSession?.chatHistory ?? [],
    currentState: 'idle',
    selectedModel: 'Nemotron-3-Ultra',
    abortController: null,

    sessions: savedSessions,
    activeSessionId: activeSession ? activeSession.id : null,
    isHistoryOpen: false,
    draftPrompt: '',

    addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
    setDraftPrompt: (prompt) => set({ draftPrompt: prompt }),

    addChatMessage: (msg) => {
      set((state) => {
        const newHistory = [...state.chatHistory, msg];
        let { sessions, activeSessionId } = state;

        // If no active session, create one
        if (!activeSessionId) {
          const newId = generateId();
          const title = msg.role === 'user' ? deriveTitle(msg.content) : 'New Chat';
          const newSession: ChatSession = {
            id: newId,
            title,
            chatHistory: newHistory,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          sessions = [newSession, ...sessions];
          activeSessionId = newId;
          saveSessions(sessions);
          saveActiveSessionId(newId);
          return { chatHistory: newHistory, sessions, activeSessionId };
        }

        // Update existing session
        sessions = sessions.map(s =>
          s.id === activeSessionId
            ? {
                ...s,
                chatHistory: newHistory,
                updatedAt: Date.now(),
                // Update title if it's the first user message and session title is default
                title: s.title === 'New Chat' && msg.role === 'user' ? deriveTitle(msg.content) : s.title,
              }
            : s
        );
        saveSessions(sessions);

        return { chatHistory: newHistory, sessions };
      });
    },

    updateEvent: (id, updates) =>
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? { ...e, ...updates } as AIWorkspaceEvent : e)),
      })),

    setState: (newState) => set({ currentState: newState }),

    setSelectedModel: (model) => set({ selectedModel: model }),

    setAbortController: (controller) => set({ abortController: controller }),

    clear: () => {
      const { abortController } = get();
      if (abortController) {
        abortController.abort();
      }
      // Persist any current session before clearing
      get()._persistCurrentSession();
      set({ events: [], chatHistory: [], currentState: 'idle', abortController: null, activeSessionId: null });
      saveActiveSessionId(null);
    },

    submitAnswer: (answer) => {
      const state = get();
      if (state.currentState === 'waiting') {
        state.setState('running');
        console.log('Submitted answer:', answer);
      }
    },

    cancelRequest: () => {
      const { abortController, currentState } = get();
      if (currentState === 'running' || currentState === 'waiting') {
        if (abortController) {
          abortController.abort();
        }
        if (window.coreMindAPI?.cancelAgentTask) {
          window.coreMindAPI.cancelAgentTask().catch(() => {});
        }
        set({ currentState: 'stopped', abortController: null });
      }
    },

    // Session management
    setHistoryOpen: (open) => set({ isHistoryOpen: open }),
    toggleHistory: () => set((state) => ({ isHistoryOpen: !state.isHistoryOpen })),

    newSession: () => {
      const { abortController } = get();
      if (abortController) {
        abortController.abort();
      }
      // Persist current before starting new
      get()._persistCurrentSession();
      set({
        events: [],
        chatHistory: [],
        currentState: 'idle',
        abortController: null,
        activeSessionId: null,
        isHistoryOpen: false,
      });
      saveActiveSessionId(null);
    },

    loadSession: (sessionId) => {
      const { sessions, abortController } = get();
      if (abortController) {
        abortController.abort();
      }
      // Persist current session first
      get()._persistCurrentSession();

      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        set({
          chatHistory: [...session.chatHistory],
          activeSessionId: sessionId,
          events: [],
          currentState: 'idle',
          abortController: null,
          isHistoryOpen: false,
        });
        saveActiveSessionId(sessionId);
      }
    },

    deleteSession: (sessionId) => {
      set((state) => {
        const sessions = state.sessions.filter(s => s.id !== sessionId);
        saveSessions(sessions);

        // If deleting the active session, clear it
        if (state.activeSessionId === sessionId) {
          saveActiveSessionId(null);
          return {
            sessions,
            chatHistory: [],
            activeSessionId: null,
            events: [],
            currentState: 'idle' as AIRequestStatus,
          };
        }
        return { sessions };
      });
    },

    renameSession: (sessionId, newTitle) => {
      set((state) => {
        const sessions = state.sessions.map(s =>
          s.id === sessionId ? { ...s, title: newTitle, updatedAt: Date.now() } : s
        );
        saveSessions(sessions);
        return { sessions };
      });
    },

    _persistCurrentSession: () => {
      const { activeSessionId, chatHistory, sessions } = get();
      if (activeSessionId && chatHistory.length > 0) {
        const updated = sessions.map(s =>
          s.id === activeSessionId
            ? { ...s, chatHistory, updatedAt: Date.now() }
            : s
        );
        saveSessions(updated);
        set({ sessions: updated });
      }
    },
  };
});
