import React, { useEffect, useRef } from 'react';
import { MonacoVscodeApiWrapper } from 'monaco-languageclient/vscodeApiWrapper';

import getWorkbenchServiceOverride from '@codingame/monaco-vscode-workbench-service-override';
import getFilesServiceOverride from '@codingame/monaco-vscode-files-service-override';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override';
import getDialogsServiceOverride from '@codingame/monaco-vscode-dialogs-service-override';
import getLifecycleServiceOverride from '@codingame/monaco-vscode-lifecycle-service-override';
import getConfigurationServiceOverride from '@codingame/monaco-vscode-configuration-service-override';
import * as monaco from 'monaco-editor';
import '@codingame/monaco-vscode-theme-defaults-default-extension';
import '@codingame/monaco-vscode-theme-seti-default-extension';
import '../workers';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAgentStore } from '../stores/agentStore';
import { EmptyState } from './EmptyState';
import { initWorkbenchBridge, notifyExternalChanges, syncDecorations } from '../services/workbenchBridge';
import { sortedChanges } from '../services/aiChanges';

const FILE_SCHEME = 'coremind';

let startPromise: Promise<void> | null = null;

function toWorkspaceUri(rootPath: string): monaco.Uri {
  return monaco.Uri.file(rootPath).with({ scheme: FILE_SCHEME });
}

async function syncWorkspaceFolder(rootPath: string): Promise<void> {
  void window.coreMindAPI?.watchWorkspace();
  const vscode = await import('vscode');
  const folders = vscode.workspace.workspaceFolders ?? [];
  const workspaceUri = toWorkspaceUri(rootPath);

  if (folders[0]?.uri.toString() !== workspaceUri.toString()) {
    vscode.workspace.updateWorkspaceFolders(0, folders.length, { uri: vscode.Uri.parse(workspaceUri.toString()) });
  }
}

// The Workbench keeps its editor part collapsed until an editor has been opened.
async function showInitialEditor(vscode: typeof import('vscode')): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (root) {
    const readme = vscode.Uri.joinPath(root.uri, 'README.md');
    try {
      await vscode.workspace.fs.stat(readme);
      await vscode.window.showTextDocument(readme, { preview: false });
      return;
    } catch {
      // Fall back to an empty editor below.
    }
  }
  await vscode.commands.executeCommand('workbench.action.files.newUntitledFile');
}

async function startWorkbench(container: HTMLElement, rootPath: string): Promise<void> {
  const apiWrapper = new MonacoVscodeApiWrapper({
    $type: 'extended',
    viewsConfig: { $type: 'WorkbenchService', htmlContainer: container },
    serviceOverrides: {
      ...getWorkbenchServiceOverride(),
      ...getFilesServiceOverride(),
      ...getThemeServiceOverride(),
      ...getTextmateServiceOverride(),
      ...getExplorerServiceOverride(),
      ...getDialogsServiceOverride(),
      ...getLifecycleServiceOverride(),
      ...getConfigurationServiceOverride(),
    },
    workspaceConfig: {
      workspaceProvider: {
        trusted: true,
        workspace: { folderUri: toWorkspaceUri(rootPath) },
        async open() {
          return false;
        },
      },
    },
    userConfiguration: {
      json: JSON.stringify({ 'workbench.colorTheme': 'Default Dark Modern', 'workbench.iconTheme': 'vs-seti' }),
    },
  });
  await apiWrapper.start();

  const vscode = await import('vscode');
  const { CoreMindFileSystemProvider } = await import('../services/CoreMindFileSystemProvider');
  const fileProvider = new CoreMindFileSystemProvider();
  vscode.workspace.registerFileSystemProvider(FILE_SCHEME, fileProvider, {
    isCaseSensitive: true,
    isReadonly: false,
  });
  initWorkbenchBridge(vscode, fileProvider);

  // Keep Explorer decorations in sync with the AI change tracker.
  syncDecorations(sortedChanges(useAgentStore.getState().trackedChanges));
  useAgentStore.subscribe((state, prev) => {
    if (state.trackedChanges !== prev.trackedChanges) {
      syncDecorations(sortedChanges(state.trackedChanges));
    }
  });

  // Reflect real on-disk changes (agent tools, terminal, external editors) in the Explorer and open editors.
  window.coreMindAPI?.onWorkspaceFilesChanged((changes) => notifyExternalChanges(changes));

  const currentRoot = useWorkspaceStore.getState().rootPath;
  if (currentRoot) {
    await syncWorkspaceFolder(currentRoot);
  }
  await vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
  await vscode.commands.executeCommand('workbench.view.explorer');
  await showInitialEditor(vscode);
}

export const CoreMindWorkbench: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootPath = useWorkspaceStore((state) => state.rootPath);

  const previousRoot = useRef<string | null>(null);
  useEffect(() => {
    // Review state belongs to a workspace; drop it when the user switches folders.
    if (previousRoot.current && previousRoot.current !== rootPath) {
      useAgentStore.setState({
        trackedChanges: {},
        taskSummary: null,
        reviewIndex: null,
        changeNotice: null,
        changeSet: null,
        activeChangeId: null,
      });
    }
    previousRoot.current = rootPath;

    if (!rootPath) {
      return;
    }

    if (!startPromise) {
      if (!containerRef.current) {
        return;
      }
      startPromise = startWorkbench(containerRef.current, rootPath).catch((error: unknown) => {
        startPromise = null;
        console.error('VS Code Workbench initialization failed', error);
      });
      return;
    }

    void startPromise.then(() => syncWorkspaceFolder(rootPath));
  }, [rootPath]);

  // The workbench only relayouts on window resize, so forward container size changes (e.g. the agent panel splitter).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    });
    observer.observe(container);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#1e1e1e', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!rootPath && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <EmptyState />
        </div>
      )}
    </div>
  );
};
