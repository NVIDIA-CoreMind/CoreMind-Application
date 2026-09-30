import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  Trash2,
  X,
  Terminal as TerminalIcon,
  RotateCcw,
  Folder,
  Play,
  Square,
  Send,
  Loader2,
} from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { terminalService } from '../services/coremind/terminal';
import { BackgroundProcess, TerminalExecuteResponse, TerminalSession } from '../services/coremind/types';

type TerminalTab = 'pty' | 'persistent' | 'processes';

interface ExecutedLog {
  id: string;
  command: string;
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  timestamp: number;
}

export const TerminalPanel: React.FC = () => {
  const { toggleTerminal } = useUiStore();
  const { rootPath, rootName } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<TerminalTab>('pty');

  // --- Local PTY State ---
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>(`term-${Date.now()}`);
  const cleanupRef = useRef<(() => void) | null>(null);
  const sessionSeqRef = useRef<number>(0);
  const [isPtyConnected, setIsPtyConnected] = useState(false);

  // --- CoreMind Persistent Session State ---
  const [persistentSession, setPersistentSession] = useState<TerminalSession | null>(null);
  const [persistentCwd, setPersistentCwd] = useState<string>(rootPath || '');
  const [persistentCommand, setPersistentCommand] = useState('');
  const [persistentLogs, setPersistentLogs] = useState<ExecutedLog[]>([]);
  const [isExecutingPersistent, setIsExecutingPersistent] = useState(false);
  const persistentOutputEndRef = useRef<HTMLDivElement>(null);

  // --- Background Processes State ---
  const [processes, setProcesses] = useState<BackgroundProcess[]>([]);
  const [newProcessCmd, setNewProcessCmd] = useState('npm run dev');
  const [isStartingProcess, setIsStartingProcess] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [processLogs, setProcessLogs] = useState<string[]>([]);

  // Initialize Local PTY Terminal
  const initTerminal = useCallback(async () => {
    if (!terminalRef.current) return;

    const currentSeq = ++sessionSeqRef.current;

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const sessionId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    sessionIdRef.current = sessionId;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.3,
      allowTransparency: true,
      theme: {
        background: '#181818',
        foreground: '#E6E6E6',
        cursor: '#10B981',
        selectionBackground: 'rgba(16, 185, 129, 0.3)',
        black: '#181818',
        red: '#EF4444',
        green: '#10B981',
        yellow: '#F59E0B',
        blue: '#3B82F6',
        magenta: '#A78BFA',
        cyan: '#06B6D4',
        white: '#E6E6E6',
        brightBlack: '#666666',
        brightRed: '#F87171',
        brightGreen: '#34D399',
        brightYellow: '#FBBF24',
        brightBlue: '#60A5FA',
        brightMagenta: '#C4B5FD',
        brightCyan: '#22D3EE',
        brightWhite: '#FFFFFF',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    terminalRef.current.innerHTML = '';
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    try {
      fitAddon.fit();
    } catch {
      // ignore
    }

    let isDisposed = false;
    let removeDataListener: (() => void) | null = null;
    let removeExitListener: (() => void) | null = null;
    let onDataDisposable: { dispose: () => void } | null = null;

    const cleanup = () => {
      if (isDisposed) return;
      isDisposed = true;
      if (onDataDisposable) {
        onDataDisposable.dispose();
        onDataDisposable = null;
      }
      if (removeDataListener) {
        removeDataListener();
        removeDataListener = null;
      }
      if (removeExitListener) {
        removeExitListener();
        removeExitListener = null;
      }
      window.coreMindAPI?.closeTerminal?.(sessionId);
      term.dispose();
      if (xtermRef.current === term) xtermRef.current = null;
      if (fitAddonRef.current === fitAddon) fitAddonRef.current = null;
    };

    cleanupRef.current = cleanup;

    if (window.coreMindAPI?.createTerminal) {
      const res = await window.coreMindAPI.createTerminal(sessionId, {
        cols: term.cols || 80,
        rows: term.rows || 24,
        cwd: rootPath || undefined,
      });

      if (sessionSeqRef.current !== currentSeq || isDisposed) {
        window.coreMindAPI.closeTerminal(sessionId);
        term.dispose();
        return;
      }

      if (res.success) {
        setIsPtyConnected(true);
      } else {
        term.writeln(`\x1b[31mFailed to start local terminal: ${res.error.message}\x1b[0m`);
      }

      onDataDisposable = term.onData((data) => {
        window.coreMindAPI.terminalWrite(sessionId, data);
      });

      removeDataListener = window.coreMindAPI.onTerminalData((payload) => {
        if (payload.id === sessionId && xtermRef.current === term) {
          term.write(payload.data);
        }
      });

      removeExitListener = window.coreMindAPI.onTerminalExit((payload) => {
        if (payload.id === sessionId && xtermRef.current === term) {
          term.writeln(`\r\n\x1b[90m[Process completed (exit code ${payload.exitCode})]\x1b[0m\r\n`);
          setIsPtyConnected(false);
        }
      });
    }
  }, [rootPath]);

  // Mount PTY
  useEffect(() => {
    if (activeTab === 'pty') {
      initTerminal();
    }
  }, [activeTab, initTerminal]);

  // Handle Resize for PTY
  useEffect(() => {
    if (activeTab !== 'pty') return;

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          const cols = xtermRef.current.cols;
          const rows = xtermRef.current.rows;
          if (cols > 0 && rows > 0) {
            window.coreMindAPI?.terminalResize?.(sessionIdRef.current, cols, rows);
          }
        } catch {
          // ignore
        }
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [activeTab]);

  // Initialize Persistent Backend Session
  const initPersistentSession = useCallback(async () => {
    if (!rootPath) return;
    try {
      const sess = await terminalService.createSession(rootPath);
      setPersistentSession(sess);
      setPersistentCwd(sess.cwd || rootPath);
    } catch (err: unknown) {
      console.warn('[CoreMind] Failed to init persistent terminal session:', err);
    }
  }, [rootPath]);

  useEffect(() => {
    if (activeTab === 'persistent' && !persistentSession && rootPath) {
      initPersistentSession();
    }
  }, [activeTab, persistentSession, rootPath, initPersistentSession]);

  // Execute in Persistent Session
  const handleExecutePersistent = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cmd = persistentCommand.trim();
    if (!cmd || !persistentSession || isExecutingPersistent) return;

    setPersistentCommand('');
    setIsExecutingPersistent(true);

    try {
      const res: TerminalExecuteResponse = await terminalService.executeInSession(
        persistentSession.session_id,
        cmd
      );

      const logItem: ExecutedLog = {
        id: `exec-${Date.now()}`,
        command: cmd,
        cwd: res.cwd || persistentCwd,
        exitCode: res.exit_code,
        stdout: res.stdout,
        stderr: res.stderr,
        timestamp: Date.now(),
      };

      setPersistentLogs((prev) => [...prev, logItem]);
      if (res.cwd) setPersistentCwd(res.cwd);
    } catch (err: unknown) {
      const error = err as Error;
      setPersistentLogs((prev) => [
        ...prev,
        {
          id: `exec-${Date.now()}`,
          command: cmd,
          cwd: persistentCwd,
          exitCode: 1,
          stdout: '',
          stderr: error.message || 'Execution error',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsExecutingPersistent(false);
      persistentOutputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Start background process
  const handleStartProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !newProcessCmd.trim() || isStartingProcess) return;

    setIsStartingProcess(true);
    try {
      const proc = await terminalService.startProcess(newProcessCmd.trim(), rootPath);
      setProcesses((prev) => [proc, ...prev]);
      setSelectedProcessId(proc.process_id);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Failed to start process: ${error.message}`);
    } finally {
      setIsStartingProcess(false);
    }
  };

  // Stop background process
  const handleStopProcess = async (procId: string) => {
    try {
      await terminalService.stopProcess(procId);
      setProcesses((prev) =>
        prev.map((p) => (p.process_id === procId ? { ...p, is_running: false } : p))
      );
    } catch (err: unknown) {
      console.warn('Failed to stop process:', err);
    }
  };

  // Poll logs of selected background process
  useEffect(() => {
    if (activeTab !== 'processes' || !selectedProcessId) return;

    let mounted = true;
    const fetchLogs = async () => {
      try {
        const res = await terminalService.getProcessLogs(selectedProcessId, 100);
        if (mounted && res?.logs) {
          setProcessLogs(res.logs);
        }
      } catch {
        // ignore
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeTab, selectedProcessId]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      {/* Header with Tabs */}
      <div
        style={{
          height: '32px',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          userSelect: 'none',
        }}
      >
        {/* Left: Tab Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
            <TerminalIcon size={13} color="var(--accent)" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              TERMINAL
            </span>
          </div>

          {/* Tab 1: Local Shell */}
          <button
            onClick={() => setActiveTab('pty')}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'pty' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === 'pty' ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>Local Shell</span>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isPtyConnected ? '#22C55E' : '#EF4444',
              }}
            />
          </button>

          {/* Tab 2: Persistent Session */}
          <button
            onClick={() => setActiveTab('persistent')}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'persistent' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === 'persistent' ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>CoreMind Session</span>
            {persistentSession && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                }}
              />
            )}
          </button>

          {/* Tab 3: Dev Processes */}
          <button
            onClick={() => setActiveTab('processes')}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'processes' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === 'processes' ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>Background Servers</span>
            {processes.some((p) => p.is_running) && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '0 4px',
                  borderRadius: '9999px',
                  backgroundColor: '#10B981',
                  color: '#ffffff',
                }}
              >
                {processes.filter((p) => p.is_running).length}
              </span>
            )}
          </button>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {rootName && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-muted)',
                fontSize: '10px',
                marginRight: '6px',
              }}
            >
              <Folder size={11} />
              <span>{rootName}</span>
            </div>
          )}

          {activeTab === 'pty' && (
            <>
              <button
                onClick={initTerminal}
                title="Restart Local Terminal"
                style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: '4px' }}
              >
                <RotateCcw size={12} />
              </button>
              <button
                onClick={() => xtermRef.current?.clear()}
                title="Clear Terminal Output"
                style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: '4px' }}
              >
                <Trash2 size={12} />
              </button>
            </>
          )}

          {activeTab === 'persistent' && (
            <button
              onClick={() => setPersistentLogs([])}
              title="Clear Session History"
              style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: '4px' }}
            >
              <Trash2 size={12} />
            </button>
          )}

          <button
            onClick={toggleTerminal}
            title="Close Panel (⌘J)"
            style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: '4px' }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Tab Viewports */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Tab 1: PTY Terminal */}
        <div
          ref={terminalRef}
          style={{
            display: activeTab === 'pty' ? 'block' : 'none',
            width: '100%',
            height: '100%',
            padding: '6px 10px',
            overflow: 'hidden',
          }}
        />

        {/* Tab 2: CoreMind Persistent Session */}
        {activeTab === 'persistent' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              backgroundColor: '#181818',
              overflow: 'hidden',
            }}
          >
            {/* Logs viewport */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {persistentSession && (
                <div style={{ color: '#10B981', fontSize: '11px', marginBottom: '4px' }}>
                  [CoreMind Persistent Session Active: {persistentSession.session_id}] — Directory context preserved across commands.
                </div>
              )}

              {persistentLogs.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                  No commands executed yet. Type a shell command below (e.g. `pwd`, `ls -la`, `export VAR=val`).
                </div>
              )}

              {persistentLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA' }}>
                    <span style={{ color: '#10B981' }}>➜</span>
                    <span style={{ color: '#9ca3af', fontSize: '10px' }}>{log.cwd.split(/[/\\]/).pop() || '~'}</span>
                    <span style={{ color: '#f3f4f6', fontWeight: 600 }}>$ {log.command}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '9.5px',
                        color: log.exitCode === 0 ? '#10B981' : '#EF4444',
                      }}
                    >
                      exit: {log.exitCode}
                    </span>
                  </div>

                  {log.stdout && (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        color: '#d1d5db',
                        paddingLeft: '16px',
                        fontSize: '11px',
                      }}
                    >
                      {log.stdout}
                    </pre>
                  )}

                  {log.stderr && (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        color: '#EF4444',
                        paddingLeft: '16px',
                        fontSize: '11px',
                      }}
                    >
                      {log.stderr}
                    </pre>
                  )}
                </div>
              ))}

              {isExecutingPersistent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '11px' }}>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Executing in session...</span>
                </div>
              )}

              <div ref={persistentOutputEndRef} />
            </div>

            {/* Input bar */}
            <form
              onSubmit={handleExecutePersistent}
              style={{
                height: '32px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                backgroundColor: '#1f1f22',
              }}
            >
              <span style={{ color: '#10B981', marginRight: '6px', fontSize: '12px' }}>$</span>
              <input
                type="text"
                value={persistentCommand}
                onChange={(e) => setPersistentCommand(e.target.value)}
                placeholder="Execute command in persistent backend session..."
                disabled={isExecutingPersistent}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11.5px',
                }}
              />
              <button
                type="submit"
                disabled={!persistentCommand.trim() || isExecutingPersistent}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: persistentCommand.trim() ? '#10B981' : '#6b7280',
                  cursor: persistentCommand.trim() ? 'pointer' : 'default',
                  padding: '4px',
                }}
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Dev Background Processes */}
        {activeTab === 'processes' && (
          <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Left: Process List & Launch */}
            <div
              style={{
                width: '260px',
                borderRight: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-app)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}
            >
              {/* Launch Form */}
              <form
                onSubmit={handleStartProcess}
                style={{
                  padding: '8px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Start Background Server
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    value={newProcessCmd}
                    onChange={(e) => setNewProcessCmd(e.target.value)}
                    placeholder="npm run dev"
                    style={{ flex: 1, fontSize: '11px', height: '24px' }}
                  />
                  <button
                    type="submit"
                    disabled={isStartingProcess || !newProcessCmd.trim()}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: 'var(--accent)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Play size={10} />
                    <span>Run</span>
                  </button>
                </div>
              </form>

              {/* Processes list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {processes.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No running background processes
                  </div>
                ) : (
                  processes.map((p) => {
                    const isSelected = p.process_id === selectedProcessId;
                    return (
                      <div
                        key={p.process_id}
                        onClick={() => setSelectedProcessId(p.process_id)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          backgroundColor: isSelected ? 'var(--bg-panel)' : 'transparent',
                          border: isSelected ? '1px solid var(--border-subtle)' : '1px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '2px',
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '11.5px', color: '#e5e7eb', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.command}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            PID: {p.pid} | {p.process_id.slice(0, 10)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '9.5px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: p.is_running ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                              color: p.is_running ? '#10B981' : '#9ca3af',
                            }}
                          >
                            {p.is_running ? 'Running' : 'Stopped'}
                          </span>

                          {p.is_running && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStopProcess(p.process_id);
                              }}
                              title="Stop Process"
                              style={{
                                padding: '2px 4px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                              }}
                            >
                              <Square size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Selected Process Logs */}
            <div
              style={{
                flex: 1,
                backgroundColor: '#181818',
                padding: '10px',
                overflowY: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#d1d5db',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {selectedProcessId ? (
                <>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Tailing logs for {selectedProcessId}:
                  </div>
                  {processLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Waiting for log output...
                    </div>
                  ) : (
                    processLogs.map((line, idx) => (
                      <div key={idx} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                        {line}
                      </div>
                    ))
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>
                  Select a running process to tail live logs
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
