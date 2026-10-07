import { create } from 'zustand';
import { useUiStore } from './uiStore';

export interface TerminalTabItem {
  id: string;
  title: string;
}

interface TerminalStore {
  tabs: TerminalTabItem[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  addTab: () => string;
  closeTab: (id: string) => void;
  resetTabs: () => void;
  runCommand: (command: string) => Promise<void>;
}

let sessionCounter = 0;

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  tabs: [],
  activeId: null,

  setActiveId: (id) => set({ activeId: id }),

  addTab: () => {
    sessionCounter += 1;
    const id = `pty-${Date.now()}-${sessionCounter}`;
    set((state) => ({
      tabs: [...state.tabs, { id, title: `Terminal ${sessionCounter}` }],
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

  resetTabs: () => set({ tabs: [], activeId: null }),

  runCommand: async (command: string) => {
    const ui = useUiStore.getState();
    // 1. Ensure terminal panel is visible
    if (!ui.isTerminalOpen) {
      ui.toggleTerminal();
    }

    // 2. Ensure an active terminal tab exists
    let targetId = get().activeId;
    if (!targetId || get().tabs.length === 0) {
      targetId = get().addTab();
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
