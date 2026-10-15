import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AIWorkspaceEvent, TerminalEvent, FileReadEvent } from '../../types/aiWorkspace';
import { FileChangeInfo } from '../../services/aiWorkspaceService';
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
  const [exploringOpen, setExploringOpen] = useState(true);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [commandsGroupOpen, setCommandsGroupOpen] = useState(true);

  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        margin: '2px 0 6px 0',
        fontFamily: 'var(--font-sans)',
        fontSize: '12.5px',
        color: isDark ? '#E4E4E7' : '#18181B',
      }}
    >
      {/* 1. Edited Files: e.g. Edited 🐍 planner.py +52 -9 */}
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
              gap: '7px',
              padding: '2px 0',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'opacity 0.15s ease',
              width: 'fit-content',
            }}
            title={`Open ${ef.file}`}
          >
            <span style={{ color: tokens.textSecondary, fontWeight: 400 }}>
              Edited
            </span>
            <LanguageFileIcon filename={basename} size={14} />
            <span style={{ color: tokens.textPrimary, fontWeight: 600 }}>
              {basename}
            </span>
            {additions > 0 && (
              <span
                style={{
                  color: tokens.accentSuccess,
                  fontWeight: 600,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12px',
                }}
              >
                +{additions}
              </span>
            )}
            {deletions > 0 && (
              <span
                style={{
                  color: tokens.accentError,
                  fontWeight: 600,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '12px',
                }}
              >
                -{deletions}
              </span>
            )}
          </div>
        );
      })}

      {/* 2. Explored files Group: e.g. Explored 1 file ⌵ containing Thought and Analyzed files */}
      {hasExploringGroup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={() => setExploringOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              color: tokens.textSecondary,
              padding: '2px 0',
              width: 'fit-content',
            }}
          >
            <span>
              Explored{' '}
              <strong style={{ color: tokens.textPrimary, fontWeight: 600 }}>
                {totalExploredFiles} {totalExploredFiles === 1 ? 'file' : 'files'}
                {totalSearches > 0
                  ? `, ${totalSearches} ${totalSearches === 1 ? 'search' : 'searches'}`
                  : ''}
              </strong>
            </span>
            {exploringOpen ? (
              <ChevronDown size={13} color="currentColor" />
            ) : (
              <ChevronRight size={13} color="currentColor" />
            )}
          </div>

          {exploringOpen && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                paddingLeft: '12px',
              }}
            >
              {/* Thought block inside Explored group (as in Screenshot 2) */}
              {activeThinkingText && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div
                    onClick={() => setThinkingOpen((prev) => !prev)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      color: tokens.textSecondary,
                      fontSize: '12px',
                      padding: '1px 0',
                      width: 'fit-content',
                    }}
                  >
                    <span>
                      {isRunning
                        ? `Thinking for ${thoughtDurationSeconds}s`
                        : `Thought for ${thoughtDurationSeconds}s`}
                    </span>
                    {thinkingOpen ? (
                      <ChevronDown size={12} color="currentColor" />
                    ) : (
                      <ChevronRight size={12} color="currentColor" />
                    )}
                  </div>

                  {thinkingOpen && (
                    <div
                      style={{
                        padding: '4px 0 6px 0',
                        color: tokens.textSecondary,
                        lineHeight: 1.5,
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {activeThinkingText}
                    </div>
                  )}
                </div>
              )}

              {/* Analyzed Files inside Explored files */}
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
                      gap: '7px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      color: tokens.textSecondary,
                      fontSize: '12.5px',
                      padding: '1px 0',
                      width: 'fit-content',
                    }}
                    title={`Open ${af.file}${hasRange ? ` at line ${af.startLine}` : ''}`}
                  >
                    <span>Analyzed</span>
                    <LanguageFileIcon filename={basename} size={14} />
                    <span style={{ color: tokens.textPrimary, fontWeight: 600 }}>
                      {basename}
                    </span>
                    {hasRange && (
                      <span
                        style={{
                          color: tokens.textMuted,
                          fontSize: '11.5px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        }}
                      >
                        #L{af.startLine}-{af.endLine}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Searched Queries */}
              {searchQueries.map((sq, idx) => (
                <div
                  key={`${sq.query}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    color: tokens.textSecondary,
                    fontSize: '12.5px',
                    padding: '1px 0',
                  }}
                >
                  <span>Searched</span>
                  <span style={{ color: tokens.textPrimary, fontWeight: 600 }}>
                    {sq.query}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: tokens.bgCard,
                      border: `1px solid ${tokens.border}`,
                      color: tokens.textSecondary,
                    }}
                  >
                    {sq.resultsCount || 1} {sq.resultsCount === 1 ? 'result' : 'results'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Standalone Thinking Block if no explored files exist */}
      {!hasExploringGroup && activeThinkingText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div
            onClick={() => setThinkingOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              color: tokens.textSecondary,
              padding: '2px 0',
              width: 'fit-content',
            }}
          >
            <span>
              {isRunning
                ? `Thinking for ${thoughtDurationSeconds}s`
                : `Thought for ${thoughtDurationSeconds}s`}
            </span>
            {thinkingOpen ? (
              <ChevronDown size={13} color="currentColor" />
            ) : (
              <ChevronRight size={13} color="currentColor" />
            )}
          </div>

          {thinkingOpen && (
            <div
              style={{
                padding: '4px 0 6px 0',
                color: tokens.textSecondary,
                lineHeight: 1.5,
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {activeThinkingText}
            </div>
          )}
        </div>
      )}

      {/* 3. Terminal Runs (Ran X commands group or single command) */}
      {deduplicatedTerminals.length > 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={() => setCommandsGroupOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              color: tokens.textSecondary,
              padding: '2px 0',
              width: 'fit-content',
            }}
          >
            <span>
              Ran{' '}
              <strong style={{ color: tokens.textPrimary, fontWeight: 600 }}>
                {deduplicatedTerminals.length} commands
              </strong>
            </span>
            {commandsGroupOpen ? (
              <ChevronDown size={13} color="currentColor" />
            ) : (
              <ChevronRight size={13} color="currentColor" />
            )}
          </div>

          {commandsGroupOpen && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                paddingLeft: '8px',
              }}
            >
              {deduplicatedTerminals.map((termEv) => (
                <TerminalActivity key={termEv.id} event={termEv} />
              ))}
            </div>
          )}
        </div>
      ) : deduplicatedTerminals.length === 1 ? (
        <TerminalActivity key={deduplicatedTerminals[0].id} event={deduplicatedTerminals[0]} />
      ) : null}
    </div>
  );
};
