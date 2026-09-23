import React, { useRef, useEffect } from 'react';
import Editor, { loader, OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTabsStore } from '../stores/tabsStore';
import { useEditorStore } from '../stores/editorStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { editorModelManager } from './EditorModelManager';
import { EditorTabs } from './EditorTabs';
import { EmptyState } from '../components/EmptyState';

// Configure Monaco to use local npm package instead of CDN
loader.config({ monaco });

export const MonacoEditor: React.FC = () => {
  const { tabs, activeTabId, updateTabContent, saveActiveTab } = useTabsStore();
  const { settings, setCursorPosition } = useEditorStore();
  const { rootPath } = useWorkspaceStore();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const prevActiveTabIdRef = useRef<string | null>(null);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Define CoreMind bespoke dark theme
    monacoInstance.editor.defineTheme('coremind-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', background: '191D27' },
        { token: 'comment', foreground: '5B6376', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818CF8', fontStyle: 'bold' },
        { token: 'string', foreground: '34D399' },
        { token: 'number', foreground: 'FBBF24' },
        { token: 'type', foreground: '38BDF8' },
        { token: 'function', foreground: '60A5FA' },
      ],
      colors: {
        'editor.background': '#191D27',
        'editor.foreground': '#E6EAF2',
        'editor.lineHighlightBackground': '#22273640',
        'editorCursor.foreground': '#818CF8',
        'editorWhitespace.foreground': '#282D38',
        'editorIndentGuide.background': '#282D38',
        'editorIndentGuide.activeBackground': '#6366F1',
        'editorLineNumber.foreground': '#5B6376',
        'editorLineNumber.activeForeground': '#E6EAF2',
      },
    });

    monacoInstance.editor.setTheme('coremind-dark');

    // Track cursor movements
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position.lineNumber, e.position.column);
    });

    // Handle Cmd+S save inside Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (rootPath) {
        saveActiveTab(rootPath);
      }
    });

    // Focus editor
    editor.focus();
  };

  // Switch Monaco models when activeTab changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (prevActiveTabIdRef.current) {
      editorModelManager.saveViewState(prevActiveTabIdRef.current, editor);
    }

    if (activeTab) {
      const model = editorModelManager.getOrCreateModel(
        activeTab.filePath,
        activeTab.content,
        activeTab.language
      );

      if (editor.getModel() !== model) {
        editor.setModel(model);
        editorModelManager.restoreViewState(activeTab.filePath, editor);
      }

      // Ensure model change updates tab content
      const disposable = model.onDidChangeContent(() => {
        updateTabContent(activeTab.id, model.getValue());
      });

      prevActiveTabIdRef.current = activeTab.id;

      return () => {
        disposable.dispose();
      };
    } else {
      editor.setModel(null);
      prevActiveTabIdRef.current = null;
    }
  }, [activeTab?.id]);

  if (!activeTab) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <EditorTabs />
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <EditorTabs />
      <div style={{ flex: 1, position: 'relative' }}>
        <Editor
          height="100%"
          theme="coremind-dark"
          language={activeTab.language}
          onMount={handleEditorDidMount}
          options={{
            fontSize: settings.fontSize,
            tabSize: settings.tabSize,
            minimap: { enabled: settings.minimap },
            wordWrap: settings.wordWrap,
            lineNumbers: settings.lineNumbers,
            fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
            fontLigatures: true,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            automaticLayout: true,
            renderWhitespace: 'selection',
            scrollBeyondLastLine: false,
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>
    </div>
  );
};
