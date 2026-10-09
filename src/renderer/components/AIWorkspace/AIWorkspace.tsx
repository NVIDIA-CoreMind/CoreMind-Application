import React, { useCallback, useEffect } from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { PromptComposer } from './PromptComposer';
import { ChatThread } from './ChatThread';
import { ImplementationPlan } from './ImplementationPlan';
import { ActivityTimeline } from './ActivityTimeline';
import { DiffViewer } from './DiffViewer';
import { ChatHistory } from './ChatHistory';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useThemeStore } from '../../stores/themeStore';
import { coremindClient } from '../../services/coremind/client';
import { coremindWs } from '../../services/coremind/websocket';
import { agentService } from '../../services/coremind/agent';
import { extractToolCalls, executeToolCalls } from '../../services/aiToolExecution';
import { TaskNode } from '../../types/aiWorkspace';

export const AIWorkspace: React.FC = () => {
  const {
    currentState,
    setState,
    setAbortController,
    addChatMessage,
    appendStreamChunk,
    chatHistory,
    activeView,
    agentMode,
    setAgentId,
    setTaskGraph,
    updateTaskNode,
    recordFileChange,
    setChangeId,
    setPendingQuestion,
    setPendingApproval,
    safeRefreshEditorBuffers,
    addEvent,
    updateEvent,
  } = useAIWorkspaceStore();

  const { rootPath } = useWorkspaceStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Real-time backend event subscriptions via WebSocket (/ws)
  useEffect(() => {
    coremindWs.connect();

    const unsubAny = coremindWs.onAny((event) => {
      const store = useAIWorkspaceStore.getState();
      const currentAgentId = store.agentId;
      const now = Date.now();

      // Filter events if targeted to a different agent
      if (currentAgentId && event.agent_id && event.agent_id !== currentAgentId) {
        return;
      }

      switch (event.type) {
        case 'agent.started': {
          store.setState('running');
          store.setAgentPhase('working', event.data?.task || 'Starting agent task');
          addEvent({
            id: `evt-started-${now}`,
            type: 'AgentStartedEvent',
            task: event.data?.task,
            projectPath: event.data?.project_path,
            timestamp: now,
          });
          break;
        }

        case 'agent.planning': {
          store.setAgentPhase('planning', 'Constructing implementation plan...');
          addEvent({
            id: `evt-planning-${now}`,
            type: 'ThoughtEvent',
            summary: 'Constructing implementation plan and analyzing repository context...',
            durationMs: 0,
            timestamp: now,
          });
          break;
        }

        case 'plan.created': {
          const rawNodes: TaskNode[] =
            event.data?.nodes ||
            event.data?.tasks ||
            event.data?.task_graph?.tasks ||
            event.data?.task_graph?.nodes ||
            [];
          const graph = event.data?.task_graph || {
            goal: event.data?.goal,
            tasks: rawNodes,
            nodes: rawNodes,
          };

          setTaskGraph(graph);
          store.setAgentPhase('working', `Executing plan (${rawNodes.length} tasks)`);
          addEvent({
            id: `evt-plan-${now}`,
            type: 'PlanCreatedEvent',
            goal: event.data?.goal,
            tasks: rawNodes,
            timestamp: now,
          });
          break;
        }

        case 'task.started': {
          const taskId = event.data?.task_id;
          const title = event.data?.title || taskId;
          if (taskId) {
            updateTaskNode(taskId, { status: 'in_progress' });
          }
          store.setAgentPhase('working', title);
          addEvent({
            id: `evt-task-start-${now}`,
            type: 'TaskProgressEvent',
            taskId: taskId || `task-${now}`,
            title: title || 'Subtask',
            status: 'in_progress',
            timestamp: now,
          });
          break;
        }

        case 'task.completed': {
          const taskId = event.data?.task_id;
          const title = event.data?.title || taskId;
          if (taskId) {
            updateTaskNode(taskId, { status: 'completed', result: event.data?.result });
          }
          addEvent({
            id: `evt-task-done-${now}`,
            type: 'TaskProgressEvent',
            taskId: taskId || `task-${now}`,
            title: title || 'Subtask',
            status: 'completed',
            result: event.data?.result,
            timestamp: now,
          });
          break;
        }

        case 'agent.thinking': {
          store.setAgentPhase('thinking', `Step ${event.data?.step || 1} of ${event.data?.max_steps || '...'}`);
          addEvent({
            id: `evt-thought-${now}`,
            type: 'ThoughtEvent',
            summary: `Reasoning step ${event.data?.step || 1}...`,
            durationMs: 0,
            step: event.data?.step,
            maxSteps: event.data?.max_steps,
            timestamp: now,
          });
          break;
        }

        case 'agent.ai.token': {
          const chunk = event.data?.token || '';
          if (chunk) {
            const streamId = store.streamMessageId || `asst-stream-${now}`;
            appendStreamChunk(streamId, chunk);
          }
          break;
        }

        case 'tool.started': {
          const tool = event.data?.tool || 'tool';
          const query = event.data?.args?.query || event.data?.args?.path;
          if (/search|grep|find|read|scan|list/i.test(tool)) {
            store.setAgentPhase('searching', query || tool);
          } else {
            store.setAgentPhase('working', `Tool: ${tool}`);
          }
          addEvent({
            id: `evt-tool-${now}`,
            type: 'ToolCallEvent',
            tool,
            args: event.data?.args || {},
            timestamp: now,
          });
          break;
        }

        case 'tool.completed': {
          addEvent({
            id: `evt-tool-done-${now}`,
            type: 'ToolCallEvent',
            tool: event.data?.tool || 'tool',
            args: {},
            result: event.data?.result,
            success: event.data?.success !== false,
            timestamp: now,
          });
          break;
        }

        case 'file.read': {
          const path = event.data?.path || '';
          addEvent({
            id: `evt-read-${now}`,
            type: 'FileReadEvent',
            file: path,
            timestamp: now,
          });
          break;
        }

        case 'file.created':
        case 'file.changed':
        case 'file.deleted': {
          const path = event.data?.path || event.data?.file || '';
          const action = event.type === 'file.created' ? 'created' : event.type === 'file.deleted' ? 'deleted' : 'modified';
          if (path) {
            recordFileChange(path, action, event.data?.additions || event.data?.lines, event.data?.deletions);
            if (rootPath) {
              void safeRefreshEditorBuffers([path], rootPath);
            }
          }
          addEvent({
            id: `evt-file-${now}`,
            type: 'FileChangedEvent',
            file: path,
            action,
            lines: event.data?.lines,
            additions: event.data?.additions,
            deletions: event.data?.deletions,
            timestamp: now,
          });
          break;
        }

        case 'diff.created': {
          const path = event.data?.path || '';
          if (path) {
            recordFileChange(path, 'modified', event.data?.additions, event.data?.deletions, event.data?.diff);
          }
          addEvent({
            id: `evt-diff-${now}`,
            type: 'DiffCreatedEvent',
            path,
            diff: event.data?.diff,
            additions: event.data?.additions || 0,
            deletions: event.data?.deletions || 0,
            timestamp: now,
          });
          break;
        }

        case 'command.started': {
          store.setAgentPhase('working', `Running: ${event.data?.command || 'shell'}`);
          addEvent({
            id: `evt-cmd-${now}`,
            type: 'TerminalEvent',
            command: event.data?.command || '',
            output: '',
            status: 'running',
            timestamp: now,
          });
          break;
        }

        case 'command.output': {
          const out = event.data?.output || '';
          const currentEvents = useAIWorkspaceStore.getState().events;
          const lastCmd = [...currentEvents].reverse().find((e) => e.type === 'TerminalEvent') as any;
          if (lastCmd) {
            updateEvent(lastCmd.id, { output: (lastCmd.output || '') + out });
          }
          break;
        }

        case 'command.completed': {
          const currentEvents = useAIWorkspaceStore.getState().events;
          const lastCmd = [...currentEvents].reverse().find((e) => e.type === 'TerminalEvent') as any;
          if (lastCmd) {
            updateEvent(lastCmd.id, {
              status: event.data?.exit_code === 0 ? 'completed' : 'failed',
              exitCode: event.data?.exit_code,
              durationMs: event.data?.duration_ms,
            });
          }
          break;
        }

        case 'verification.started': {
          store.setAgentPhase('verifying', `Verification attempt ${event.data?.attempt || 1}...`);
          addEvent({
            id: `evt-verify-${now}`,
            type: 'TestEvent',
            testName: `Verification (Attempt ${event.data?.attempt || 1})`,
            status: 'running',
            attempt: event.data?.attempt,
            timestamp: now,
          });
          break;
        }

        case 'verification.passed': {
          addEvent({
            id: `evt-verify-pass-${now}`,
            type: 'TestEvent',
            testName: 'Verification Checks',
            status: 'passed',
            command: event.data?.command,
            timestamp: now,
          });
          break;
        }

        case 'verification.failed': {
          store.setAgentPhase('working', 'Self-healing / fixing test issues...');
          addEvent({
            id: `evt-verify-fail-${now}`,
            type: 'TestEvent',
            testName: 'Verification Failure',
            status: 'failed',
            error: event.data?.error || `Command exited with code ${event.data?.exit_code}`,
            exitCode: event.data?.exit_code,
            timestamp: now,
          });
          break;
        }

        case 'agent.waiting_for_user': {
          store.setState('waiting');
          setPendingQuestion({
            question_id: event.data?.question_id,
            question: event.data?.question,
            options: event.data?.options,
          });
          break;
        }

        case 'agent.approval.required': {
          store.setState('waiting');
          setPendingApproval({
            approval_id: event.data?.approval_id,
            tool: event.data?.tool,
            args: event.data?.args || {},
            description: event.data?.description,
          });
          break;
        }

        case 'agent.completed': {
          store.setState('completed');
          if (event.data?.change_id) {
            setChangeId(event.data.change_id);
          }
          if (event.data?.task_graph) {
            setTaskGraph(event.data.task_graph);
          }
          if (Array.isArray(event.data?.files_changed) && rootPath) {
            void safeRefreshEditorBuffers(event.data.files_changed, rootPath);
          }
          addEvent({
            id: `evt-complete-${now}`,
            type: 'CompletedEvent',
            summary: `Agent completed execution in ${event.data?.steps || 0} steps.`,
            filesChanged: event.data?.files_changed || [],
            tests: [],
            changeId: event.data?.change_id,
            timestamp: now,
          });
          break;
        }

        case 'agent.failed':
        case 'agent.error': {
          store.setState('error');
          addEvent({
            id: `evt-err-${now}`,
            type: 'ErrorEvent',
            error: event.data?.error || 'Agent encountered an error.',
            timestamp: now,
          });
          break;
        }

        case 'agent.stopped': {
          store.setState('stopped');
          break;
        }
      }
    });

    return () => {
      unsubAny();
    };
  }, [rootPath, setTaskGraph, updateTaskNode, recordFileChange, setChangeId, setPendingQuestion, setPendingApproval, safeRefreshEditorBuffers, addEvent, updateEvent, appendStreamChunk]);

  // Main Prompt Submission Handler
  const handlePromptSubmit = useCallback(async (prompt: string) => {
    if (!prompt.trim() || currentState === 'running') return;

    if (!rootPath) {
      alert('Please open a workspace folder before executing AI tasks.');
      return;
    }

    const abortController = new AbortController();
    setAbortController(abortController);
    setState('running');

    // Capture history prior to adding the new prompt
    const historyToSend = chatHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add user message to chat
    const userMsgId = `user-${Date.now()}`;
    addChatMessage({
      id: userMsgId,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    });

    // Check if user specifically requested agent or chat mode
    const isAutonomousAgent =
      agentMode === 'agent' ||
      prompt.startsWith('/agent ') ||
      prompt.startsWith('/autonomous ') ||
      prompt.startsWith('/plan ');

    const cleanPrompt = prompt.replace(/^\/(?:agent|autonomous|plan)\s+/, '');

    // 1. Autonomous Agent Execution Path (/v1/agent/run)
    if (isAutonomousAgent) {
      try {
        useAIWorkspaceStore.getState().setAgentPhase('planning', 'Initializing autonomous agent...');
        const runRes = await agentService.run(cleanPrompt, rootPath);

        if (runRes?.agent_id) {
          setAgentId(runRes.agent_id);
        }

        if (abortController.signal.aborted) {
          return;
        }
      } catch (agentErr: any) {
        if (!abortController.signal.aborted) {
          // If agent service fails (e.g. backend fallback), try streaming chat
          console.warn('Agent start error, falling back to streaming chat:', agentErr);
          await runStreamingChat(cleanPrompt, historyToSend, abortController);
        }
      }
      return;
    }

    // 2. Direct Streaming Assistant Chat Path (/v1/ai/chat/stream SSE)
    await runStreamingChat(cleanPrompt, historyToSend, abortController);
  }, [currentState, rootPath, chatHistory, agentMode, addChatMessage, setAbortController, setState, setAgentId]);

  const runStreamingChat = async (
    promptText: string,
    history: any[],
    abortController: AbortController
  ) => {
    const assistantMsgId = `asst-${Date.now()}`;
    useAIWorkspaceStore.getState().setAgentPhase('thinking', 'Streaming AI response...');

    try {
      const fullResponse = await coremindClient.streamChat(
        promptText,
        rootPath || '.',
        history,
        (token) => {
          appendStreamChunk(assistantMsgId, token);
        },
        abortController.signal
      );

      if (abortController.signal.aborted) return;

      // Extract and execute tool calls in response if present
      const { toolCalls, formattedText } = extractToolCalls(fullResponse);
      const filesChangedDetails: any[] = [];

      if (toolCalls.length > 0 && rootPath) {
        useAIWorkspaceStore.getState().setAgentPhase('working', 'Executing code updates...');
        await executeToolCalls(toolCalls, rootPath);
        for (const tc of toolCalls) {
          if (tc.path && typeof tc.content === 'string') {
            const cleanPath = tc.path.replace(/^\/+/, '').trim();
            filesChangedDetails.push({
              file: cleanPath,
              action: 'created',
              lines: tc.content.split('\n').length,
            });
            recordFileChange(cleanPath, 'created', tc.content.split('\n').length);
          }
        }
        if (filesChangedDetails.length > 0) {
          void safeRefreshEditorBuffers(filesChangedDetails.map((f) => f.file), rootPath);
        }
      }

      // Update message with formatted text & file changes
      useAIWorkspaceStore.setState((s) => ({
        chatHistory: s.chatHistory.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: formattedText || m.content,
                filesChanged: filesChangedDetails.length > 0 ? filesChangedDetails : undefined,
              }
            : m
        ),
      }));

      setState('completed');
    } catch (streamErr: any) {
      if (!abortController.signal.aborted) {
        console.error('Streaming chat failed:', streamErr);
        addChatMessage({
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `**Error:** ${streamErr.message || 'Failed to complete AI request.'}`,
          timestamp: Date.now(),
        });
        setState('error');
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {/* Header with View Tabs */}
      <WorkspaceHeader />

      {/* Main Active Panel View */}
      <div style={{ flex: 1, overflowY: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {activeView === 'chat' && <ChatThread />}
        {activeView === 'plan' && <ImplementationPlan />}
        {activeView === 'activity' && <ActivityTimeline />}
        {activeView === 'changes' && <DiffViewer />}

        {currentState === 'stopped' && activeView === 'chat' && (
          <div
            style={{
              margin: '12px 14px',
              padding: '10px 12px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
            }}
          >
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
              Execution Stopped
            </strong>
            The active operation was cancelled.
          </div>
        )}
      </div>

      {/* Bottom Composer */}
      <div
        style={{
          padding: '0 12px 12px 12px',
          backgroundColor: 'var(--bg-app)',
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
