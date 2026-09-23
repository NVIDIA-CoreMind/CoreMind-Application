import { create } from 'zustand';
import { FileNode, FileSearchResult } from '@shared/types/file';

interface FilesStore {
  fileTree: FileNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  searchResults: FileSearchResult[];
  isSearching: boolean;
  searchQuery: string;
  error: string | null;

  loadWorkspaceTree: (rootPath: string) => Promise<void>;
  toggleFolder: (folderPath: string, rootPath: string) => Promise<void>;
  setSelectedPath: (path: string | null) => void;
  createFile: (parentDir: string, fileName: string, rootPath: string) => Promise<boolean>;
  createDirectory: (parentDir: string, dirName: string, rootPath: string) => Promise<boolean>;
  renameItem: (oldPath: string, newPath: string, rootPath: string) => Promise<boolean>;
  deleteItem: (targetPath: string, rootPath: string) => Promise<boolean>;
  search: (query: string, rootPath: string) => Promise<void>;
  clearSearch: () => void;
}

// Helper to update children of a directory node inside the tree recursively
function updateNodeChildren(
  nodes: FileNode[],
  targetPath: string,
  children: FileNode[]
): FileNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeChildren(node.children, targetPath, children),
      };
    }
    return node;
  });
}

export const useFilesStore = create<FilesStore>((set, get) => ({
  fileTree: [],
  expandedPaths: new Set<string>(),
  selectedPath: null,
  searchResults: [],
  isSearching: false,
  searchQuery: '',
  error: null,

  loadWorkspaceTree: async (rootPath: string) => {
    try {
      if (!window.coreMindAPI) {
        set({ error: 'CoreMind system API is initializing. Please wait a moment.' });
        return;
      }
      const result = await window.coreMindAPI.readDirectory(rootPath, rootPath);
      if (result.success) {
        set({ fileTree: result.data, error: null });
      } else {
        set({ error: result.error.message });
      }
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message || 'Failed to load file tree' });
    }
  },

  toggleFolder: async (folderPath: string, rootPath: string) => {
    const { expandedPaths, fileTree } = get();
    const newExpanded = new Set(expandedPaths);

    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
      set({ expandedPaths: newExpanded });
    } else {
      newExpanded.add(folderPath);
      set({ expandedPaths: newExpanded });

      // Fetch children for this folder
      const result = await window.coreMindAPI.readDirectory(folderPath, rootPath);
      if (result.success) {
        const updatedTree = updateNodeChildren(fileTree, folderPath, result.data);
        set({ fileTree: updatedTree });
      }
    }
  },

  setSelectedPath: (path: string | null) => {
    set({ selectedPath: path });
  },

  createFile: async (parentDir: string, fileName: string, rootPath: string) => {
    try {
      const filePath = `${parentDir}/${fileName}`.replace(/\/+/g, '/');
      const result = await window.coreMindAPI.createFile(filePath, rootPath);
      if (result.success) {
        await get().loadWorkspaceTree(rootPath);
        return true;
      }
      set({ error: result.error.message });
      return false;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  createDirectory: async (parentDir: string, dirName: string, rootPath: string) => {
    try {
      const dirPath = `${parentDir}/${dirName}`.replace(/\/+/g, '/');
      const result = await window.coreMindAPI.createDirectory(dirPath, rootPath);
      if (result.success) {
        await get().loadWorkspaceTree(rootPath);
        return true;
      }
      set({ error: result.error.message });
      return false;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  renameItem: async (oldPath: string, newPath: string, rootPath: string) => {
    try {
      const result = await window.coreMindAPI.rename(oldPath, newPath, rootPath);
      if (result.success) {
        await get().loadWorkspaceTree(rootPath);
        return true;
      }
      set({ error: result.error.message });
      return false;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  deleteItem: async (targetPath: string, rootPath: string) => {
    try {
      const result = await window.coreMindAPI.delete(targetPath, rootPath);
      if (result.success) {
        await get().loadWorkspaceTree(rootPath);
        return true;
      }
      set({ error: result.error.message });
      return false;
    } catch (err: unknown) {
      const error = err as Error;
      set({ error: error.message });
      return false;
    }
  },

  search: async (query: string, rootPath: string) => {
    set({ searchQuery: query, isSearching: true });
    try {
      const result = await window.coreMindAPI.searchFiles(query, rootPath);
      if (result.success) {
        set({ searchResults: result.data, isSearching: false });
      } else {
        set({ searchResults: [], isSearching: false, error: result.error.message });
      }
    } catch {
      set({ searchResults: [], isSearching: false });
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: [], isSearching: false });
  },
}));
