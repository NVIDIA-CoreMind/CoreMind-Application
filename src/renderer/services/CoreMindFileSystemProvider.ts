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

  private getCoreMindAPI() {
    const api = (window as any).coreMindAPI;
    if (!api) {
      throw vscode.FileSystemError.Unavailable('CoreMind IPC API is not available');
    }
    return api;
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
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
    const api = this.getCoreMindAPI();
    const textContent = new TextDecoder().decode(content);

    // If we need to create it and it doesn't exist, we can just try to write it.
    // CoreMind's writeFile handles creating files natively if the path is valid.
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
    const api = this.getCoreMindAPI();
    const result = await api.createDirectory(uri.fsPath, this.rootPath);

    if (!result.success) {
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Created, uri }]);
  }

  async delete(uri: vscode.Uri, _options: { recursive: boolean }): Promise<void> {
    const api = this.getCoreMindAPI();
    const result = await api.delete(uri.fsPath, this.rootPath);

    if (!result.success) {
      throw vscode.FileSystemError.Unavailable(result.error.message);
    }

    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
  }

  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, _options: { overwrite: boolean }): Promise<void> {
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
