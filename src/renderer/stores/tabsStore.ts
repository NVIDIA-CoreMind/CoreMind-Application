import { create } from 'zustand';
import { TabItem } from '@shared/types/tab';

interface TabsStore {
  tabs: TabItem[];
  activeTabId: string | null;
  openFile: (filePath: string, fileName: string, rootPath: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveActiveTab: (rootPath: string) => Promise<boolean>;
  saveTab: (tabId: string, rootPath: string) => Promise<boolean>;
}

export function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'py':
      return 'python';
    case 'dart':
      return 'dart';
    case 'json':
      return 'json';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    default:
      return 'plaintext';
  }
}

export const useTabsStore = create<TabsStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openFile: async (filePath: string, fileName: string, rootPath: string) => {
    const { tabs } = get();
    // Check if already open
    const existing = tabs.find((t) => t.filePath === filePath);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    // Read file content
    const result = await window.coreMindAPI.readFile(filePath, rootPath);
    if (!result.success) {
      console.error('Failed to read file for tab:', result.error);
      return;
    }

    const content = result.data;
    const newTab: TabItem = {
      id: filePath,
      filePath,
      fileName,
      language: detectLanguage(fileName),
      content,
      savedContent: content,
      isDirty: false,
    };

    set({
      tabs: [...tabs, newTab],
      activeTabId: newTab.id,
    });
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return;

    const newTabs = tabs.filter((t) => t.id !== tabId);

    let nextActiveId: string | null = activeTabId;
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        // Activate neighbor tab
        const nextIndex = Math.min(index, newTabs.length - 1);
        nextActiveId = newTabs[nextIndex].id;
      } else {
        nextActiveId = null;
      }
    }

    set({
      tabs: newTabs,
      activeTabId: nextActiveId,
    });
  },

  setActiveTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  updateTabContent: (tabId: string, content: string) => {
    const { tabs } = get();
    const updated = tabs.map((tab) => {
      if (tab.id === tabId) {
        return {
          ...tab,
          content,
          isDirty: content !== tab.savedContent,
        };
      }
      return tab;
    });
    set({ tabs: updated });
  },

  saveActiveTab: async (rootPath: string) => {
    const { activeTabId } = get();
    if (!activeTabId) return false;
    return get().saveTab(activeTabId, rootPath);
  },

  saveTab: async (tabId: string, rootPath: string) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return false;

    const result = await window.coreMindAPI.writeFile(tab.filePath, tab.content, rootPath);
    if (result.success) {
      const updated = tabs.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            savedContent: t.content,
            isDirty: false,
          };
        }
        return t;
      });
      set({ tabs: updated });
      return true;
    } else {
      console.error('Failed to save file:', result.error);
      return false;
    }
  },
}));
