import { create } from 'zustand';
import { WorkspaceState } from '@shared/types/workspace';

interface WorkspaceStore extends WorkspaceState {
  isLoading: boolean;
  error: string | null;
  openFolderDialog: () => Promise<string | null>;
  setWorkspace: (rootPath: string) => void;
  closeWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  rootPath: null,
  rootName: null,
  isOpen: false,
  isLoading: false,
  error: null,

  openFolderDialog: async () => {
    try {
      set({ isLoading: true, error: null });
      const result = await window.coreMindAPI.openDirectoryDialog();
      if (result.success && result.data) {
        const rootPath = result.data;
        const rootName = rootPath.split(/[/\\]/).filter(Boolean).pop() || 'Workspace';
        set({
          rootPath,
          rootName,
          isOpen: true,
          isLoading: false,
        });
        return rootPath;
      }
      set({ isLoading: false });
      return null;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to open directory', isLoading: false });
      return null;
    }
  },

  setWorkspace: (rootPath: string) => {
    const rootName = rootPath.split(/[/\\]/).filter(Boolean).pop() || 'Workspace';
    set({
      rootPath,
      rootName,
      isOpen: true,
      error: null,
    });
  },

  closeWorkspace: () => {
    set({
      rootPath: null,
      rootName: null,
      isOpen: false,
      error: null,
    });
  },
}));
