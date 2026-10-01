import type * as VSCode from 'vscode';
import {
  CoreMindFileSystemProvider,
  CoreMindOriginalContentProvider,
  ORIGINAL_SCHEME,
  setOriginalContent,
  toOriginalUri,
  toWorkspaceUri,
} from './CoreMindFileSystemProvider';
import { baseName } from './fileIcons';
import { STATUS_BADGE, STATUS_LABEL, TrackedChange } from './aiChanges';

// Thin, typed bridge between React stores and the live VS Code Workbench.
// Everything here goes through public VS Code APIs; nothing is exposed on `window`.

let vscodeApi: typeof VSCode | null = null;
let fileProvider: CoreMindFileSystemProvider | null = null;
let decorationEmitter: VSCode.EventEmitter<VSCode.Uri[]> | null = null;
let decorated = new Map<string, TrackedChange>();
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

const STATUS_COLOR: Record<TrackedChange['status'], string> = {
  created: 'gitDecoration.addedResourceForeground',
  modified: 'gitDecoration.modifiedResourceForeground',
  deleted: 'gitDecoration.deletedResourceForeground',
};

export function isWorkbenchReady(): boolean {
  return vscodeApi !== null;
}

export function initWorkbenchBridge(vscode: typeof VSCode, provider: CoreMindFileSystemProvider): void {
  vscodeApi = vscode;
  fileProvider = provider;

  vscode.workspace.registerFileSystemProvider(ORIGINAL_SCHEME, new CoreMindOriginalContentProvider(), {
    isCaseSensitive: true,
    isReadonly: true,
  });

  decorationEmitter = new vscode.EventEmitter<VSCode.Uri[]>();
  vscode.window.registerFileDecorationProvider({
    onDidChangeFileDecorations: decorationEmitter.event,
    provideFileDecoration(uri) {
      const change = decorated.get(uri.path);
      if (!change) return undefined;
      const decoration = new vscode.FileDecoration(
        STATUS_BADGE[change.status],
        `AI ${STATUS_LABEL[change.status]}`,
        new vscode.ThemeColor(STATUS_COLOR[change.status])
      );
      return decoration;
    },
  });
}

export function syncDecorations(changes: TrackedChange[]): void {
  const next = new Map(changes.filter((c) => !c.outsideWorkspace).map((c) => [c.absPath, c]));
  const affected = new Set([...decorated.keys(), ...next.keys()]);
  decorated = next;
  if (decorationEmitter && affected.size > 0) {
    decorationEmitter.fire([...affected].map((p) => toWorkspaceUri(p)));
  }
}

export function notifyExternalChanges(changes: { path: string; type: 'changed' | 'deleted' }[]): void {
  fileProvider?.notifyExternalChanges(changes);
  if (!vscodeApi) return;
  // The Explorer only re-reads folders it already knows about; an explicit refresh guarantees new files appear.
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    void vscodeApi?.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
  }, 200);
}

export async function refreshExplorer(): Promise<void> {
  await vscodeApi?.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
}

export async function openChangedFile(change: TrackedChange): Promise<void> {
  if (!vscodeApi) throw new Error('The editor is not ready yet.');
  await vscodeApi.window.showTextDocument(toWorkspaceUri(change.absPath), { preview: false });
}

export type DiffOutcome = 'diff' | 'file' | 'original';

// Opens the real VS Code diff editor: original content on the left, the file on disk on the right.
export async function openChangeDiff(change: TrackedChange): Promise<DiffOutcome> {
  if (!vscodeApi) throw new Error('The editor is not ready yet.');
  const vscode = vscodeApi;

  if (change.baseline === undefined) {
    await openChangedFile(change);
    return 'file';
  }

  setOriginalContent(change.absPath, change.baseline ?? '');
  const original = toOriginalUri(change.absPath);
  const title = `${baseName(change.path)} (AI ${STATUS_LABEL[change.status]})`;

  if (change.status === 'deleted') {
    await vscode.window.showTextDocument(original, { preview: false });
    return 'original';
  }

  await vscode.commands.executeCommand('vscode.diff', original, toWorkspaceUri(change.absPath), title, {
    preview: false,
  });
  return 'diff';
}

export async function showMessage(kind: 'info' | 'warning', message: string): Promise<void> {
  if (!vscodeApi) return;
  if (kind === 'warning') await vscodeApi.window.showWarningMessage(message);
  else await vscodeApi.window.showInformationMessage(message);
}
