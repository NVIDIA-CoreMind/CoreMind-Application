import React, { useEffect, useState } from 'react';
import { IDELayout } from './layouts/IDELayout';
import { OnboardingWindow } from '../features/onboarding/OnboardingWindow';
import { onboardingService } from '../features/onboarding/onboarding.service';
import { OnboardingStep } from '../features/onboarding/onboarding.types';
import { useTabsStore } from './stores/tabsStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useUiStore } from './stores/uiStore';
import { useBackendStore } from './stores/backendStore';
import { useAuthStore } from './stores/authStore';
import { isMacClient } from '../shared/utils/shortcuts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { editorModelManager } from './editor/EditorModelManager';

export const App: React.FC = () => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() =>
    onboardingService.isOnboardingCompleted()
  );
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<OnboardingStep>(() =>
    onboardingService.getInitialStep()
  );

  // Subscribe to onboarding lifecycle events (e.g., sign out routing to Google auth)
  useEffect(() => {
    const unsubscribe = onboardingService.subscribe((completed, step) => {
      setIsOnboardingCompleted(completed);
      setOnboardingInitialStep(step);
    });

    const handleSignOutEvent = () => {
      setIsOnboardingCompleted(false);
      setOnboardingInitialStep(3);
    };

    window.addEventListener('coremind:signout', handleSignOutEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('coremind:signout', handleSignOutEvent);
    };
  }, []);

  const openWorkspacePath = useWorkspaceStore((s) => s.openWorkspacePath);
  const restoreLastWorkspace = useWorkspaceStore((s) => s.restoreLastWorkspace);

  // Initialize CoreMind Backend WebSocket and Auth session on startup
  useEffect(() => {
    useBackendStore.getState().init();
    useAuthStore.getState().initAuth();
  }, []);

  // Restore previous workspace on startup
  useEffect(() => {
    restoreLastWorkspace();
  }, [restoreLastWorkspace]);

  // Listen for Open Folder events from native macOS application menu
  useEffect(() => {
    const unsub = window.coreMindAPI?.onOpenWorkspacePath?.((path) => {
      if (path) {
        openWorkspacePath(path);
      }
    });
    return () => unsub?.();
  }, [openWorkspacePath]);

  // Window drag & drop for opening folders from Finder
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const dropped = e.dataTransfer.files[0];
        const filePath = (dropped as any).path;
        if (filePath) {
          openWorkspacePath(filePath);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [openWorkspacePath]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd+N: New File
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        useTabsStore.getState().createUntitledTab();
        return;
      }

      // Cmd+O: Open Folder
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        useWorkspaceStore.getState().openFolderDialog();
        return;
      }

      // Cmd+Shift+P: Command Palette
      if (cmdOrCtrl && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        const curPalette = useUiStore.getState().isCommandPaletteOpen;
        useUiStore.getState().setCommandPaletteOpen(!curPalette);
        return;
      }

      // Cmd+Shift+A or Cmd+L: Toggle Agent Panel
      if ((cmdOrCtrl && e.shiftKey && (e.key === 'a' || e.key === 'A')) || (cmdOrCtrl && !e.shiftKey && (e.key === 'l' || e.key === 'L'))) {
        e.preventDefault();
        useUiStore.getState().toggleRightPanel();
        return;
      }

      // Cmd+P: Quick Open
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        const curQuickOpen = useUiStore.getState().isQuickOpenOpen;
        useUiStore.getState().setQuickOpenOpen(!curQuickOpen);
        return;
      }

      // Cmd+S: Save File
      if (cmdOrCtrl && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        const curRoot = useWorkspaceStore.getState().rootPath;
        if (curRoot) {
          useTabsStore.getState().saveActiveTab(curRoot);
        }
        return;
      }

      // Cmd+W: Close Tab
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        const curActiveTabId = useTabsStore.getState().activeTabId;
        if (curActiveTabId) {
          useTabsStore.getState().closeTab(curActiveTabId);
          editorModelManager.disposeModel(curActiveTabId);
        }
        return;
      }

      // Cmd+B: Toggle Sidebar
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        useUiStore.getState().toggleSidebar();
        return;
      }

      // Cmd+J: Toggle Terminal
      if (cmdOrCtrl && !e.shiftKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        useUiStore.getState().toggleTerminal();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isOnboardingCompleted) {
    return (
      <OnboardingWindow
        initialStep={onboardingInitialStep}
        onComplete={() => {
          setIsOnboardingCompleted(true);
          restoreLastWorkspace();
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <IDELayout />
    </ErrorBoundary>
  );
};

export default App;
