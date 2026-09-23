import * as monaco from 'monaco-editor';

class EditorModelManager {
  private models: Map<string, monaco.editor.ITextModel> = new Map();
  private viewStates: Map<string, monaco.editor.ICodeEditorViewState | null> = new Map();

  /**
   * Get or create a Monaco text model for a file.
   */
  getOrCreateModel(
    filePath: string,
    content: string,
    language: string
  ): monaco.editor.ITextModel {
    const uri = monaco.Uri.file(filePath);
    let model = monaco.editor.getModel(uri);

    if (!model) {
      model = monaco.editor.createModel(content, language, uri);
      this.models.set(filePath, model);
    } else if (model.isDisposed()) {
      model = monaco.editor.createModel(content, language, uri);
      this.models.set(filePath, model);
    }

    return model;
  }

  saveViewState(filePath: string, editor: monaco.editor.IStandaloneCodeEditor): void {
    if (editor) {
      this.viewStates.set(filePath, editor.saveViewState());
    }
  }

  restoreViewState(filePath: string, editor: monaco.editor.IStandaloneCodeEditor): void {
    const state = this.viewStates.get(filePath);
    if (state && editor) {
      editor.restoreViewState(state);
    }
  }

  disposeModel(filePath: string): void {
    const uri = monaco.Uri.file(filePath);
    const model = monaco.editor.getModel(uri);
    if (model) {
      model.dispose();
    }
    this.models.delete(filePath);
    this.viewStates.delete(filePath);
  }

  clearAll(): void {
    for (const [, model] of this.models) {
      if (!model.isDisposed()) {
        model.dispose();
      }
    }
    this.models.clear();
    this.viewStates.clear();
  }
}

export const editorModelManager = new EditorModelManager();
