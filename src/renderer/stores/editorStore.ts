import { create } from 'zustand';
import { EditorSettings } from '@shared/types/settings';
import { DEFAULT_SETTINGS } from '@shared/constants';

interface EditorStore {
  settings: EditorSettings;
  cursorPosition: { line: number; column: number };
  setCursorPosition: (line: number, column: number) => void;
  updateSettings: (newSettings: Partial<EditorSettings>) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  settings: { ...DEFAULT_SETTINGS.editor },
  cursorPosition: { line: 1, column: 1 },

  setCursorPosition: (line, column) => {
    set({ cursorPosition: { line, column } });
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },
}));
