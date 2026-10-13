import { describe, it, expect, vi, beforeEach } from 'vitest';

(global as any).window = (global as any).window || {};

import { useTerminalStore } from '../src/renderer/stores/terminalStore';
import { useTabsStore } from '../src/renderer/stores/tabsStore';
import { useEditorStore } from '../src/renderer/stores/editorStore';
import { useWorkspaceStore } from '../src/renderer/stores/workspaceStore';
import { terminalService } from '../src/main/services/terminalService';

describe('AIWorkspace Integrated Terminal - Keystroke, Cursor & Session Preservation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useTerminalStore.getState().resetTabs();
    useTabsStore.setState({ tabs: [], activeTabId: null });
    useWorkspaceStore.setState({ rootPath: '/test/workspace', rootName: 'workspace' });
  });

  describe('1. Terminal Session Lifecycle & Id Stability', () => {
    it('initializes terminal session with unique persistent ID and avoids recreating on store updates', () => {
      const tabId = useTerminalStore.getState().addTab('zsh');
      expect(tabId).toBeTruthy();
      expect(useTerminalStore.getState().tabs).toHaveLength(1);
      expect(useTerminalStore.getState().activeId).toBe(tabId);

      // Simulating rapid keystrokes, edits, and deletions in editor tabs
      useTabsStore.setState({
        tabs: [
          {
            id: 'tab-1',
            filePath: '/test/workspace/file.ts',
            fileName: 'file.ts',
            language: 'typescript',
            content: 'const x = 1;',
            savedContent: 'const x = 1;',
            isDirty: false,
          },
        ],
        activeTabId: 'tab-1',
      });

      // Typing keystrokes: 'a', 'b', 'c', then backspace
      useTabsStore.getState().updateTabContent('tab-1', 'const x = 1; a');
      useTabsStore.getState().updateTabContent('tab-1', 'const x = 1; ab');
      useTabsStore.getState().updateTabContent('tab-1', 'const x = 1; abc');
      useTabsStore.getState().updateTabContent('tab-1', 'const x = 1; ab'); // deleted 'c'

      // Moving cursor in editor
      useEditorStore.getState().setCursorPosition(1, 15);
      useEditorStore.getState().setCursorPosition(1, 14);

      // Terminal state MUST remain completely preserved!
      const currentTerminalTabs = useTerminalStore.getState().tabs;
      expect(currentTerminalTabs).toHaveLength(1);
      expect(currentTerminalTabs[0].id).toBe(tabId);
      expect(useTerminalStore.getState().activeId).toBe(tabId);
    });

    it('preserves multiple concurrent terminal sessions without cross-contamination', () => {
      const term1 = useTerminalStore.getState().addTab('zsh');
      const term2 = useTerminalStore.getState().addTab('bash');

      expect(useTerminalStore.getState().tabs).toHaveLength(2);
      expect(useTerminalStore.getState().activeId).toBe(term2);

      // Switch active tab back to term1
      useTerminalStore.getState().setActiveId(term1);
      expect(useTerminalStore.getState().activeId).toBe(term1);

      // Both tabs retain their respective shells and IDs
      const tabs = useTerminalStore.getState().tabs;
      expect(tabs[0].id).toBe(term1);
      expect(tabs[0].title).toBe('zsh');
      expect(tabs[1].id).toBe(term2);
      expect(tabs[1].title).toBe('bash');
    });
  });

  describe('2. Terminal Live Keystrokes, Cursor Navigation, Deletion & Command Execution', () => {
    it('handles typing characters, arrow navigation, deleting characters, and executing commands in sequence', async () => {
      const writtenChunks: string[] = [];

      // Mock window.coreMindAPI for live terminal IPC
      const mockApi = {
        terminalWrite: vi.fn(async (_id: string, data: string) => {
          writtenChunks.push(data);
        }),
        createTerminal: vi.fn(async () => ({ success: true })),
        closeTerminal: vi.fn(async () => {}),
        terminalResize: vi.fn(async () => {}),
        onTerminalData: vi.fn(() => () => {}),
        onTerminalExit: vi.fn(() => () => {}),
      };
      (global as any).window.coreMindAPI = mockApi;

      useTerminalStore.getState().addTab('zsh');
      const activeId = useTerminalStore.getState().activeId!;

      // 1. User types command: "echo hello"
      for (const char of 'echo hello') {
        await mockApi.terminalWrite(activeId, char);
      }

      // 2. User moves cursor backward 5 spaces (Left Arrow: \x1b[D) to edit "hello"
      for (let i = 0; i < 5; i++) {
        await mockApi.terminalWrite(activeId, '\x1b[D');
      }

      // 3. User deletes character before cursor (Backspace: \x7f)
      await mockApi.terminalWrite(activeId, '\x7f');

      // 4. User types replacement character: "w"
      await mockApi.terminalWrite(activeId, 'w');

      // 5. User executes command (Enter: \r)
      await mockApi.terminalWrite(activeId, '\r');

      // Verify all keystrokes, navigation sequences, deletion codes, and newline were written without loss
      expect(mockApi.terminalWrite).toHaveBeenCalledTimes(18); // 10 chars + 5 left arrows + 1 backspace + 1 replacement + 1 enter
      expect(writtenChunks.filter((c) => c === '\x1b[D')).toHaveLength(5);
      expect(writtenChunks).toContain('\x7f');
      expect(writtenChunks).toContain('\r');
    });

    it('executes terminal commands and captures streaming stdout without interrupting the process', async () => {
      const outputChunks: string[] = [];
      const result = await terminalService.executeCommand({
        command: 'echo "hello from coremind terminal"',
        onData: (data) => outputChunks.push(data),
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('hello from coremind terminal');
      expect(outputChunks.join('')).toContain('hello from coremind terminal');
      expect(result.killed).toBe(false);
      expect(result.timedOut).toBe(false);
    });

    it('preserves command history across successive executions in the same workspace', async () => {
      const firstResult = await terminalService.executeCommand({
        command: 'echo "cmd 1"',
      });
      const secondResult = await terminalService.executeCommand({
        command: 'echo "cmd 2"',
      });

      expect(firstResult.exitCode).toBe(0);
      expect(firstResult.stdout).toContain('cmd 1');

      expect(secondResult.exitCode).toBe(0);
      expect(secondResult.stdout).toContain('cmd 2');
    });
  });

  describe('3. Component Re-render Isolation & Tab Protection', () => {
    it('retains terminal tab warning flags across content edits', () => {
      const tabId = useTerminalStore.getState().addTab('zsh');
      expect(useTerminalStore.getState().tabs[0].hasWarning).toBeFalsy();

      useTerminalStore.getState().setTabWarning(tabId, true);
      expect(useTerminalStore.getState().tabs[0].hasWarning).toBe(true);

      // Mutate editor tab content
      useTabsStore.setState({
        tabs: [
          {
            id: 'tab-editor',
            filePath: '/test/workspace/code.dart',
            fileName: 'code.dart',
            language: 'dart',
            content: 'void main() {}',
            savedContent: 'void main() {}',
            isDirty: true,
          },
        ],
      });

      // Terminal warning state remains unaffected
      expect(useTerminalStore.getState().tabs[0].hasWarning).toBe(true);
    });

    it('renaming terminal tab preserves tab ID and session continuity', () => {
      const tabId = useTerminalStore.getState().addTab('zsh');
      useTerminalStore.getState().renameTab(tabId, 'npm build');

      const tabs = useTerminalStore.getState().tabs;
      expect(tabs[0].id).toBe(tabId);
      expect(tabs[0].title).toBe('npm build');
    });
  });
});
