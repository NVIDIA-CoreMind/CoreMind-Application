import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AIWorkspaceEvent, TerminalEvent, FileReadEvent } from '../../types/aiWorkspace';
import { FileChangeInfo } from '../../services/aiWorkspaceService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useThemeStore } from '../../stores/themeStore';
import { TerminalActivity } from './TerminalActivity';

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

  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

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

  // Helper to render language / file badges like TS, React ⚛, PY, DART
  const renderFileBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'tsx' || ext === 'jsx') {
      return (
        <span
          style={{
            color: 'var(--accent, #8AB4F8)',
            fontSize: '13px',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
          }}
          title="React component"
        >
          ⚛
        </span>
      );
    }
    if (ext === 'ts') {
      return (
        <span
          style={{
            color: 'var(--accent, #8AB4F8)',
            fontWeight: 700,
            fontSize: '10.5px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            lineHeight: 1,
          }}
        >
          TS
        </span>
      );
    }
    if (ext === 'js') {
      return (
        <span
          style={{
            color: 'var(--warning, #FDD663)',
            fontWeight: 700,
            fontSize: '10.5px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            lineHeight: 1,
          }}
        >
          JS
        </span>
      );
    }
    if (ext === 'py') {
      return (
        <span
          style={{
            color: 'var(--warning, #FDD663)',
            fontWeight: 700,
            fontSize: '10.5px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            lineHeight: 1,
          }}
        >
          PY
        </span>
      );
    }
    if (ext === 'dart') {
      return (
        <span
          style={{
            color: 'var(--accent, #8AB4F8)',
            fontWeight: 700,
            fontSize: '10px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            lineHeight: 1,
          }}
        >
          DART
        </span>
      );
    }
    return (
      <span
        style={{
          color: 'var(--text-muted, #70757A)',
          fontWeight: 700,
          fontSize: '9.5px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        {ext}
      </span>
    );
  };

  // Group events into explored files, searches, thoughts, and terminals
  const analyzedFiles: Array<{ file: string; startLine?: number; endLine?: number; id: string }> = [];
  const searchQueries: Array<{ query: string; resultsCount?: number; id: string }> = [];
  const thoughts: Array<{ summary: string; durationSeconds?: number; id: string }> = [];
  const terminalList: TerminalEvent[] = [...terminalEvents];

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
    } else if (ev.type === 'TerminalEvent') {
      if (!terminalList.some((t) => t.id === ev.id)) {
        terminalList.push(ev);
      }
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

  // Active thought text to show in the Thinking block
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
        color: isDark ? 'var(--text-primary, #E8EAED)' : '#1E293B',
      }}
    >
      {/* 1. Edited Files List matching Image 2: "Edited ⚛ RunningIndicator.tsx +34 -10" */}
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
            }}
            title={`Open ${ef.file}`}
          >
            <span style={{ color: isDark ? 'var(--text-secondary, #9AA0A6)' : '#64748B', fontWeight: 400 }}>
              Edited
            </span>
            {renderFileBadge(basename)}
            <span style={{ color: isDark ? 'var(--text-primary, #E8EAED)' : '#0F172A', fontWeight: 600 }}>
              {basename}
            </span>
            {additions > 0 && (
              <span style={{ color: 'var(--success, #81C995)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                +{additions}
              </span>
            )}
            {deletions > 0 && (
              <span style={{ color: 'var(--error, #F28B82)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                -{deletions}
              </span>
            )}
          </div>
        );
      })}

      {/* 2. Exploring Group matching Image 2 & 3: "Exploring 8 files, 1 search v" */}
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
              color: isDark ? 'var(--text-secondary, #9AA0A6)' : '#64748B',
              padding: '2px 0',
            }}
          >
            <span>
              Exploring{' '}
              <strong style={{ color: isDark ? 'var(--text-primary, #E8EAED)' : '#0F172A', fontWeight: 600 }}>
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
                paddingLeft: '4px',
              }}
            >
              {/* Analyzed Files matching Image 1: "Analyzed TS executionEngine.ts #L151-300" */}
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
                      color: isDark ? 'var(--text-secondary, #9AA0A6)' : '#64748B',
                      fontSize: '12.5px',
                    }}
                    title={`Open ${af.file}`}
                  >
                    <span>Analyzed</span>
                    {renderFileBadge(basename)}
                    <span style={{ color: isDark ? 'var(--text-primary, #E8EAED)' : '#1E293B', fontWeight: 600 }}>
                      {basename}
                    </span>
                    {hasRange && (
                      <span
                        style={{
                          color: isDark ? 'var(--text-muted, #70757A)' : '#94A3B8',
                          fontSize: '11.5px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        #L{af.startLine}-{af.endLine}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Searched Queries matching Image 1: "Searched runAgentTask 1 result" */}
              {searchQueries.map((sq, idx) => (
                <div
                  key={`${sq.query}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    color: isDark ? 'var(--text-secondary, #9AA0A6)' : '#64748B',
                    fontSize: '12.5px',
                  }}
                >
                  <span>Searched</span>
                  <span style={{ color: isDark ? 'var(--text-primary, #E8EAED)' : '#0F172A', fontWeight: 600 }}>
                    {sq.query}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: isDark ? 'var(--bg-surface, #28292B)' : '#E2E8F0',
                      color: isDark ? 'var(--text-secondary, #9AA0A6)' : '#475569',
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

      {/* 3. Thinking Block matching Image 1 & 3: "Thinking for 5s v" / "Thought for 1s >" */}
      {activeThinkingText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={() => setThinkingOpen((prev) => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              color: isDark ? 'var(--text-secondary, #9AA0A6)' : '#64748B',
              padding: '2px 0',
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
                color: isDark ? 'var(--text-secondary, #9AA0A6)' : '#475569',
                lineHeight: 1.6,
                fontSize: '12.5px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {activeThinkingText}
            </div>
          )}
        </div>
      )}

      {/* 4. Terminal Runs matching Image 4: "Ran <command> v" */}
      {terminalList.map((termEv) => (
        <TerminalActivity key={termEv.id} event={termEv} />
      ))}
    </div>
  );
};
