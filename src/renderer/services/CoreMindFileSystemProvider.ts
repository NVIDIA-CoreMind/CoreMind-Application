import * as vscode from 'vscode';
import { useWorkspaceStore } from '../stores/workspaceStore';

export const WORKSPACE_SCHEME = 'coremind';
export const ORIGINAL_SCHEME = 'coremind-original';

// Original (pre-AI) content for diffs, keyed by absolute path. Fed by the AI change tracker.
const originalContents = new Map<string, string>();

export function setOriginalContent(absPath: string, content: string): void {
  originalContents.set(absPath, content);
}

export function clearOriginalContents(): void {
  originalContents.clear();
}

export function toWorkspaceUri(absPath: string): vscode.Uri {
  return vscode.Uri.file(absPath).with({ scheme: WORKSPACE_SCHEME });
}

export function toOriginalUri(absPath: string): vscode.Uri {
  return vscode.Uri.file(absPath).with({ scheme: ORIGINAL_SCHEME });
}

export class CoreMindOriginalContentProvider implements vscode.FileSystemProvider {
  private emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this.emitter.event;

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const content = originalContents.get(uri.fsPath);
    if (content === undefined) throw vscode.FileSystemError.FileNotFound(uri);
    return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: content.length, permissions: vscode.FilePermission.Readonly };
  }

  readDirectory(): [string, vscode.FileType][] {
    return [];
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const content = originalContents.get(uri.fsPath);
    if (content === undefined) throw vscode.FileSystemError.FileNotFound(uri);
    return new TextEncoder().encode(content);
  }

  writeFile(uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions(uri);
  }

  createDirectory(uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions(uri);
  }

  delete(uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions(uri);
  }

  rename(oldUri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions(oldUri);
  }
}

export class CoreMindFileSystemProvider implements vscode.FileSystemProvider {
  // --- EventEmitter for FileSystemProvider ---
  private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event;

  watch(_uri: vscode.Uri, _options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    // Phase 3 minimum: watch can just be a no-op that returns a disposable for now,
    // until we implement full chokidar watching via IPC
    return new vscode.Disposable(() => {});
  }

  // Called when files change on disk outside of VS Code (agent tools, terminal, other editors).
  notifyExternalChanges(changes: { path: string; type: 'changed' | 'deleted' }[]): void {
    const events: vscode.FileChangeEvent[] = [];
    for (const change of changes) {
      const uri = toWorkspaceUri(change.path);
      if (change.type === 'deleted') {
        events.push({ type: vscode.FileChangeType.Deleted, uri });
      } else {
        // Created makes the Explorer re-read the parent folder, Changed reloads open editors.
        events.push({ type: vscode.FileChangeType.Created, uri }, { type: vscode.FileChangeType.Changed, uri });
      }
    }
    if (events.length > 0) this._onDidChangeFile.fire(events);
  }

  private get rootPath(): string {
    const rootPath = useWorkspaceStore.getState().rootPath;
    return rootPath || '';
  }

  dispose(): void {
    this._onDidChangeFile.dispose();
  }

  private assertWorkspaceUri(uri: vscode.Uri): void {
    const rootPath = this.rootPath;
    if (!rootPath) {
      throw vscode.FileSystemError.Unavailable('No workspace is open.');
    }

    if (uri.scheme !== WORKSPACE_SCHEME) {
      throw vscode.FileSystemError.NoPermissions(`Unsupported file system scheme: ${uri.scheme}`);
    }

    const rootUri = vscode.Uri.file(rootPath);
    const isInWorkspace = uri.path === rootUri.path || uri.path.startsWith(`${rootUri.path}/`);
    if (!isInWorkspace) {
      throw vscode.FileSystemError.NoPermissions('File is outside the active workspace.');
    }
  }

  private getCoreMindAPI() {
    const api = window.coreMindAPI;
    if (!api) {
      throw vscode.FileSystemError.Unavailable('CoreMind IPC API is not available');
    }
    return api;
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    this.assertWorkspaceUri(uri);
    const api = this.getCoreMindAPI();
    const result = await api.stat(uri.fsPath, this.rootPath);
    
    if (!result.success) {
      if (result.error.code === 'ENOENT') {
        throw vscode.FileSystemError.FileNotFound(uri);
      }
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    const { isDirectory, size, lastModified } = result.data;
    
    return {
      type: isDirectory ? vscode.FileType.Directory : vscode.FileType.File,
      ctime: lastModified,
      mtime: lastModified,
      size: size
    };
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    this.assertWorkspaceUri(uri);
    const api = this.getCoreMindAPI();
    const result = await api.readDirectory(uri.fsPath, this.rootPath);

    if (!result.success) {
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    return result.data.map((node: any) => [
      node.name,
      node.isDirectory ? vscode.FileType.Directory : vscode.FileType.File
    ]);
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    this.assertWorkspaceUri(uri);
    const api = this.getCoreMindAPI();
    const result = await api.readFile(uri.fsPath, this.rootPath);

    if (!result.success) {
      if (result.error.code === 'ENOENT') {
        throw vscode.FileSystemError.FileNotFound(uri);
      }
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    return new TextEncoder().encode(result.data);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): Promise<void> {
    this.assertWorkspaceUri(uri);
    const api = this.getCoreMindAPI();
    const textContent = new TextDecoder().decode(content);

    const existingFile = await api.stat(uri.fsPath, this.rootPath);
    if (existingFile.success && !options.overwrite) {
      throw vscode.FileSystemError.FileExists(uri);
    }
    if (!existingFile.success && existingFile.error.code !== 'ENOENT') {
      throw vscode.FileSystemError.Unavailable(existingFile.error.message);
    }
    if (!existingFile.success && !options.create) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    const result = await api.writeFile(uri.fsPath, textContent, this.rootPath);

    if (!result.success) {
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    // Trigger change event to notify VS Code
    this._onDidChangeFile.fire([
      { type: options.create ? vscode.FileChangeType.Created : vscode.FileChangeType.Changed, uri }
    ]);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    this.assertWorkspaceUri(uri);
    const api = this.getCoreMindAPI();
    const result = await api.createDirectory(uri.fsPath, this.rootPath);

    if (!result.success) {
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Created, uri }]);
  }

  async delete(uri: vscode.Uri, _options: { recursive: boolean }): Promise<void> {
    this.assertWorkspaceUri(uri);
    const api = this.getCoreMindAPI();
    const result = await api.delete(uri.fsPath, this.rootPath);

    if (!result.success) {
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
  }

  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, _options: { overwrite: boolean }): Promise<void> {
    this.assertWorkspaceUri(oldUri);
    this.assertWorkspaceUri(newUri);
    const api = this.getCoreMindAPI();
    const result = await api.rename(oldUri.fsPath, newUri.fsPath, this.rootPath);

    if (!result.success) {
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    this._onDidChangeFile.fire([
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri }
    ]);
  }
}
