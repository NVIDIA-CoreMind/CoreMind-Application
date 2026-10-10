import { create } from 'zustand';
import { useUiStore } from './uiStore';

export interface TerminalTabItem {
  id: string;
  title: string;
  shell?: string;
  hasWarning?: boolean;
}

export type TopPanelTab = 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'postgres';

interface TerminalStore {
  tabs: TerminalTabItem[];
  activeId: string | null;
  activeTopTab: TopPanelTab;
  setActiveTopTab: (tab: TopPanelTab) => void;
  setActiveId: (id: string | null) => void;
  addTab: (title?: string, shell?: string, hasWarning?: boolean) => string;
  closeTab: (id: string) => void;
  setTabWarning: (id: string, warning: boolean) => void;
  renameTab: (id: string, title: string) => void;
  resetTabs: () => void;
  runCommand: (command: string) => Promise<void>;
}

let sessionCounter = 0;

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  tabs: [],
  activeId: null,
  activeTopTab: 'terminal',

  setActiveTopTab: (tab) => set({ activeTopTab: tab }),

  setActiveId: (id) => set({ activeId: id }),

  addTab: (title?: string, shell?: string, hasWarning?: boolean) => {
    sessionCounter += 1;
    const id = `pty-${Date.now()}-${sessionCounter}`;
    const defaultTitle = title || 'zsh';
    set((state) => ({
      tabs: [...state.tabs, { id, title: defaultTitle, shell, hasWarning }],
      activeId: id,
    }));
    return id;
  },

  closeTab: (id) => {
    set((state) => {
      const next = state.tabs.filter((x) => x.id !== id);
      const nextActiveId =
        state.activeId === id ? (next[next.length - 1]?.id ?? null) : state.activeId;
      return { tabs: next, activeId: nextActiveId };
    });
  },

  setTabWarning: (id, warning) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, hasWarning: warning } : t)),
    }));
  },

  renameTab: (id, newTitle) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, title: newTitle.trim() || t.title } : t)),
    }));
  },

  resetTabs: () => set({ tabs: [], activeId: null }),

  runCommand: async (command: string) => {
    const ui = useUiStore.getState();
    // 1. Ensure terminal panel is visible
    if (!ui.isTerminalOpen) {
      ui.toggleTerminal();
    }

    // Ensure Terminal tab is active in top bar
    set({ activeTopTab: 'terminal' });

    // 2. Ensure an active terminal tab exists
    let targetId = get().activeId;
    if (!targetId || get().tabs.length === 0) {
      targetId = get().addTab('zsh');
      // Allow slight delay for PTY session initialization in main process
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // 3. Write command with newline to execute in the terminal
    const api = window.coreMindAPI;
    if (api && targetId) {
      await api.terminalWrite(targetId, `${command}\n`);
    }
  },
}));
