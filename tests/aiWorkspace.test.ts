import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Setup environment mocks for Node test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

(global as any).localStorage = storageMock;
(global as any).window = (global as any).window || {};

import { useAIWorkspaceStore } from '../src/renderer/services/aiWorkspaceService';
import { parseUnifiedDiff } from '../src/renderer/components/AIWorkspace/diffParser';
import { CoreMindClient } from '../src/renderer/services/coremind/client';
import { useTabsStore } from '../src/renderer/stores/tabsStore';
import { useWorkspaceStore } from '../src/renderer/stores/workspaceStore';

describe('AI Workspace - Antigravity Architecture & Frontend Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (global as any).localStorage.clear();
    useAIWorkspaceStore.getState().clear();
    useTabsStore.setState({ tabs: [], activeTabId: null });
    useWorkspaceStore.setState({ rootPath: '/test/workspace', rootName: 'workspace' });
  });

  afterEach(() => {
    (global as any).localStorage.clear();
  });

  describe('1. Chat & Session Management', () => {
    it('initializes with idle state and empty history', () => {
      const state = useAIWorkspaceStore.getState();
      expect(state.currentState).toBe('idle');
      expect(state.chatHistory).toEqual([]);
      expect(state.activeView).toBe('chat');
    });

    it('creates a session and adds user and assistant chat messages', () => {
      const store = useAIWorkspaceStore.getState();
      store.addChatMessage({
        id: 'msg-1',
        role: 'user',
        content: 'Create a Flutter counter app',
        timestamp: 1000,
      });

      const updated = useAIWorkspaceStore.getState();
      expect(updated.chatHistory).toHaveLength(1);
      expect(updated.chatHistory[0].content).toBe('Create a Flutter counter app');
      expect(updated.sessions).toHaveLength(1);
      expect(updated.sessions[0].title).toContain('Create a Flutter counter app');

      // Add assistant response
      store.addChatMessage({
        id: 'msg-2',
        role: 'assistant',
        content: 'Here is the Flutter implementation',
        timestamp: 2000,
      });

      expect(useAIWorkspaceStore.getState().chatHistory).toHaveLength(2);
    });

    it('switches between chat sessions and restores history cleanly', () => {
      const store = useAIWorkspaceStore.getState();
      store.addChatMessage({
        id: 'msg-s1',
        role: 'user',
        content: 'Session 1 task',
        timestamp: 1000,
      });
      const firstSessionId = useAIWorkspaceStore.getState().activeSessionId!;
      expect(firstSessionId).toBeTruthy();

      // Start new session
      store.newSession();
      expect(useAIWorkspaceStore.getState().chatHistory).toHaveLength(0);
      expect(useAIWorkspaceStore.getState().activeSessionId).toBeNull();

      // Add message in second session
      store.addChatMessage({
        id: 'msg-s2',
        role: 'user',
        content: 'Session 2 task',
        timestamp: 2000,
      });
      const secondSessionId = useAIWorkspaceStore.getState().activeSessionId!;

      // Load first session back
      store.loadSession(firstSessionId);
      expect(useAIWorkspaceStore.getState().activeSessionId).toBe(firstSessionId);
      expect(useAIWorkspaceStore.getState().chatHistory[0].content).toBe('Session 1 task');

      // Delete session
      store.deleteSession(secondSessionId);
      expect(useAIWorkspaceStore.getState().sessions.some((s) => s.id === secondSessionId)).toBe(false);
    });
  });

  describe('2. Real-Time Streaming & Token Accumulation', () => {
    it('appends streaming tokens in real time into the assistant message', () => {
      const store = useAIWorkspaceStore.getState();
      const msgId = 'stream-asst-1';

      store.appendStreamChunk(msgId, 'Hello');
      expect(useAIWorkspaceStore.getState().chatHistory[0].content).toBe('Hello');

      store.appendStreamChunk(msgId, ' world');
      expect(useAIWorkspaceStore.getState().chatHistory[0].content).toBe('Hello world');

      store.appendStreamChunk(msgId, '!');
      expect(useAIWorkspaceStore.getState().chatHistory[0].content).toBe('Hello world!');
    });

    it('streams SSE response chunks via streamChat method in CoreMindClient', async () => {
      const client = new CoreMindClient();
      const tokensReceived: string[] = [];

      // Mock SSE ReadableStream response
      const ssePayload = [
        'data: {"type": "token", "token": "Building"}\n\n',
        'data: {"type": "token", "token": " application"}\n\n',
        'data: {"type": "token", "token": "..."}\n\n',
        'data: [DONE]\n\n',
      ].join('');

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(ssePayload));
          controller.close();
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: stream,
      } as any);

      const result = await client.streamChat(
        'Build app',
        '/test/workspace',
        [],
        (token) => {
          tokensReceived.push(token);
        }
      );

      expect(tokensReceived).toEqual(['Building', ' application', '...']);
      expect(result).toBe('Building application...');
    });
  });

  describe('3. Implementation Plan & Task State Updates', () => {
    it('stores task graph and updates task states through lifecycle events', () => {
      const store = useAIWorkspaceStore.getState();

      store.setTaskGraph({
        goal: 'Implement authentication flow',
        tasks: [
          { id: 'task-1', title: 'Inspect existing auth schema', status: 'pending' },
          { id: 'task-2', title: 'Generate login controller', status: 'pending' },
          { id: 'task-3', title: 'Run tests and verify', status: 'pending' },
        ],
      });

      let tasks = useAIWorkspaceStore.getState().taskGraph!.tasks!;
      expect(tasks).toHaveLength(3);
      expect(tasks[0].status).toBe('pending');

      // Task 1 started
      store.updateTaskNode('task-1', { status: 'in_progress' });
      tasks = useAIWorkspaceStore.getState().taskGraph!.tasks!;
      expect(tasks[0].status).toBe('in_progress');

      // Task 1 completed
      store.updateTaskNode('task-1', { status: 'completed' });
      // Task 2 started
      store.updateTaskNode('task-2', { status: 'in_progress' });
      tasks = useAIWorkspaceStore.getState().taskGraph!.tasks!;
      expect(tasks[0].status).toBe('completed');
      expect(tasks[1].status).toBe('in_progress');

      // Task 2 completed
      store.updateTaskNode('task-2', { status: 'completed' });
      // Task 3 failed
      store.updateTaskNode('task-3', { status: 'failed', error: 'Verification exited with code 1' });
      tasks = useAIWorkspaceStore.getState().taskGraph!.tasks!;
      expect(tasks[2].status).toBe('failed');
      expect(tasks[2].error).toBe('Verification exited with code 1');
    });
  });

  describe('4. File Changes & Syntax-Aware Diff Parsing', () => {
    it('records file changes with actions and diffs', () => {
      const store = useAIWorkspaceStore.getState();

      store.recordFileChange('src/login.ts', 'created', 25, 0, '@@ -0,0 +1,25 @@\n+export const Login = () => {};');
      store.recordFileChange('src/app.ts', 'modified', 10, 2, '@@ -1,5 +1,13 @@\n-import old from "old";\n+import new from "new";');

      const tracked = useAIWorkspaceStore.getState().trackedChanges;
      expect(tracked['src/login.ts']).toBeDefined();
      expect(tracked['src/login.ts'].action).toBe('created');
      expect(tracked['src/login.ts'].additions).toBe(25);

      expect(tracked['src/app.ts']).toBeDefined();
      expect(tracked['src/app.ts'].action).toBe('modified');
      expect(tracked['src/app.ts'].additions).toBe(10);
      expect(tracked['src/app.ts'].deletions).toBe(2);
    });

    it('parses unified diffs into structured hunks and lines with line numbers', () => {
      const rawDiff = [
        '--- a/src/utils.ts',
        '+++ b/src/utils.ts',
        '@@ -1,4 +1,5 @@',
        ' import path from "path";',
        '-export function oldUtil() {}',
        '+export function newUtil() {}',
        '+export function helper() {}',
        ' export const version = "1.0";',
      ].join('\n');

      const parsed = parseUnifiedDiff(rawDiff, 'src/utils.ts');
      expect(parsed.filePath).toBe('src/utils.ts');
      expect(parsed.hunks).toHaveLength(1);
      expect(parsed.additions).toBe(2);
      expect(parsed.deletions).toBe(1);

      const hunk = parsed.hunks[0];
      expect(hunk.lines).toHaveLength(5);
      expect(hunk.lines[0]).toEqual({
        type: 'context',
        content: 'import path from "path";',
        oldLineNumber: 1,
        newLineNumber: 1,
      });
      expect(hunk.lines[1]).toEqual({
        type: 'delete',
        content: 'export function oldUtil() {}',
        oldLineNumber: 2,
      });
      expect(hunk.lines[2]).toEqual({
        type: 'add',
        content: 'export function newUtil() {}',
        newLineNumber: 2,
      });
      expect(hunk.lines[3]).toEqual({
        type: 'add',
        content: 'export function helper() {}',
        newLineNumber: 3,
      });
    });
  });

  describe('5. Unsaved Editor Changes Protection & Safe Buffer Reloading', () => {
    it('protects dirty tabs from being overwritten during file refresh', async () => {
      const store = useAIWorkspaceStore.getState();

      // Open a clean tab and a dirty tab in tabsStore
      useTabsStore.setState({
        tabs: [
          {
            id: '/test/workspace/clean.ts',
            filePath: '/test/workspace/clean.ts',
            fileName: 'clean.ts',
            language: 'typescript',
            content: 'original clean',
            savedContent: 'original clean',
            isDirty: false,
          },
          {
            id: '/test/workspace/dirty.ts',
            filePath: '/test/workspace/dirty.ts',
            fileName: 'dirty.ts',
            language: 'typescript',
            content: 'user unsaved edit in progress',
            savedContent: 'original clean',
            isDirty: true, // User has unsaved edits!
          },
        ],
        activeTabId: '/test/workspace/clean.ts',
      });

      // Mock window.coreMindAPI.readFile
      window.coreMindAPI = {
        ...window.coreMindAPI,
        readFile: vi.fn().mockImplementation(async (fullPath: string) => {
          if (fullPath.includes('clean.ts')) {
            return { success: true, data: 'new external content for clean' };
          }
          return { success: true, data: 'external content on disk' };
        }),
      } as any;

      await store.safeRefreshEditorBuffers(['clean.ts', 'dirty.ts'], '/test/workspace');

      const tabs = useTabsStore.getState().tabs;
      const cleanTab = tabs.find((t) => t.fileName === 'clean.ts')!;
      const dirtyTab = tabs.find((t) => t.fileName === 'dirty.ts')!;

      // Clean tab reloaded with new content
      expect(cleanTab.content).toBe('new external content for clean');
      // Dirty tab was PROTECTED from overwrite!
      expect(dirtyTab.content).toBe('user unsaved edit in progress');
      expect(dirtyTab.isDirty).toBe(true);
    });
  });

  describe('6. Cancellation & Stop Generation', () => {
    it('cancels active operations via AbortController and transitions state to stopped', () => {
      const store = useAIWorkspaceStore.getState();
      const controller = new AbortController();

      store.setAbortController(controller);
      store.setState('running');
      expect(useAIWorkspaceStore.getState().currentState).toBe('running');

      store.cancelRequest();
      expect(controller.signal.aborted).toBe(true);
      expect(useAIWorkspaceStore.getState().currentState).toBe('stopped');
    });
  });

  describe('7. View Switching & Mode Control', () => {
    it('switches between chat, plan, activity, and changes views', () => {
      const store = useAIWorkspaceStore.getState();
      expect(store.activeView).toBe('chat');

      store.setActiveView('plan');
      expect(useAIWorkspaceStore.getState().activeView).toBe('plan');

      store.setActiveView('activity');
      expect(useAIWorkspaceStore.getState().activeView).toBe('activity');

      store.setActiveView('changes');
      expect(useAIWorkspaceStore.getState().activeView).toBe('changes');
    });

    it('toggles between agent and chat modes', () => {
      const store = useAIWorkspaceStore.getState();
      expect(store.agentMode).toBe('agent');

      store.setAgentMode('chat');
      expect(useAIWorkspaceStore.getState().agentMode).toBe('chat');
    });
  });
});
