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
      const uri = vscode.Uri.parse(uriString);
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
      const uri = vscode.Uri.parse(uriString);
      const workspaceEdit = new vscode.WorkspaceEdit();

      for (const edit of edits) {
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
      const originalUri = vscode.Uri.parse(originalUriStr);
      const modifiedUri = vscode.Uri.parse(modifiedUriStr);
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
    const uri = vscode.Uri.parse(uriString);
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

  /**
   * Temporary automated test to verify methods are functioning.
   */
  public async __runTests(): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    try {
      // 1. getWorkspace
      const ws = this.getWorkspace();
      results.getWorkspace = `OK: Found ${ws.folders.length} folders`;

      // 2. getActiveEditor & getSelection (might be null initially)
      const editor = this.getActiveEditor();
      results.getActiveEditor = `OK: ${editor ? editor.uri : 'null'}`;
      
      const selection = this.getSelection();
      results.getSelection = `OK: ${selection ? 'has selection' : 'null'}`;

      // 3. executeCommand (test a simple workbench command)
      await this.executeCommand('workbench.action.toggleSidebarVisibility');
      results.executeCommand = 'OK';

      // 4. openFile (create a virtual in-memory file for testing)
      // We will now test physical file instead of inmemory to verify Phase 3 works
      const testUri = 'file:///package.json';
      
      // We will try opening the virtual file but if it fails (no provider), we catch it
      try {
         await this.openFile(testUri);
         results.openFile = 'OK';
         
         // 5. applyEdit
         const success = await this.applyEdit(testUri, [{
           range: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 },
           newText: 'Hello World'
         }]);
         results.applyEdit = `OK: ${success}`;

         // 6. getDiagnostics
         const diags = this.getDiagnostics(testUri);
         results.getDiagnostics = `OK: ${diags.length} diagnostics`;
         
      } catch (e: any) {
         results.openFile = `REQUIRES FILE SYSTEM: ${e.message}`;
         results.applyEdit = 'REQUIRES FILE SYSTEM';
         results.getDiagnostics = 'REQUIRES FILE SYSTEM';
      }

      // 7. showDiff (doesn't strictly require files to exist to just open the diff tab)
      try {
         await this.showDiff('inmemory://test1.txt', 'inmemory://test2.txt', 'Test Diff');
         results.showDiff = 'OK';
      } catch (e: any) {
         results.showDiff = `FAILED: ${e.message}`;
      }

    } catch (e: any) {
      results.unexpectedError = e.message;
    }
    return results;
  }
}

// Export a singleton instance for use throughout the React renderer
export const coreMindVSCodeService = new CoreMindVSCodeService();
