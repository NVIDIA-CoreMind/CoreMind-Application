import React, { useCallback, useEffect } from 'react';
import { WorkspaceHeader } from './WorkspaceHeader';
import { PromptComposer } from './PromptComposer';
import { useAIWorkspaceStore, FileChangeInfo } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useFilesStore } from '../../stores/filesStore';
import { useTabsStore } from '../../stores/tabsStore';
import { coremindClient } from '../../services/coremind-client';
import { coremindWs } from '../../services/coremind/websocket';
import { ChatThread } from './ChatThread';
import { ChatHistory } from './ChatHistory';
import { useThemeStore } from '../../stores/themeStore';

import { extractToolCalls, executeToolCalls } from '../../services/aiToolExecution';
import { useTerminalStore } from '../../stores/terminalStore';

export const AIWorkspace: React.FC = () => {
  const { currentState, setState, setAbortController, addChatMessage, chatHistory } = useAIWorkspaceStore();
  const { rootPath } = useWorkspaceStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Subscribe to backend WebSocket events for live streaming status
  useEffect(() => {
    coremindWs.connect();

    const unsubTool = coremindWs.on('tool.started', (event) => {
      useAIWorkspaceStore.getState().addEvent({
        id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'ToolCallEvent',
        tool: event.data?.tool || 'tool',
        args: event.data?.args || {},
        timestamp: Date.now(),
      });
    });

    const unsubThinking = coremindWs.on('agent.thinking', (event) => {
      useAIWorkspaceStore.getState().addEvent({
        id: `thought-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'ThoughtEvent',
        summary: event.data?.phase || 'thinking',
        durationMs: 0,
        timestamp: Date.now(),
      });
    });

    const unsubFileChanged = coremindWs.on('file.changed', async (event) => {
      if (event.data?.file && rootPath) {
        const filePath = event.data.file;
        let linesCount = event.data.lines;

        if (!linesCount && window.coreMindAPI?.readFile) {
          try {
            const cleanPath = filePath.replace(/^\/+/, '').trim();
            const fullPath = filePath.startsWith('/') ? filePath : `${rootPath}/${cleanPath}`;
            const readRes = await window.coreMindAPI.readFile(fullPath, rootPath);
            if (readRes.success && typeof readRes.data === 'string') {
              linesCount = readRes.data.split('\n').length;
            }
          } catch {
            // ignore
          }
        }

        useAIWorkspaceStore.getState().addEvent({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'FileChangedEvent',
          file: filePath,
          action: event.data.action || 'created',
          lines: linesCount,
          additions: event.data.additions,
          timestamp: Date.now(),
        });
        useFilesStore.getState().loadWorkspaceTree(rootPath).catch(() => {});
      }
    });

    const unsubApproval = coremindWs.on('approval.required', (event) => {
      if (event.data?.approval_id) {
        coremindWs.approve(event.data.approval_id);
      }
    });

    return () => {
      unsubTool();
      unsubThinking();
      unsubFileChanged();
      unsubApproval();
    };
  }, [rootPath]);

  const handleStartMock = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    if (!rootPath) {
      alert('Please open a workspace first to use the chat.');
      return;
    }

    // Capture the history BEFORE adding the new user message
    // This prevents the user message from being sent both as `query` and inside `history`
    const historyToSend = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const userMessageId = Date.now().toString();
    addChatMessage({
      id: userMessageId,
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    });
    
    // Reset events for this execution turn
    useAIWorkspaceStore.setState({ events: [] });
    setState('running');
    
    const abortController = new AbortController();
    setAbortController(abortController);
    
    try {
      const response = await coremindClient.chatWithTools(prompt, rootPath, historyToSend);
      
      if (abortController.signal.aborted) {
        return;
      }

      if (response.status === 'ok') {
        const rawResponse = response.response || 'Success, but no response provided.';
        const { toolCalls, formattedText } = extractToolCalls(rawResponse);
        const filesChangedDetails: FileChangeInfo[] = [];

        if (toolCalls.length > 0) {
          await executeToolCalls(toolCalls, rootPath);
          for (const tc of toolCalls) {
            if (tc.path && typeof tc.content === 'string') {
              const cleanPath = tc.path.replace(/^\/+/, '').trim();
              filesChangedDetails.push({
                file: cleanPath,
                action: 'created',
                lines: tc.content.split('\n').length,
              });
            }
          }
        }

        // Handle files modified or created on disk by backend agent
        const backendFiles: string[] = Array.isArray(response.files_changed) ? response.files_changed : [];
        if (backendFiles.length > 0 && rootPath) {
          try {
            await useFilesStore.getState().loadWorkspaceTree(rootPath);
          } catch (e) {
            console.warn('Failed to refresh workspace tree:', e);
          }

          const tabsState = useTabsStore.getState();
          for (const relPath of backendFiles) {
            const cleanPath = relPath.replace(/^\/+/, '').trim();
            const fullPath = relPath.startsWith('/') ? relPath : `${rootPath}/${cleanPath}`;
            const fileName = cleanPath.split('/').pop() || cleanPath;

            try {
              if (window.coreMindAPI?.readFile) {
                const readRes = await window.coreMindAPI.readFile(fullPath, rootPath);
                if (readRes.success && typeof readRes.data === 'string') {
                  const lineCount = readRes.data.split('\n').length;
                  const existingIdx = filesChangedDetails.findIndex((f) => f.file === cleanPath);
                  if (existingIdx >= 0) {
                    filesChangedDetails[existingIdx].lines = lineCount;
                  } else {
                    filesChangedDetails.push({
                      file: cleanPath,
                      action: 'created',
                      lines: lineCount,
                    });
                  }

                  const existingTab = tabsState.tabs.find((t) => t.filePath === fullPath || t.id === fullPath);
                  if (existingTab) {
                    tabsState.updateTabContent(existingTab.id, readRes.data);
                    useTabsStore.setState((state) => ({
                      tabs: state.tabs.map((t) =>
                        t.id === existingTab.id
                          ? { ...t, content: readRes.data, savedContent: readRes.data, isDirty: false }
                          : t
                      ),
                    }));
                  } else {
                    await tabsState.openFile(fullPath, fileName, rootPath);
                    tabsState.updateTabContent(fullPath, readRes.data);
                  }

                  // If public/index.html was created/modified, and a root index.html exists and is empty, copy content to it
                  if (cleanPath === 'public/index.html' && window.coreMindAPI.writeFile) {
                    const rootIndexPath = `${rootPath}/index.html`;
                    const rootRead = await window.coreMindAPI.readFile(rootIndexPath, rootPath);
                    if (rootRead.success && (!rootRead.data || rootRead.data.trim().length === 0)) {
                      await window.coreMindAPI.writeFile(rootIndexPath, readRes.data, rootPath);
                      const rootTab = tabsState.tabs.find((t) => t.filePath === rootIndexPath || t.id === rootIndexPath);
                      if (rootTab) {
                        tabsState.updateTabContent(rootTab.id, readRes.data);
                      }
                    }
                  }
                }
              }
            } catch (err) {
              console.error('[AI Workspace] Failed to reload changed file:', fullPath, err);
            }
          }

          // Reload whichever tab is currently active to reflect any changes
          const activeTabId = tabsState.activeTabId;
          if (activeTabId && window.coreMindAPI?.readFile) {
            try {
              const activeRead = await window.coreMindAPI.readFile(activeTabId, rootPath);
              if (activeRead.success && typeof activeRead.data === 'string') {
                tabsState.updateTabContent(activeTabId, activeRead.data);
              }
            } catch {
              // ignore
            }
          }
        }

        // Also merge any backend files_details
        if (Array.isArray(response.files_details)) {
          for (const fd of response.files_details) {
            if (fd && fd.file) {
              const clean = fd.file.replace(/^\/+/, '').trim();
              const existing = filesChangedDetails.find((f) => f.file === clean);
              if (!existing) {
                filesChangedDetails.push({
                  file: clean,
                  action: fd.action || 'created',
                  lines: fd.lines,
                });
              } else if (!existing.lines && fd.lines) {
                existing.lines = fd.lines;
              }
            }
          }
        }

        // Detect if web files are present
        const hasWebFiles = filesChangedDetails.some(
          (f) =>
            f.file.endsWith('index.html') ||
            f.file.endsWith('index.htm') ||
            f.file === 'index.html' ||
            f.file.endsWith('.html')
        );

        const isWin = window.coreMindAPI?.platform
          ? window.coreMindAPI.platform.isWindows
          : false;
        const autoTerminalCmd = isWin
          ? 'python -m http.server 3000'
          : 'python3 -m http.server 3000';

        // Auto-run local web server in terminal if web files were created/modified
        if (hasWebFiles) {
          try {
            await useTerminalStore.getState().runCommand(autoTerminalCmd);
          } catch (tErr) {
            console.warn('[AI Workspace] Auto-running terminal server failed:', tErr);
          }
        }

        const detectedUrl =
          response.local_url ||
          (rawResponse.match(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i)?.[0]) ||
          (hasWebFiles ? 'http://localhost:3000' : undefined);

        addChatMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: formattedText,
          timestamp: Date.now(),
          filesChanged: filesChangedDetails.length > 0 ? filesChangedDetails : undefined,
          localUrl: detectedUrl,
          terminalCommand: hasWebFiles ? autoTerminalCmd : undefined,
        });
        setState('completed');
      } else {
        addChatMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `**Error:** ${response.error || 'Something went wrong.'}`,
          timestamp: Date.now()
        });
        setState('error');
      }
    } catch (error: any) {
      if (!abortController.signal.aborted) {
        addChatMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: `**Connection Error:** ${error.message || 'Could not reach CoreMind backend.'}`,
          timestamp: Date.now()
        });
        setState('error');
      }
    }
  }, [rootPath, chatHistory, addChatMessage, setState, setAbortController]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
      transition: 'background-color 0.2s ease, color 0.2s ease',
      position: 'relative',
    }}>
      <WorkspaceHeader />
      
      <div style={{ flex: 1, overflowY: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <ChatThread />
        
        {currentState === 'stopped' && (
          <div style={{
            margin: '16px 14px',
            padding: '12px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Stopped</strong>
            The AI operation was cancelled by the user.
          </div>
        )}
      </div>
      
      <div style={{
        padding: '0 14px 14px 14px',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'background-color 0.2s ease'
      }}>
        <PromptComposer onSubmit={handleStartMock} />
      </div>

      {/* History overlay panel */}
      <ChatHistory />
    </div>
  );
};
