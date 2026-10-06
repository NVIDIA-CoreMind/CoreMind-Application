import { create } from 'zustand';
import { UI_DIMENSIONS } from '@shared/constants';

export type SidebarTab = 'explorer' | 'search' | 'git' | 'debug' | 'extensions' | 'settings';

interface UiStore {
  activeSidebarTab: SidebarTab;
  isSidebarOpen: boolean;
  sidebarWidth: number;

  isRightPanelOpen: boolean;
  rightPanelWidth: number;

  isTerminalOpen: boolean;
  terminalHeight: number;

  isCommandPaletteOpen: boolean;
  isQuickOpenOpen: boolean;
  isGlobalPromptOpen: boolean;

  setActiveSidebarTab: (tab: SidebarTab) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;

  toggleRightPanel: () => void;
  setRightPanelWidth: (width: number) => void;

  toggleTerminal: () => void;
  setTerminalHeight: (height: number) => void;

  setCommandPaletteOpen: (open: boolean) => void;
  setQuickOpenOpen: (open: boolean) => void;
  setGlobalPromptOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeSidebarTab: 'explorer',
  isSidebarOpen: true,
  sidebarWidth: UI_DIMENSIONS.DEFAULT_SIDEBAR_WIDTH,

  isRightPanelOpen: true,
  rightPanelWidth: UI_DIMENSIONS.DEFAULT_RIGHT_PANEL_WIDTH,

  isTerminalOpen: true,
  terminalHeight: UI_DIMENSIONS.DEFAULT_TERMINAL_HEIGHT,

  isCommandPaletteOpen: false,
  isQuickOpenOpen: false,
  isGlobalPromptOpen: false,

  setActiveSidebarTab: (tab) => {
    set((state) => {
      // If clicking already active tab, toggle sidebar
      if (state.activeSidebarTab === tab && state.isSidebarOpen) {
        return { isSidebarOpen: false };
      }
      return { activeSidebarTab: tab, isSidebarOpen: true };
    });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
    if (typeof window !== 'undefined') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  },

  setSidebarWidth: (width) => {
    const clamped = Math.max(
      UI_DIMENSIONS.MIN_SIDEBAR_WIDTH,
      Math.min(UI_DIMENSIONS.MAX_SIDEBAR_WIDTH, width)
    );
    set({ sidebarWidth: clamped });
    if (typeof window !== 'undefined') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  },

  toggleRightPanel: () => {
    set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen }));
    if (typeof window !== 'undefined') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  },

  setRightPanelWidth: (width) => {
    const clamped = Math.max(
      UI_DIMENSIONS.MIN_RIGHT_PANEL_WIDTH,
      Math.min(UI_DIMENSIONS.MAX_RIGHT_PANEL_WIDTH, width)
    );
    set({ rightPanelWidth: clamped });
    if (typeof window !== 'undefined') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  },

  toggleTerminal: () => {
    set((state) => ({ isTerminalOpen: !state.isTerminalOpen }));
    if (typeof window !== 'undefined') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  },

  setTerminalHeight: (height) => {
    const clamped = Math.max(
      UI_DIMENSIONS.MIN_TERMINAL_HEIGHT,
      Math.min(UI_DIMENSIONS.MAX_TERMINAL_HEIGHT, height)
    );
    set({ terminalHeight: clamped });
    if (typeof window !== 'undefined') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  },

  setCommandPaletteOpen: (open) => {
    set({ isCommandPaletteOpen: open });
  },

  setQuickOpenOpen: (open) => {
    set({ isQuickOpenOpen: open });
  },

  setGlobalPromptOpen: (open) => {
    set({ isGlobalPromptOpen: open });
  },
}));
