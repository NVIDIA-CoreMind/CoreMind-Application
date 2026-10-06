import { create } from 'zustand';
import { AIWorkspaceEvent, AIRequestStatus } from '../types/aiWorkspace';

interface AIWorkspaceStore {
  events: AIWorkspaceEvent[];
  currentState: AIRequestStatus;
  selectedModel: string;
  abortController: AbortController | null;
  addEvent: (event: AIWorkspaceEvent) => void;
  updateEvent: (id: string, updates: Partial<AIWorkspaceEvent>) => void;
  setState: (state: AIRequestStatus) => void;
  setSelectedModel: (model: string) => void;
  setAbortController: (controller: AbortController | null) => void;
  clear: () => void;
  submitAnswer: (answer: string) => void;
  cancelRequest: () => void;
}

export const useAIWorkspaceStore = create<AIWorkspaceStore>((set, get) => ({
  events: [],
  currentState: 'idle',
  selectedModel: 'Nemotron-3-Ultra',
  abortController: null,
  
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  
  updateEvent: (id, updates) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...updates } as AIWorkspaceEvent : e)),
    })),
    
  setState: (newState) => set({ currentState: newState }),
  
  setSelectedModel: (model) => set({ selectedModel: model }),
  
  setAbortController: (controller) => set({ abortController: controller }),
  
  clear: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ events: [], currentState: 'idle', abortController: null });
  },
  
  submitAnswer: (answer) => {
    const state = get();
    if (state.currentState === 'waiting') {
      state.setState('running');
      // In a real implementation, this would send an IPC message to the main process
      console.log('Submitted answer:', answer);
    }
  },
  
  cancelRequest: () => {
    const { abortController, currentState } = get();
    if (currentState === 'running' || currentState === 'waiting') {
      if (abortController) {
        abortController.abort();
      }
      set({ currentState: 'stopped', abortController: null });
    }
  }
}));
