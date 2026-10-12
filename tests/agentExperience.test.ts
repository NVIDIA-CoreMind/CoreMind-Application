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

import {
  useAIWorkspaceStore,
  parseReasoningAndContent,
  formatTaskCompletedSummary,
} from '../src/renderer/services/aiWorkspaceService';
import { useWorkspaceStore } from '../src/renderer/stores/workspaceStore';
import { useTabsStore } from '../src/renderer/stores/tabsStore';
import { changesService } from '../src/renderer/services/coremind/changes';
import { CoreMindEvent, ChangeSet } from '../src/renderer/services/coremind/types';

describe('Antigravity/Codex-Style Agent Experience Verification', () => {
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

  describe('1. Reasoning & Response Cleanliness', () => {
    it('separates <think> tags from conversational response', () => {
      const raw = '<think>I need to inspect lib/main.dart first</think>Here is the analysis of the project.';
      const { cleanContent, thoughtSummary } = parseReasoningAndContent(raw);
      expect(thoughtSummary).toBe('I need to inspect lib/main.dart first');
      expect(cleanContent).toBe('Here is the analysis of the project.');
    });

    it('separates <thought> tags from conversational response', () => {
      const raw = '<thought>\nPlanning the file creation\n</thought>\n\n# Implementation Complete\nCreated `login.dart`.';
      const { cleanContent, thoughtSummary } = parseReasoningAndContent(raw);
      expect(thoughtSummary).toContain('Planning the file creation');
      expect(cleanContent).toContain('# Implementation Complete');
      expect(cleanContent).not.toContain('<thought>');
    });

    it('formats a trustworthy task completion summary when conversational stream is empty', () => {
      const summary = formatTaskCompletedSummary({
        steps: 4,
        files_changed: ['lib/auth.dart', 'test/auth_test.dart'],
        tests_passed: 5,
        tests_failed: 0,
      });
      expect(summary).toContain('Task Completed');
      expect(summary).toContain('`lib/auth.dart`');
      expect(summary).toContain('`test/auth_test.dart`');
      expect(summary).toContain('5 tests passed');
    });
  });

  describe('2. Event Correlation & Multi-Session Isolation', () => {
    it('accepts and processes events matching the active agent_id', () => {
      const store = useAIWorkspaceStore.getState();
      store.setAgentId('agent-123');

      const matchingEvent: CoreMindEvent = {
        type: 'agent.thinking',
        agent_id: 'agent-123',
        data: { step: 2, max_steps: 5 },
        timestamp: new Date().toISOString(),
      };

      store.handleCoreMindEvent(matchingEvent);
      expect(useAIWorkspaceStore.getState().events).toHaveLength(1);
      expect(useAIWorkspaceStore.getState().agentPhase).toBe('thinking');
    });

    it('ignores events originating from a different agent_id', () => {
      const store = useAIWorkspaceStore.getState();
      useAIWorkspaceStore.setState({ agentPhase: undefined, events: [] });
      store.setAgentId('agent-active');

      const foreignEvent: CoreMindEvent = {
        type: 'agent.thinking',
        agent_id: 'agent-other',
        data: { step: 1, max_steps: 10 },
        timestamp: new Date().toISOString(),
      };

      store.handleCoreMindEvent(foreignEvent);
      expect(useAIWorkspaceStore.getState().events).toHaveLength(0);
      expect(useAIWorkspaceStore.getState().agentPhase).toBeUndefined();
    });

    it('ignores events originating from a different session_id', () => {
      useAIWorkspaceStore.setState({ activeSessionId: 'sess-active' });

      const foreignSessionEvent: CoreMindEvent = {
        type: 'tool.started',
        session_id: 'sess-other',
        data: { tool: 'grep' },
        timestamp: new Date().toISOString(),
      };

      useAIWorkspaceStore.getState().handleCoreMindEvent(foreignSessionEvent);
      expect(useAIWorkspaceStore.getState().events).toHaveLength(0);
    });

    it('accepts and processes events when agent_id is missing and task_id is present', () => {
      const store = useAIWorkspaceStore.getState();
      useAIWorkspaceStore.setState({ events: [], agentPhase: undefined });
      store.setAgentId('agent-canonical-1');

      const taskIdEvent: CoreMindEvent = {
        type: 'agent.thinking',
        task_id: 'agent-canonical-1',
        data: { step: 3, max_steps: 6 },
        timestamp: new Date().toISOString(),
      };

      store.handleCoreMindEvent(taskIdEvent);
      expect(useAIWorkspaceStore.getState().events).toHaveLength(1);
      expect(useAIWorkspaceStore.getState().agentPhase).toBe('thinking');
    });

    it('filters out events when agent_id is missing but task_id belongs to a different task', () => {
      const store = useAIWorkspaceStore.getState();
      useAIWorkspaceStore.setState({ events: [], agentPhase: undefined });
      store.setAgentId('agent-canonical-1');

      const foreignTaskIdEvent: CoreMindEvent = {
        type: 'agent.thinking',
        task_id: 'agent-other-task',
        data: { step: 1, max_steps: 5 },
        timestamp: new Date().toISOString(),
      };

      store.handleCoreMindEvent(foreignTaskIdEvent);
      expect(useAIWorkspaceStore.getState().events).toHaveLength(0);
      expect(useAIWorkspaceStore.getState().agentPhase).toBeUndefined();
    });

    it('handles agent.ai.usage metrics event and updates token state', () => {
      const store = useAIWorkspaceStore.getState();
      store.setAgentId('agent-canonical-1');

      const usageEvent: CoreMindEvent = {
        type: 'agent.ai.usage',
        agent_id: 'agent-canonical-1',
        data: { prompt_tokens: 350, completion_tokens: 120, total_tokens: 470 },
        timestamp: new Date().toISOString(),
      };
      store.handleCoreMindEvent(usageEvent);

      expect(useAIWorkspaceStore.getState().tokenUsage).toEqual({
        prompt_tokens: 350,
        completion_tokens: 120,
        total_tokens: 470,
      });
    });
  });

  describe('3. Genuine Terminal Stream Execution', () => {
    it('accurately streams command output and preserves exit code and duration', () => {
      const store = useAIWorkspaceStore.getState();
      const nowIso = new Date().toISOString();

      // 1. command.started
      store.handleCoreMindEvent({
        type: 'command.started',
        data: { command: 'flutter test' },
        timestamp: nowIso,
      });

      const termEv1 = useAIWorkspaceStore.getState().events.find((e) => e.type === 'TerminalEvent') as any;
      expect(termEv1).toBeDefined();
      expect(termEv1.command).toBe('flutter test');
      expect(termEv1.status).toBe('running');

      // 2. command.output chunks
      store.handleCoreMindEvent({
        type: 'command.output',
        data: { output: '00:01 +0: loading test\n' },
        timestamp: new Date(Date.now() + 50).toISOString(),
      });

      store.handleCoreMindEvent({
        type: 'command.output',
        data: { output: '00:02 +1: All tests passed!\n' },
        timestamp: new Date(Date.now() + 100).toISOString(),
      });

      const termEv2 = useAIWorkspaceStore.getState().events.find((e) => e.type === 'TerminalEvent') as any;
      expect(termEv2.output).toContain('00:01 +0: loading test\n00:02 +1: All tests passed!\n');

      // 3. command.completed
      store.handleCoreMindEvent({
        type: 'command.completed',
        data: { exit_code: 0, duration_ms: 1250 },
        timestamp: new Date(Date.now() + 200).toISOString(),
      });

      const termEv3 = useAIWorkspaceStore.getState().events.find((e) => e.type === 'TerminalEvent') as any;
      expect(termEv3.status).toBe('completed');
      expect(termEv3.exitCode).toBe(0);
      expect(termEv3.durationMs).toBe(1250);
    });

    it('marks command as failed on non-zero exit code', () => {
      const store = useAIWorkspaceStore.getState();

      store.handleCoreMindEvent({
        type: 'command.started',
        data: { command: 'npm run build' },
        timestamp: new Date().toISOString(),
      });

      store.handleCoreMindEvent({
        type: 'command.output',
        data: { output: 'Error: Module not found\n' },
        timestamp: new Date().toISOString(),
      });

      store.handleCoreMindEvent({
        type: 'command.completed',
        data: { exit_code: 1, duration_ms: 450 },
        timestamp: new Date().toISOString(),
      });

      const termEv = useAIWorkspaceStore.getState().events.find((e) => e.type === 'TerminalEvent') as any;
      expect(termEv.status).toBe('failed');
      expect(termEv.exitCode).toBe(1);
    });
  });

  describe('4. Real File Changes and Backend Change Set Retrieval', () => {
    it('records file creation and modification with line counts', () => {
      const store = useAIWorkspaceStore.getState();

      store.handleCoreMindEvent({
        type: 'file.created',
        data: { path: 'lib/screens/home.dart', additions: 42 },
        timestamp: new Date().toISOString(),
      });

      const tracked = useAIWorkspaceStore.getState().trackedChanges;
      expect(tracked['lib/screens/home.dart']).toBeDefined();
      expect(tracked['lib/screens/home.dart'].action).toBe('created');
      expect(tracked['lib/screens/home.dart'].additions).toBe(42);
    });

    it('loads real backend change set via changesService.getChanges', async () => {
      const mockChangeSet: ChangeSet = {
        change_id: 'cs-888',
        agent_id: 'agent-mock',
        project_path: '/test/workspace',
        created_at: new Date().toISOString(),
        files: [
          {
            path: 'lib/main.dart',
            status: 'modified' as const,
            diff: '--- a/lib/main.dart\n+++ b/lib/main.dart\n@@ -1,2 +1,3 @@\n+import "home.dart";',
            additions: 1,
            deletions: 0,
          },
        ],
      };

      vi.spyOn(changesService, 'getChanges').mockResolvedValueOnce(mockChangeSet);

      const store = useAIWorkspaceStore.getState();
      await store.loadChanges('cs-888');

      expect(changesService.getChanges).toHaveBeenCalledWith('cs-888');
      const tracked = useAIWorkspaceStore.getState().trackedChanges;
      expect(tracked['lib/main.dart']).toBeDefined();
      expect(tracked['lib/main.dart'].diff).toContain('import "home.dart";');
      expect(useAIWorkspaceStore.getState().changeId).toBe('cs-888');
    });
  });

  describe('5. Task Cancellation & Error Handling', () => {
    it('stops active task immediately and sets cancelled state without stuck spinner', () => {
      const store = useAIWorkspaceStore.getState();
      const abortCtrl = new AbortController();
      store.setAbortController(abortCtrl);
      store.setState('running');
      store.setExecutionState('editing', 'Writing files...');

      store.cancelTask();

      expect(abortCtrl.signal.aborted).toBe(true);
      expect(useAIWorkspaceStore.getState().currentState).toBe('stopped');
      expect(useAIWorkspaceStore.getState().executionState).toBe('cancelled');
      expect(useAIWorkspaceStore.getState().abortController).toBeNull();
    });

    it('handles agent.failed without triggering mock fallback', () => {
      const store = useAIWorkspaceStore.getState();
      store.setState('running');

      store.handleCoreMindEvent({
        type: 'agent.failed',
        data: { error: 'LLM token limit exceeded on server' },
        timestamp: new Date().toISOString(),
      });

      expect(useAIWorkspaceStore.getState().currentState).toBe('error');
      expect(useAIWorkspaceStore.getState().executionState).toBe('failed');
      const errEv = useAIWorkspaceStore.getState().events.find((e) => e.type === 'ErrorEvent') as any;
      expect(errEv).toBeDefined();
      expect(errEv.error).toContain('LLM token limit exceeded');
    });

    it('commits activity events and files onto assistant message when agent completes', () => {
      const store = useAIWorkspaceStore.getState();
      const asstId = 'asst-msg-1';
      store.addChatMessage({
        id: asstId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      });
      useAIWorkspaceStore.setState({ streamMessageId: asstId, activeTurnStartTime: Date.now() });

      // Add a terminal event and file change during the turn
      store.handleCoreMindEvent({
        type: 'command.started',
        data: { command: 'dart analyze' },
        timestamp: new Date().toISOString(),
      });
      store.handleCoreMindEvent({
        type: 'file.created',
        data: { path: 'lib/util.dart', lines: 15 },
        timestamp: new Date().toISOString(),
      });

      // Complete agent turn
      store.handleCoreMindEvent({
        type: 'agent.completed',
        data: { steps: 2, files_changed: ['lib/util.dart'] },
        timestamp: new Date().toISOString(),
      });

      const updatedMsg = useAIWorkspaceStore.getState().chatHistory.find((m) => m.id === asstId);
      expect(updatedMsg).toBeDefined();
      expect(updatedMsg?.activityEvents).toBeDefined();
      expect(updatedMsg?.activityEvents?.length).toBeGreaterThan(0);
      expect(updatedMsg?.filesChanged).toHaveLength(1);
      expect(updatedMsg?.filesChanged?.[0].file).toBe('lib/util.dart');
      expect(useAIWorkspaceStore.getState().currentState).toBe('completed');
    });
  });

  describe('6. Workspace Switch Safety', () => {
    it('cancels active operations and clears turn state on workspace switch', () => {
      const store = useAIWorkspaceStore.getState();
      const abortCtrl = new AbortController();
      store.setAbortController(abortCtrl);
      store.setState('running');
      store.recordFileChange('temp.dart', 'created', 10);
      store.setDraftPrompt('Work in old project');

      store.handleWorkspaceSwitch('/new/path');

      expect(abortCtrl.signal.aborted).toBe(true);
      expect(useAIWorkspaceStore.getState().currentState).toBe('idle');
      expect(useAIWorkspaceStore.getState().executionState).toBe('idle');
      expect(Object.keys(useAIWorkspaceStore.getState().trackedChanges)).toHaveLength(0);
      expect(useAIWorkspaceStore.getState().draftPrompt).toBe('');
    });
  });
});
