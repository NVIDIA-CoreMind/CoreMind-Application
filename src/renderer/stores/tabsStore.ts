import { create } from 'zustand';
import { TabItem } from '@shared/types/tab';
import { useWorkspaceStore } from './workspaceStore';

interface TabsStore {
  tabs: TabItem[];
  activeTabId: string | null;
  openFile: (filePath: string, fileName: string, rootPath: string) => Promise<void>;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveActiveTab: (rootPath: string) => Promise<boolean>;
  saveTab: (tabId: string, rootPath: string) => Promise<boolean>;
  createUntitledTab: () => void;
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
      useWorkspaceStore.getState().setActiveFileName(existing.fileName);
      if (!existing.isDirty && window.coreMindAPI?.readFile) {
        try {
          const res = await window.coreMindAPI.readFile(filePath, rootPath);
          if (res.success && res.data !== existing.content) {
            get().updateTabContent(existing.id, res.data);
          }
        } catch {
          // ignore
        }
      }
      return;
    }

    // Read file content
    let content = '';
    const result = await window.coreMindAPI.readFile(filePath, rootPath);
    if (result.success) {
      content = result.data;
    } else {
      console.warn('Failed to read file for tab, creating empty:', result.error);
    }
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
    useWorkspaceStore.getState().setActiveFileName(fileName);
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return;

    const newTabs = tabs.filter((t) => t.id !== tabId);

    let nextActiveId: string | null = activeTabId;
    let nextActiveFileName: string | null = null;
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        // Activate neighbor tab
        const nextIndex = Math.min(index, newTabs.length - 1);
        nextActiveId = newTabs[nextIndex].id;
        nextActiveFileName = newTabs[nextIndex].fileName;
      } else {
        nextActiveId = null;
        nextActiveFileName = null;
      }
    } else {
      const current = newTabs.find((t) => t.id === activeTabId);
      nextActiveFileName = current ? current.fileName : null;
    }

    set({
      tabs: newTabs,
      activeTabId: nextActiveId,
    });
    useWorkspaceStore.getState().setActiveFileName(nextActiveFileName);
  },

  setActiveTab: (tabId: string) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);
    set({ activeTabId: tabId });
    if (tab) {
      useWorkspaceStore.getState().setActiveFileName(tab.fileName);
    }
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

  createUntitledTab: () => {
    const { tabs } = get();
    const untitledCount = tabs.filter((t) => t.fileName.startsWith('Untitled-')).length + 1;
    const id = `untitled-${Date.now()}`;
    const fileName = `Untitled-${untitledCount}`;
    const newTab: TabItem = {
      id,
      filePath: id,
      fileName,
      language: 'plaintext',
      content: '',
      savedContent: '',
      isDirty: false,
    };
    set({
      tabs: [...tabs, newTab],
      activeTabId: id,
    });
    useWorkspaceStore.getState().setActiveFileName(fileName);
  },
}));
