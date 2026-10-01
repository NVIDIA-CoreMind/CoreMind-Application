import { create } from 'zustand';
import { WorkspaceState } from '@shared/types/workspace';
import { useFilesStore } from './filesStore';
import { ProjectMetadata, RepoMapResponse } from '../services/coremind/types';
import { projectService } from '../services/coremind/project';

const STORAGE_KEY_LAST = 'coremind:last-workspace';
const STORAGE_KEY_RECENTS = 'coremind:recent-workspaces';
const DEFAULT_RECENTS = [
  '/Users/manojsarya/Documents/My Projects/CoreMind-Application',
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
  projectMetadata: ProjectMetadata | null;
  repoMap: RepoMapResponse | null;

  openFolderDialog: () => Promise<string | null>;
  openWorkspacePath: (path: string) => Promise<boolean>;
  restoreLastWorkspace: () => Promise<boolean>;
  refreshRepoMap: () => Promise<void>;
  closeWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  rootPath: null,
  rootName: null,
  isOpen: false,
  isLoading: false,
  error: null,
  recentWorkspaces: getStoredRecents(),
  projectMetadata: null,
  repoMap: null,

  openWorkspacePath: async (targetPath: string) => {
    try {
      set({ isLoading: true, error: null });
      const cleanPath = targetPath.replace(/\/+$/, '');
      const restored = await window.coreMindAPI.restoreWorkspace(cleanPath);
      if (!restored.success || !restored.data) {
        localStorage.removeItem(STORAGE_KEY_LAST);
        set({ isLoading: false, error: 'This folder is not an approved workspace. Please open it again.' });
        return false;
      }
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

      // Automatically load the workspace file tree via local FS
      await useFilesStore.getState().loadWorkspaceTree(cleanPath);

      // Register project with CoreMind Backend to retrieve metadata & language/framework detection
      try {
        const metadata = await projectService.openProject(cleanPath);
        set({ projectMetadata: metadata });
      } catch (backendErr: unknown) {
        console.warn('[CoreMind] Backend openProject warning (backend may be offline):', backendErr);
      }

      // Fetch AST Repo Map in background
      get().refreshRepoMap();

      return true;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to open directory', isLoading: false });
      return false;
    }
  },

  refreshRepoMap: async () => {
    const { rootPath } = get();
    if (!rootPath) return;
    try {
      const repoMap = await projectService.getRepoMap(rootPath);
      set({ repoMap });
    } catch (err: unknown) {
      console.warn('[CoreMind] Failed to fetch repo map:', err);
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
      projectMetadata: null,
      repoMap: null,
    });
    useFilesStore.setState({ fileTree: [], selectedPath: null, expandedPaths: new Set() });
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useWorkspaceStore = useWorkspaceStore;
}
