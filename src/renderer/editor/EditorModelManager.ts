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

    try {
      if (!model || model.isDisposed()) {
        model = monaco.editor.createModel(content, language, uri);
        this.models.set(filePath, model);
      } else {
        // If language has changed, update it
        if (language) {
          monaco.editor.setModelLanguage(model, language);
        }
      }
    } catch (err) {
      console.warn('Error in getOrCreateModel:', err);
      if (!model || model.isDisposed()) {
        model = monaco.editor.createModel(content, language);
        this.models.set(filePath, model);
      }
    }

    return model;
  }

  saveViewState(filePath: string, editor: monaco.editor.IStandaloneCodeEditor | null): void {
    if (!editor || !filePath) return;
    try {
      const currentModel = editor.getModel();
      if (currentModel && !currentModel.isDisposed()) {
        const state = editor.saveViewState();
        if (state) {
          this.viewStates.set(filePath, state);
        }
      }
    } catch (err) {
      console.warn('Failed to save Monaco view state for', filePath, err);
    }
  }

  restoreViewState(filePath: string, editor: monaco.editor.IStandaloneCodeEditor | null): void {
    if (!editor || !filePath) return;
    try {
      const state = this.viewStates.get(filePath);
      const currentModel = editor.getModel();
      if (state && currentModel && !currentModel.isDisposed()) {
        editor.restoreViewState(state);
      }
    } catch (err) {
      console.warn('Failed to restore Monaco view state for', filePath, err);
    }
  }

  disposeModel(filePath: string, editor?: monaco.editor.IStandaloneCodeEditor | null): void {
    try {
      const uri = monaco.Uri.file(filePath);
      const model = monaco.editor.getModel(uri);
      if (editor && editor.getModel() === model) {
        editor.setModel(null);
      }
      if (model && !model.isDisposed()) {
        model.dispose();
      }
    } catch (err) {
      console.warn('Failed to dispose Monaco model for', filePath, err);
    } finally {
      this.models.delete(filePath);
      this.viewStates.delete(filePath);
    }
  }

  clearAll(editor?: monaco.editor.IStandaloneCodeEditor | null): void {
    try {
      if (editor) {
        editor.setModel(null);
      }
      for (const [, model] of this.models) {
        if (!model.isDisposed()) {
          model.dispose();
        }
      }
    } catch (err) {
      console.warn('Failed to clear Monaco models:', err);
    } finally {
      this.models.clear();
      this.viewStates.clear();
    }
  }
}

export const editorModelManager = new EditorModelManager();

