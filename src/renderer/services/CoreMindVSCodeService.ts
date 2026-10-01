import * as vscode from 'vscode';

export interface EditorState {
  uri: string;
  languageId: string;
  content: string;
  isDirty: boolean;
}

export interface SelectionState {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
}

export interface WorkspaceState {
  folders: { uri: string; name: string }[];
}

export interface TextEditPayload {
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  newText: string;
}

export interface DiagnosticItem {
  message: string;
  severity: number;
  source?: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export class CoreMindVSCodeService {
  /**
   * Retrieves the currently active editor's state.
   */
  public getActiveEditor(): EditorState | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }
    
    return {
      uri: editor.document.uri.toString(),
      languageId: editor.document.languageId,
      content: editor.document.getText(),
      isDirty: editor.document.isDirty,
    };
  }

  /**
   * Retrieves the selection from the currently active editor.
   */
  public getSelection(): SelectionState | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return null;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      return null;
    }

    return {
      startLine: selection.start.line + 1, // VS Code is 0-indexed, we expose 1-indexed for agents typically
      startColumn: selection.start.character + 1,
      endLine: selection.end.line + 1,
      endColumn: selection.end.character + 1,
      text: editor.document.getText(selection),
    };
  }

  /**
   * Opens a file in the editor by its URI.
   */
  public async openFile(uriString: string): Promise<void> {
    try {
      const uri = this.parseUri(uriString);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    } catch (err) {
      console.error(`Failed to open file: ${uriString}`, err);
      throw new Error(`Failed to open file: ${uriString}`);
    }
  }

  /**
   * Applies text edits to the document at the specified URI.
   */
  public async applyEdit(uriString: string, edits: TextEditPayload[]): Promise<boolean> {
    try {
      const uri = this.parseUri(uriString);
      if (edits.length === 0) {
        return true;
      }

      const workspaceEdit = new vscode.WorkspaceEdit();

      for (const edit of edits) {
        this.validateEdit(edit);

        // Convert back to 0-indexed for VS Code APIs
        const range = new vscode.Range(
          new vscode.Position(edit.range.startLine - 1, edit.range.startColumn - 1),
          new vscode.Position(edit.range.endLine - 1, edit.range.endColumn - 1)
        );
        workspaceEdit.replace(uri, range, edit.newText);
      }

      return await vscode.workspace.applyEdit(workspaceEdit);
    } catch (err) {
      console.error(`Failed to apply edit to ${uriString}`, err);
      throw new Error(`Failed to apply edit to ${uriString}`);
    }
  }

  /**
   * Opens the diff view comparing the original and modified URIs.
   */
  public async showDiff(originalUriStr: string, modifiedUriStr: string, title?: string): Promise<void> {
    try {
      const originalUri = this.parseUri(originalUriStr);
      const modifiedUri = this.parseUri(modifiedUriStr);
      await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, title || 'Diff');
    } catch (err) {
      console.error(`Failed to show diff for ${originalUriStr} and ${modifiedUriStr}`, err);
      throw new Error(`Failed to show diff`);
    }
  }

  /**
   * Retrieves diagnostics (errors, warnings) for the specified URI.
   */
  public getDiagnostics(uriString: string): DiagnosticItem[] {
    const uri = this.parseUri(uriString);
    const diagnostics = vscode.languages.getDiagnostics(uri);
    
    return diagnostics.map(d => ({
      message: d.message,
      severity: d.severity,
      source: d.source,
      range: {
        startLine: d.range.start.line + 1,
        startColumn: d.range.start.character + 1,
        endLine: d.range.end.line + 1,
        endColumn: d.range.end.character + 1,
      }
    }));
  }

  /**
   * Executes a VS Code command.
   */
  public async executeCommand(commandId: string, ...args: any[]): Promise<any> {
    try {
      return await vscode.commands.executeCommand(commandId, ...args);
    } catch (err) {
      console.error(`Failed to execute command ${commandId}`, err);
      throw new Error(`Command execution failed: ${commandId}`);
    }
  }

  /**
   * Retrieves current workspace folders.
   */
  public getWorkspace(): WorkspaceState {
    const folders = vscode.workspace.workspaceFolders || [];
    return {
      folders: folders.map(f => ({
        uri: f.uri.toString(),
        name: f.name,
      }))
    };
  }

  private parseUri(uriString: string): vscode.Uri {
    if (!uriString.trim()) {
      throw new Error('A file URI is required.');
    }

    try {
      return vscode.Uri.parse(uriString, true);
    } catch {
      throw new Error(`Invalid file URI: ${uriString}`);
    }
  }

  private validateEdit(edit: TextEditPayload): void {
    const { startLine, startColumn, endLine, endColumn } = edit.range;
    const positions = [startLine, startColumn, endLine, endColumn];
    if (!positions.every(Number.isInteger) || positions.some((position) => position < 1)) {
      throw new Error('Edit positions must be positive integers.');
    }

    if (endLine < startLine || (endLine === startLine && endColumn < startColumn)) {
      throw new Error('Edit end position must not precede its start position.');
    }
  }
}

// Export a singleton instance for use throughout the React renderer
export const coreMindVSCodeService = new CoreMindVSCodeService();
