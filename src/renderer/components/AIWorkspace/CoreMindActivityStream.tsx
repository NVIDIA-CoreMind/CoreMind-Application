import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, CircleDot } from 'lucide-react';
import { AIWorkspaceEvent, TerminalEvent, FileReadEvent } from '../../types/aiWorkspace';
import { FileChangeInfo, useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { TerminalActivity } from './TerminalActivity';
import { LanguageFileIcon } from './LanguageFileIcon';
import { getAITheme } from './themeTokens';

interface AntigravityActivityStreamProps {
  events?: AIWorkspaceEvent[];
  filesChanged?: FileChangeInfo[];
  terminalEvents?: TerminalEvent[];
  thoughtText?: string;
  thoughtDurationSeconds?: number;
  isRunning?: boolean;
}

export const AntigravityActivityStream: React.FC<AntigravityActivityStreamProps> = ({
  events = [],
  filesChanged = [],
  terminalEvents = [],
  thoughtText,
  thoughtDurationSeconds = 1,
  isRunning = false,
}) => {
  // Collapsible section toggles
  const [initialThoughtOpen, setInitialThoughtOpen] = useState(false);
  const [activeThinkingOpen, setActiveThinkingOpen] = useState(true);
  const [commandsGroupOpen, setCommandsGroupOpen] = useState(false);
  const [exploredGroupOpen, setExploredGroupOpen] = useState(false);
  const [tasksGroupOpen, setTasksGroupOpen] = useState(false);

  // Live timer for active thinking duration
  const [liveSeconds, setLiveSeconds] = useState(thoughtDurationSeconds || 1);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setLiveSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  const taskGraph = useAIWorkspaceStore((s) => s.taskGraph);
  const tasks = taskGraph?.tasks || taskGraph?.nodes || [];

  const handleOpenFile = async (filePath: string, _line?: number) => {
    if (!rootPath) return;
    const cleanPath = filePath.replace(/^\/+/, '').trim();
    const fullPath = filePath.startsWith('/') ? filePath : `${rootPath}/${cleanPath}`;
    const fileName = cleanPath.split('/').pop() || cleanPath;
    try {
      await openFile(fullPath, fileName, rootPath);
    } catch (err) {
      console.warn('[ActivityStream] Failed to open file:', err);
    }
  };

  // Group events into explored files, searches, thoughts, and terminals
  const analyzedFiles: Array<{ file: string; startLine?: number; endLine?: number; id: string }> = [];
  const searchQueries: Array<{ query: string; resultsCount?: number; id: string }> = [];
  const thoughts: Array<{ summary: string; durationSeconds?: number; id: string }> = [];

  for (const ev of events) {
    if (ev.type === 'FileReadEvent') {
      const readEv = ev as FileReadEvent;
      analyzedFiles.push({
        id: ev.id,
        file: readEv.file,
        startLine: readEv.startLine,
        endLine: readEv.endLine,
      });
    } else if (ev.type === 'ToolCallEvent') {
      const toolName = ev.tool.toLowerCase();
      if (/search|grep|find/i.test(toolName)) {
        const query = ev.args?.query || ev.args?.pattern || ev.tool;
        searchQueries.push({
          id: ev.id,
          query: String(query),
          resultsCount: Array.isArray(ev.result) ? ev.result.length : 1,
        });
      } else if (/read|view/i.test(toolName)) {
        const file = ev.args?.path || ev.args?.file || ev.args?.AbsolutePath || '';
        if (file) {
          analyzedFiles.push({
            id: ev.id,
            file: String(file),
            startLine: ev.args?.StartLine || ev.args?.startLine,
            endLine: ev.args?.EndLine || ev.args?.endLine,
          });
        }
      }
    } else if (ev.type === 'ThoughtEvent') {
      thoughts.push({
        id: ev.id,
        summary: ev.summary,
        durationSeconds: ev.durationMs ? Math.max(1, Math.round(ev.durationMs / 1000)) : 1,
      });
    }
  }

  // Deduplicate terminal execution cards
  const rawTerminals: TerminalEvent[] = [...terminalEvents];
  for (const ev of events) {
    if (ev.type === 'TerminalEvent') {
      if (!rawTerminals.some((t) => t.id === ev.id)) {
        rawTerminals.push(ev);
      }
    }
  }

  const deduplicatedTerminals: TerminalEvent[] = [];
  for (const term of rawTerminals) {
    const existingIndex = deduplicatedTerminals.findIndex(
      (prev) =>
        prev.command.trim() === term.command.trim() &&
        (Math.abs((prev.timestamp || 0) - (term.timestamp || 0)) < 25000 ||
          Boolean(prev.output && term.output && (prev.output.includes(term.output) || term.output.includes(prev.output))) ||
          (prev.status === 'running' && (term.status === 'completed' || term.status === 'failed')) ||
          (term.status === 'running' && (prev.status === 'completed' || prev.status === 'failed')))
    );

    if (existingIndex !== -1) {
      const prev = deduplicatedTerminals[existingIndex];
      deduplicatedTerminals[existingIndex] = {
        ...prev,
        output: (term.output && term.output.length > (prev.output?.length || 0)) ? term.output : prev.output,
        status: term.status === 'completed' || term.status === 'failed' ? term.status : prev.status,
        exitCode: term.exitCode !== undefined ? term.exitCode : prev.exitCode,
        durationMs: term.durationMs || prev.durationMs,
      };
    } else {
      deduplicatedTerminals.push(term);
    }
  }

  // Deduplicate files changed from props and events
  const editedFilesMap = new Map<string, FileChangeInfo>();
  for (const fc of filesChanged) {
    editedFilesMap.set(fc.file, fc);
  }
  for (const ev of events) {
    if (ev.type === 'FileChangedEvent') {
      const cur = editedFilesMap.get(ev.file);
      editedFilesMap.set(ev.file, {
        file: ev.file,
        action: ev.action,
        lines: ev.lines || cur?.lines,
        additions: ev.additions ?? cur?.additions ?? ev.lines,
        deletions: ev.deletions ?? cur?.deletions ?? 0,
      });
    }
  }
  const editedFilesList = Array.from(editedFilesMap.values());

  const totalExploredFiles = analyzedFiles.length;
  const totalSearches = searchQueries.length;
  const hasExploringGroup = totalExploredFiles > 0 || totalSearches > 0;

  // Active thought text to show
  const activeThinkingText =
    thoughtText ||
    (thoughts.length > 0 ? thoughts[thoughts.length - 1].summary : undefined);

  // In Screenshot 1 & 2: earlier commands are grouped (e.g. "Ran 18 commands >"),
  // and the most recent or running command is shown individually
  const hasMultipleCommands = deduplicatedTerminals.length > 1;
  const earlierCommands = hasMultipleCommands ? deduplicatedTerminals.slice(0, -1) : [];
  const latestCommand = deduplicatedTerminals.length > 0
    ? deduplicatedTerminals[deduplicatedTerminals.length - 1]
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '9px',
        width: '100%',
        margin: '2px 0 6px 0',
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        color: isDark ? '#8c8c8c' : '#64748b',
        lineHeight: 1.4,
      }}
    >
      {/* 1. Initial Thought: e.g. "Thought for 1s >" (Screenshot 1 & 2) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          onClick={() => setInitialThoughtOpen((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            userSelect: 'none',
            color: isDark ? '#8c8c8c' : '#64748b',
            width: 'fit-content',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#e4e4e7' : '#18181b')}
          onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#64748b')}
        >
          <span>
            Thought for <strong style={{ color: isDark ? '#f4f4f5' : '#18181b', fontWeight: 600 }}>{isRunning ? '1s' : `${Math.max(1, thoughtDurationSeconds)}s`}</strong>
          </span>
          {initialThoughtOpen ? (
            <ChevronDown size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
          ) : (
            <ChevronRight size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
          )}
        </div>

        {initialThoughtOpen && activeThinkingText && (
          <div
            style={{
              padding: '4px 0 6px 12px',
              color: isDark ? '#a1a1aa' : '#4b5563',
              lineHeight: 1.55,
              fontSize: '12.5px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {activeThinkingText}
          </div>
        )}
      </div>

      {/* 2. Grouped Earlier Commands: e.g. "Ran 18 commands >" (Screenshot 1 & 2) */}
      {hasMultipleCommands && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={() => setCommandsGroupOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              userSelect: 'none',
              color: isDark ? '#8c8c8c' : '#64748b',
              width: 'fit-content',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#e4e4e7' : '#18181b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#64748b')}
          >
            <span>
              Ran <strong style={{ color: isDark ? '#f4f4f5' : '#18181b', fontWeight: 600 }}>{earlierCommands.length} commands</strong>
            </span>
            {commandsGroupOpen ? (
              <ChevronDown size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
            ) : (
              <ChevronRight size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
            )}
          </div>

          {commandsGroupOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '10px' }}>
              {earlierCommands.map((term) => (
                <TerminalActivity key={term.id} event={term} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Explored files & searches: e.g. "Explored 1 file, 1 search >" (Screenshot 1 & 2) */}
      {hasExploringGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={() => setExploredGroupOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              userSelect: 'none',
              color: isDark ? '#8c8c8c' : '#64748b',
              width: 'fit-content',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#e4e4e7' : '#18181b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#64748b')}
          >
            <span>
              Explored{' '}
              <strong style={{ color: isDark ? '#f4f4f5' : '#18181b', fontWeight: 600 }}>
                {totalExploredFiles > 0 && totalSearches > 0
                  ? `${totalExploredFiles} file${totalExploredFiles > 1 ? 's' : ''}, ${totalSearches} search${totalSearches > 1 ? 'es' : ''}`
                  : totalExploredFiles > 0
                  ? `${totalExploredFiles} file${totalExploredFiles > 1 ? 's' : ''}`
                  : `${totalSearches} search${totalSearches > 1 ? 'es' : ''}`}
              </strong>
            </span>
            {exploredGroupOpen ? (
              <ChevronDown size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
            ) : (
              <ChevronRight size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
            )}
          </div>

          {exploredGroupOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '12px' }}>
              {analyzedFiles.map((af, idx) => {
                const basename = af.file.split('/').pop() || af.file;
                const hasRange = af.startLine !== undefined && af.endLine !== undefined;
                return (
                  <div
                    key={`${af.file}-${idx}`}
                    onClick={() => handleOpenFile(af.file, af.startLine)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: tokens.textSecondary,
                    }}
                  >
                    <span>Analyzed</span>
                    <LanguageFileIcon filename={basename} size={14} />
                    <span style={{ color: tokens.textPrimary, fontWeight: 500 }}>{basename}</span>
                    {hasRange && (
                      <span style={{ color: tokens.textMuted, fontSize: '11px', fontFamily: 'monospace' }}>
                        #L{af.startLine}-{af.endLine}
                      </span>
                    )}
                  </div>
                );
              })}

              {searchQueries.map((sq, idx) => (
                <div
                  key={`${sq.query}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: tokens.textSecondary,
                  }}
                >
                  <span>Searched</span>
                  <span style={{ color: tokens.textPrimary, fontWeight: 500 }}>{sq.query}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Active or Most Recent Command (Screenshot 1: expanded with terminal card) */}
      {latestCommand && (
        <TerminalActivity event={latestCommand} />
      )}

      {/* 5. Explored Tasks: e.g. "Explored 5 tasks >" (Screenshot 2) */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={() => setTasksGroupOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              userSelect: 'none',
              color: isDark ? '#8c8c8c' : '#64748b',
              width: 'fit-content',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#e4e4e7' : '#18181b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#64748b')}
          >
            <span>
              Explored <strong style={{ color: isDark ? '#f4f4f5' : '#18181b', fontWeight: 600 }}>{tasks.length} tasks</strong>
            </span>
            {tasksGroupOpen ? (
              <ChevronDown size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
            ) : (
              <ChevronRight size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
            )}
          </div>

          {tasksGroupOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingLeft: '12px' }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '12px',
                    color: tokens.textSecondary,
                  }}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 size={13} color="#22c55e" />
                  ) : task.status === 'in_progress' ? (
                    <CircleDot size={13} color="#3b82f6" />
                  ) : (
                    <CircleDot size={13} color={tokens.textMuted} />
                  )}
                  <span style={{ color: task.status === 'completed' ? tokens.textSecondary : tokens.textPrimary }}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Active Thinking Stream: e.g. "Thinking for 20s v" (Screenshot 2) */}
      {isRunning && activeThinkingText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={() => setActiveThinkingOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              userSelect: 'none',
              color: isDark ? '#8c8c8c' : '#64748b',
              width: 'fit-content',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#e4e4e7' : '#18181b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#64748b')}
          >
            <span>
              Thinking for <strong style={{ color: isDark ? '#f4f4f5' : '#18181b', fontWeight: 600 }}>{liveSeconds}s</strong>
            </span>
            {activeThinkingOpen ? (
              <ChevronDown size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
            ) : (
              <ChevronRight size={13} style={{ color: isDark ? '#71717a' : '#94a3b8' }} />
            )}
          </div>

          {activeThinkingOpen && (
            <div
              style={{
                padding: '4px 0 8px 12px',
                color: isDark ? '#a1a1aa' : '#4b5563',
                fontSize: '13px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {activeThinkingText}
            </div>
          )}
        </div>
      )}

      {/* 7. Edited Files */}
      {editedFilesList.map((ef) => {
        const basename = ef.file.split('/').pop() || ef.file;
        const additions = ef.additions ?? ef.lines ?? 0;
        const deletions = ef.deletions ?? 0;

        return (
          <div
            key={ef.file}
            onClick={() => handleOpenFile(ef.file)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              color: isDark ? '#8c8c8c' : '#64748b',
              width: 'fit-content',
              fontSize: '12.5px',
            }}
          >
            <span>Edited</span>
            <LanguageFileIcon filename={basename} size={14} />
            <span style={{ color: isDark ? '#f4f4f5' : '#18181b', fontWeight: 500 }}>{basename}</span>
            <span style={{ color: '#22c55e', fontSize: '11px', fontFamily: 'monospace' }}>+{additions}</span>
            {deletions > 0 && (
              <span style={{ color: '#ef4444', fontSize: '11px', fontFamily: 'monospace' }}>-{deletions}</span>
            )}
          </div>
        );
      })}

      {/* 8. Working... indicator at bottom while generating (Screenshot 1 & 2) */}
      {isRunning && (
        <div
          style={{
            fontSize: '13px',
            color: isDark ? '#a1a1aa' : '#64748b',
            fontWeight: 400,
            marginTop: '3px',
            userSelect: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Working...
        </div>
      )}
    </div>
  );
};
