import { create } from 'zustand';
import {
  AgentMessage,
  AgentContext,
  AgentStatus,
} from '@shared/types/ipc';
import { useWorkspaceStore } from './workspaceStore';
import { useTabsStore } from './tabsStore';

export interface AgentSession {
  id: string;
  title: string;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY_SESSIONS = 'coremind:agent-sessions';
const STORAGE_KEY_MODEL = 'coremind:agent-model';

function getInitialSessions(): AgentSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }

  const now = Date.now();
  return [
    {
      id: 'session-seed-1',
      title: 'CoreMind Minimal IDE Redesign',
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: 'CoreMind Minimal IDE Redesign',
          timestamp: now - 6 * 60 * 1000,
        },
        {
          id: 'm2',
          role: 'assistant',
          content: 'I have analyzed the IDE layout and refined the workspace panels to create a sleek, distraction-free editing experience.',
          timestamp: now - 6 * 60 * 1000 + 2000,
        },
      ],
      createdAt: now - 6 * 60 * 1000,
      updatedAt: now - 6 * 60 * 1000,
    },
    {
      id: 'session-seed-2',
      title: 'Logo Icon Formatting Request',
      messages: [
        {
          id: 'm3',
          role: 'user',
          content: 'Format the logo icons for macOS and desktop application packages.',
          timestamp: now - 27 * 60 * 1000,
        },
        {
          id: 'm4',
          role: 'assistant',
          content: 'The icons have been formatted into .icns and high-resolution PNG assets for the build pipeline.',
          timestamp: now - 27 * 60 * 1000 + 2000,
        },
      ],
      createdAt: now - 27 * 60 * 1000,
      updatedAt: now - 27 * 60 * 1000,
    },
    {
      id: 'session-seed-3',
      title: 'Add Desktop Application Icon',
      messages: [
        {
          id: 'm5',
          role: 'user',
          content: 'Add desktop application icon configuration to electron-builder.',
          timestamp: now - 43 * 60 * 1000,
        },
        {
          id: 'm6',
          role: 'assistant',
          content: 'Updated electron-builder and macOS window configuration to use the new application icon.',
          timestamp: now - 43 * 60 * 1000 + 2000,
        },
      ],
      createdAt: now - 43 * 60 * 1000,
      updatedAt: now - 43 * 60 * 1000,
    },
  ];
}

function saveSessions(sessions: AgentSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch {
    // Ignore error
  }
}

interface AgentStore {
  sessions: AgentSession[];
  currentSessionId: string | null;
  messages: AgentMessage[];
  isLoading: boolean;
  status: AgentStatus | null;
  error: string | null;
  selectedModel: string;
  availableModels: string[];

  fetchStatus: () => Promise<void>;
  sendMessage: (prompt: string) => Promise<boolean>;
  clearMessages: () => void;
  newSession: () => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  setSelectedModel: (model: string) => void;
  buildCurrentContext: () => AgentContext;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  sessions: getInitialSessions(),
  currentSessionId: null,
  messages: [],
  isLoading: false,
  status: null,
  error: null,
  selectedModel: localStorage.getItem(STORAGE_KEY_MODEL) || 'Gemini 3.8 Flash Medium',
  availableModels: [
    'Gemini 3.8 Flash Medium',
    'Gemini 1.5 Pro',
    'Gemini 1.5 Flash',
    'Claude 3.5 Sonnet',
    'GPT-4o',
    'Llama 3.1 70B',
  ],

  setSelectedModel: (model: string) => {
    localStorage.setItem(STORAGE_KEY_MODEL, model);
    set({ selectedModel: model });
  },

  fetchStatus: async () => {
    try {
      if (!window.coreMindAPI?.getAgentStatus) return;
      const res = await window.coreMindAPI.getAgentStatus();
      if (res.success) {
        set({ status: res.data });
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Failed to fetch agent status', error);
    }
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
    });
  },

  loadSession: (sessionId: string) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (session) {
      set({
        currentSessionId: session.id,
        messages: session.messages,
        error: null,
      });
    }
  },

  deleteSession: (sessionId: string) => {
    const remaining = get().sessions.filter((s) => s.id !== sessionId);
    saveSessions(remaining);
    if (get().currentSessionId === sessionId) {
      set({
        sessions: remaining,
        currentSessionId: null,
        messages: [],
      });
    } else {
      set({ sessions: remaining });
    }
  },

  sendMessage: async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return false;

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    let sessionId = get().currentSessionId;
    let sessions = [...get().sessions];

    if (!sessionId) {
      // Create new session
      const title = trimmed.length > 36 ? trimmed.slice(0, 36) + '...' : trimmed;
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
    });

    const context = get().buildCurrentContext();

    try {
      if (!window.coreMindAPI?.sendAgentMessage) {
        throw new Error('CoreMind Agent API is not available.');
      }

      const res = await window.coreMindAPI.sendAgentMessage(currentMessages, context);

      if (res.success && res.data) {
        const updatedMessages = [...currentMessages, res.data.message];
        set({
          messages: updatedMessages,
          isLoading: false,
        });

        // Update session in list
        const updatedSessions = get().sessions.map((s) =>
          s.id === sessionId
            ? { ...s, messages: updatedMessages, updatedAt: Date.now() }
            : s
        );
        set({ sessions: updatedSessions });
        saveSessions(updatedSessions);
        return true;
      } else {
        const errorMsg = !res.success ? res.error.message : 'Unknown agent error';
        const errorResponse: AgentMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Agent Request Failed: ${errorMsg}`,
          timestamp: Date.now(),
        };
        const updatedMessages = [...currentMessages, errorResponse];
        set({
          messages: updatedMessages,
          isLoading: false,
          error: errorMsg,
        });
        return false;
      }
    } catch (err: unknown) {
      const error = err as Error;
      const errorResponse: AgentMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      };
      const updatedMessages = [...currentMessages, errorResponse];
      set({
        messages: updatedMessages,
        isLoading: false,
        error: error.message,
      });
      return false;
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));
