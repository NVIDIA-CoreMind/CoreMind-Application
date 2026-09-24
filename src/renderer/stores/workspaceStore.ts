import { create } from 'zustand';
import { WorkspaceState } from '@shared/types/workspace';
import { useFilesStore } from './filesStore';

const STORAGE_KEY_LAST = 'coremind:last-workspace';
const STORAGE_KEY_RECENTS = 'coremind:recent-workspaces';
const DEFAULT_RECENTS = [
  '~/Documents/ATS_Projects/Robot_Application',
  '/Users/manojsarya/Documents/My Projects/CoreMind-Application',
  '~/Documents/My Projects/CoreMind-Sandbox',
];

function getStoredRecents(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_RECENTS;
}

function addStoredRecent(path: string) {
  try {
    const recents = getStoredRecents().filter((p) => p !== path);
    recents.unshift(path);
    // keep top 10
    const trimmed = recents.slice(0, 10);
    localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

interface WorkspaceStore extends WorkspaceState {
  isLoading: boolean;
  error: string | null;
  recentWorkspaces: string[];
  openFolderDialog: () => Promise<string | null>;
  openWorkspacePath: (path: string) => Promise<boolean>;
  restoreLastWorkspace: () => Promise<boolean>;
  closeWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  rootPath: null,
  rootName: null,
  isOpen: false,
  isLoading: false,
  error: null,
  recentWorkspaces: getStoredRecents(),

  openWorkspacePath: async (targetPath: string) => {
    try {
      set({ isLoading: true, error: null });
      const cleanPath = targetPath.replace(/\/+$/, '');
      const rootName = cleanPath.split(/[/\\]/).filter(Boolean).pop() || 'Workspace';

      set({
        rootPath: cleanPath,
        rootName,
        isOpen: true,
        isLoading: false,
      });

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY_LAST, cleanPath);
        addStoredRecent(cleanPath);
        set({ recentWorkspaces: getStoredRecents() });
      } catch {
        // ignore
      }

      // Automatically load the workspace file tree
      await useFilesStore.getState().loadWorkspaceTree(cleanPath);
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to open directory', isLoading: false });
      return false;
    }
  },

  openFolderDialog: async () => {
    try {
      set({ isLoading: true, error: null });
      if (!window.coreMindAPI) {
        set({ error: 'CoreMind system API is initializing. Please try again.', isLoading: false });
        return null;
      }
      const result = await window.coreMindAPI.openDirectoryDialog();
      if (!result.success) {
        console.error('Directory dialog error:', result.error);
        set({ error: result.error.message, isLoading: false });
        return null;
      }
      if (result.data) {
        const rootPath = result.data;
        await get().openWorkspacePath(rootPath);
        return rootPath;
      }
      set({ isLoading: false });
      return null;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('openFolderDialog exception:', error);
      set({ error: error.message || 'Failed to open directory', isLoading: false });
      return null;
    }
  },

  restoreLastWorkspace: async () => {
    try {
      const lastPath = localStorage.getItem(STORAGE_KEY_LAST);
      if (lastPath) {
        return await get().openWorkspacePath(lastPath);
      }
      return false;
    } catch {
      return false;
    }
  },

  closeWorkspace: () => {
    try {
      localStorage.removeItem(STORAGE_KEY_LAST);
    } catch {
      // ignore
    }
    set({
      rootPath: null,
      rootName: null,
      isOpen: false,
      error: null,
    });
    useFilesStore.setState({ fileTree: [], selectedPath: null, expandedPaths: new Set() });
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useWorkspaceStore = useWorkspaceStore;
}
