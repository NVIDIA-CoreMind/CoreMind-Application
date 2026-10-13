import React, { useRef, useEffect } from 'react';
import Editor, { loader, OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTabsStore } from '../stores/tabsStore';
import { useEditorStore } from '../stores/editorStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useThemeStore } from '../stores/themeStore';
import { editorModelManager } from './EditorModelManager';
import { EditorTabs } from './EditorTabs';
import { isMacClient, getShortcutDisplay } from '../../shared/utils/shortcuts';

// Configure Monaco to use local npm package instead of CDN
loader.config({ monaco });

export const MonacoEditor: React.FC = () => {
  const activeTab = useTabsStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const updateTabContent = useTabsStore((s) => s.updateTabContent);
  const saveActiveTab = useTabsStore((s) => s.saveActiveTab);
  const settings = useEditorStore((s) => s.settings);
  const setCursorPosition = useEditorStore((s) => s.setCursorPosition);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const theme = useThemeStore((s) => s.theme);
  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const prevActiveTabIdRef = useRef<string | null>(null);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Define CoreMind bespoke dark theme (Antigravity-inspired)
    monacoInstance.editor.defineTheme('coremind-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', background: '1E1F20' },
        { token: 'comment', foreground: '70757A', fontStyle: 'italic' },
        { token: 'keyword', foreground: '8AB4F8', fontStyle: 'bold' },
        { token: 'string', foreground: '81C995' },
        { token: 'number', foreground: 'FDD663' },
        { token: 'type', foreground: 'A8C7FA' },
        { token: 'function', foreground: 'D2E3FC' },
      ],
      colors: {
        'editor.background': '#1E1F20',
        'editor.foreground': '#E8EAED',
        'editor.lineHighlightBackground': '#30313440',
        'editorCursor.foreground': '#8AB4F8',
        'editorWhitespace.foreground': '#3C4043',
        'editorIndentGuide.background': '#303134',
        'editorIndentGuide.activeBackground': '#8AB4F8',
        'editorLineNumber.foreground': '#70757A',
        'editorLineNumber.activeForeground': '#E8EAED',
        'editor.selectionBackground': '#30343B',
      },
    });

    // Define CoreMind bespoke light theme
    monacoInstance.editor.defineTheme('coremind-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', background: 'FFFFFF' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'AF00DB', fontStyle: 'bold' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'type', foreground: '267F99' },
        { token: 'function', foreground: '795E26' },
        { token: 'variable', foreground: '001080' },
        { token: 'constant', foreground: '0070C1' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#1F2328',
        'editor.lineHighlightBackground': '#0000000a',
        'editorCursor.foreground': '#2563EB',
        'editorWhitespace.foreground': '#D8D8D8',
        'editorIndentGuide.background': '#E5E7EB',
        'editorIndentGuide.activeBackground': '#2563EB',
        'editorLineNumber.foreground': '#9CA3AF',
        'editorLineNumber.activeForeground': '#1F2328',
      },
    });

    // Apply active theme immediately on mount
    const activeTheme = useThemeStore.getState().theme;
    monacoInstance.editor.setTheme(activeTheme === 'dark' ? 'coremind-dark' : 'coremind-light');

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

  // Update theme dynamically when theme state changes without remounting
  useEffect(() => {
    monaco.editor.setTheme(theme === 'dark' ? 'coremind-dark' : 'coremind-light');
  }, [theme]);

  // Auto-layout Monaco on container size change or window resize
  useEffect(() => {
    const el = editorContainerRef.current;
    if (!el) return;

    let rafId: number;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    });
    observer.observe(el);

    const handleWindowResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  if (!activeTab) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-app)' }}>
        <EditorTabs />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: '8px',
            userSelect: 'none',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            No File Open
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Select a file from the explorer or press <kbd style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>{getShortcutDisplay('quickOpen', isMac)}</kbd> to open
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
      <EditorTabs />
      <div ref={editorContainerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <Editor
          height="100%"
          theme={theme === 'dark' ? 'coremind-dark' : 'coremind-light'}
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
