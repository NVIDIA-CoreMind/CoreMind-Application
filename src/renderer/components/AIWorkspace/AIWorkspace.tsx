import React, { useCallback, useEffect } from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { PromptComposer } from './PromptComposer';
import { ChatThread } from './ChatThread';
import { ChatHistory } from './ChatHistory';
import { FileChangesCard } from './FileChangesCard';
import { ApprovalCard } from './ApprovalCard';
import {
  useAIWorkspaceStore,
  subscribeFileChanges,
  subscribeChangesReset,
  subscribeFileRemoved,
} from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useFilesStore } from '../../stores/filesStore';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { useAgentStore } from '../../stores/agentStore';
import { coremindWs } from '../../services/coremind/websocket';
import { TerminalEvent } from '../../types/aiWorkspace';
import { getAITheme } from './themeTokens';

export const AIWorkspace: React.FC = () => {
  const currentState = useAIWorkspaceStore((s) => s.currentState);
  const activeView = useAIWorkspaceStore((s) => s.activeView);
  const trackedChanges = useAIWorkspaceStore((s) => s.trackedChanges);
  const pendingApproval = useAIWorkspaceStore((s) => s.pendingApproval);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';

  // Global WebSocket listener initialization for CoreMind backend
  useEffect(() => {
    coremindWs.connect();
    useAIWorkspaceStore.getState().initWsListeners();
  }, []);

  // Bridge file change and reset events to legacy agentStore for Monaco editor gutter decorations
  useEffect(() => {
    const unsubFiles = subscribeFileChanges((cleanPath, action, _additions, _deletions, diff) => {
      try {
        useAgentStore.getState().recordFileEvent((action as any) || 'modified', cleanPath, { diff });
      } catch {}
    });
    const unsubRemoved = subscribeFileRemoved((filePath) => {
      try {
        const agentTracked = { ...useAgentStore.getState().trackedChanges };
        delete agentTracked[filePath];
        useAgentStore.setState({ trackedChanges: agentTracked });
      } catch {}
    });
    const unsubReset = subscribeChangesReset(() => {
      try {
        useAgentStore.setState({ activeChangeId: null, changeSet: null, trackedChanges: {} });
      } catch {}
    });
    return () => {
      unsubFiles();
      unsubRemoved();
      unsubReset();
    };
  }, []);

  // Desktop Execution Engine Stream Events via IPC (fallback/desktop runner)
  useEffect(() => {
    if (!window.coreMindAPI?.onAgentStreamEvent) return;

    const unsub = window.coreMindAPI.onAgentStreamEvent((event) => {
      const store = useAIWorkspaceStore.getState();
      const now = Date.now();

      switch (event.type) {
        case 'explanation': {
          store.setExecutionState('thinking', event.text);
          const asstId = store.streamMessageId || `asst-stream-${now}`;
          store.appendStreamChunk(asstId, event.text + '\n\n');
          store.addEvent({
            id: `evt-thought-${now}`,
            type: 'ThoughtEvent',
            summary: event.text,
            durationMs: 0,
            timestamp: now,
          });
          break;
        }

        case 'thought': {
          store.setExecutionState('thinking', event.text);
          store.addEvent({
            id: `evt-thought-${now}`,
            type: 'ThoughtEvent',
            summary: event.text,
            durationMs: 0,
            timestamp: now,
          });
          break;
        }

        case 'status': {
          const step = event.step;
          const text = event.text;
          if (/search|grep|find|scan|read|detect|inspect/i.test(text)) {
            store.setExecutionState('inspecting', text);
          } else if (step === 'validate' || /test|analyze|verify/i.test(text)) {
            store.setExecutionState('testing', text);
          } else if (/create|write|edit|generate|modify/i.test(text)) {
            store.setExecutionState('editing', text);
          } else if (/terminal|command|run|shell/i.test(text)) {
            store.setExecutionState('running_command', text);
          } else {
            store.setExecutionState('thinking', text);
          }
          break;
        }

        case 'tool_start': {
          if (event.tool === 'terminal') {
            const cmd = (event.args?.command as string) || '';
            store.setExecutionState('running_command', cmd ? `$ ${cmd}` : 'Running terminal command');
            store.addEvent({
              id: `evt-term-${now}`,
              type: 'TerminalEvent',
              command: cmd,
              output: '',
              status: 'running',
              timestamp: now,
            });
            // Do not force-open the bottom IDE terminal panel; commands stream inline in the chat timeline
          } else if (/search|grep|find|read|scan/i.test(event.tool)) {
            store.setExecutionState('inspecting', event.tool);
          } else if (/create|write|edit/i.test(event.tool)) {
            store.setExecutionState('editing', event.tool);
          } else {
            store.setExecutionState('thinking', event.tool);
          }
          break;
        }

        case 'terminal_output': {
          const currentEvents = useAIWorkspaceStore.getState().events;
          const lastCmd = [...currentEvents].reverse().find((e) => e.type === 'TerminalEvent') as any;
          if (lastCmd) {
            store.updateEvent(lastCmd.id, { output: (lastCmd.output || '') + event.data });
          }
          break;
        }

        case 'terminal_command_end': {
          const currentEvents = useAIWorkspaceStore.getState().events;
          const lastCmd = [...currentEvents].reverse().find((e) => e.type === 'TerminalEvent') as any;
          if (lastCmd) {
            store.updateEvent(lastCmd.id, {
              status: event.exitCode === 0 ? 'completed' : 'failed',
              exitCode: event.exitCode,
            });
          }
          break;
        }

        case 'file_change': {
          const filePath = event.file;
          const action = event.action || 'created';
          const fileName = filePath.split('/').pop() || filePath;
          store.setExecutionState('editing', `${action === 'created' ? 'Created' : 'Updated'} ${fileName}`);
          store.recordFileChange(filePath, action, event.lines, event.deletions);
          store.addEvent({
            id: `evt-file-${now}`,
            type: 'FileChangedEvent',
            file: filePath,
            action,
            lines: event.lines,
            additions: event.lines,
            deletions: event.deletions,
            timestamp: now,
          });

          if (rootPath) {
            void store.safeRefreshEditorBuffers([filePath], rootPath);
            const fullPath = filePath.startsWith('/') ? filePath : `${rootPath}/${filePath}`;
            void useTabsStore.getState().openFile(fullPath, fileName, rootPath);
            void useFilesStore.getState().loadWorkspaceTree(rootPath);
          }
          break;
        }

        case 'file_read': {
          const fileName = event.file.split('/').pop() || event.file;
          store.setExecutionState('inspecting', `Reading ${fileName}`);
          store.addEvent({
            id: `evt-read-${now}`,
            type: 'FileReadEvent',
            file: event.file,
            startLine: event.startLine,
            endLine: event.endLine,
            timestamp: now,
          });
          break;
        }

        case 'search': {
          store.setExecutionState('inspecting', `Searched: ${event.query}`);
          store.addEvent({
            id: `evt-search-${now}`,
            type: 'ToolCallEvent',
            tool: 'search',
            args: { query: event.query },
            result: event.resultsCount !== undefined ? new Array(event.resultsCount).fill(1) : [1],
            timestamp: now,
          });
          break;
        }

        case 'test_result': {
          store.setExecutionState('testing', `${event.testName}: ${event.passed ? 'Passed' : 'Failed'}`);
          store.addEvent({
            id: `evt-test-${now}`,
            type: 'TestEvent',
            testName: event.testName,
            status: event.passed ? 'passed' : 'failed',
            error: event.message,
            timestamp: now,
          });
          break;
        }

        case 'complete': {
          store.setExecutionState('completed', event.summary);
          const currentEvents = useAIWorkspaceStore.getState().events;
          const startTime = store.activeTurnStartTime || 0;
          const turnEvents = currentEvents.filter(
            (e) => e.timestamp >= startTime - 2000
          );
          const turnTermEvents = turnEvents.filter(
            (e): e is TerminalEvent => e.type === 'TerminalEvent'
          );
          const streamId = store.streamMessageId;
          if (streamId) {
            useAIWorkspaceStore.setState((s) => ({
              chatHistory: s.chatHistory.map((m) =>
                m.id === streamId
                  ? {
                      ...m,
                      content: (m.content ? m.content + '\n\n' : '') + event.summary,
                      filesChanged: event.filesChanged?.map((f) => ({
                        file: f.file,
                        action: f.action || 'created',
                        lines: f.lines,
                      })),
                      terminalEvents: turnTermEvents.length > 0 ? turnTermEvents : undefined,
                      activityEvents: turnEvents.length > 0 ? turnEvents : undefined,
                    }
                  : m
              ),
            }));
          }
          break;
        }

        case 'error': {
          store.setExecutionState('failed', event.message);
          store.addEvent({
            id: `evt-err-${now}`,
            type: 'ErrorEvent',
            error: event.message,
            timestamp: now,
          });
          break;
        }
      }
    });

    return () => {
      unsub();
    };
  }, [rootPath]);

  // Main Prompt Submission Handler delegating cleanly to service store
  const handlePromptSubmit = useCallback(async (prompt: string) => {
    await useAIWorkspaceStore.getState().submitPrompt(prompt);
  }, []);

  const tokens = getAITheme(isDark);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: tokens.bgMain,
        color: tokens.textPrimary,
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background-color 0.15s ease, color 0.15s ease',
      }}
    >
      {/* Header with View Tabs */}
      <WorkspaceHeader />

      {/* Main Active Panel View */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', backgroundColor: tokens.bgMain }}>
        <ChatThread />
      </div>

      {/* Docked Approval Card - pinned at bottom, right above the chat composer like Antigravity */}
      {pendingApproval && (
        <div style={{ padding: '0 12px 8px 12px', flexShrink: 0, zIndex: 10 }}>
          <ApprovalCard />
        </div>
      )}

      {/* Optional file-change summary and review controls (only when actual changes exist) */}
      {activeView === 'chat' && Object.keys(trackedChanges).length > 0 && (
        <div style={{ padding: '0 12px 6px 12px', flexShrink: 0 }}>
          <FileChangesCard
            files={Object.values(trackedChanges)}
            isRealtime={currentState === 'running'}
          />
        </div>
      )}

      {/* Bottom Composer */}
      <div
        style={{
          padding: '0 12px 12px 12px',
          backgroundColor: tokens.bgMain,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <PromptComposer onSubmit={handlePromptSubmit} />
      </div>

      {/* History Drawer Overlay */}
      <ChatHistory />
    </div>
  );
};
