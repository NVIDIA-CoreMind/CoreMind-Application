import * as vscode from 'vscode';
import { useWorkspaceStore } from '../stores/workspaceStore';

export class CoreMindFileSystemProvider implements vscode.FileSystemProvider {
  // --- EventEmitter for FileSystemProvider ---
  private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event;

  watch(_uri: vscode.Uri, _options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    // Phase 3 minimum: watch can just be a no-op that returns a disposable for now,
    // until we implement full chokidar watching via IPC
    return new vscode.Disposable(() => {});
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

    if (uri.scheme !== 'coremind') {
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
