import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Trash2, X, Terminal as TerminalIcon, RotateCcw, Folder } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

export const TerminalPanel: React.FC = () => {
  const { toggleTerminal } = useUiStore();
  const { rootPath, rootName } = useWorkspaceStore();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>(`term-${Date.now()}`);
  const cleanupRef = useRef<(() => void) | null>(null);
  const sessionSeqRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState(false);

  const initTerminal = useCallback(async () => {
    if (!terminalRef.current) return;

    // Invalidate any pending in-flight async initializations
    const currentSeq = ++sessionSeqRef.current;

    // Synchronously clean up previous terminal instance and all listeners
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

    // Clear DOM container before mounting
    terminalRef.current.innerHTML = '';
    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    try {
      fitAddon.fit();
    } catch {
      // ignore initial fit error before layout settles
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
      window.coreMindAPI.closeTerminal(sessionId);
      term.dispose();
      if (xtermRef.current === term) {
        xtermRef.current = null;
      }
      if (fitAddonRef.current === fitAddon) {
        fitAddonRef.current = null;
      }
    };

    cleanupRef.current = cleanup;

    // Spawn backend PTY process
    const res = await window.coreMindAPI.createTerminal(sessionId, {
      cols: term.cols || 80,
      rows: term.rows || 24,
      cwd: rootPath || undefined,
    });

    // If canceled/superseded during async await, abort immediately
    if (sessionSeqRef.current !== currentSeq || isDisposed) {
      window.coreMindAPI.closeTerminal(sessionId);
      term.dispose();
      return;
    }

    if (res.success) {
      setIsConnected(true);
    } else {
      term.writeln(`\x1b[31mFailed to start terminal: ${res.error.message}\x1b[0m`);
    }

    // Forward keystrokes to PTY
    onDataDisposable = term.onData((data) => {
      window.coreMindAPI.terminalWrite(sessionId, data);
    });

    // Listen for data from backend PTY - strictly bound to this session and this term instance
    removeDataListener = window.coreMindAPI.onTerminalData((payload) => {
      if (payload.id === sessionId && xtermRef.current === term) {
        term.write(payload.data);
      }
    });

    // Listen for process exit - strictly bound to this session and this term instance
    removeExitListener = window.coreMindAPI.onTerminalExit((payload) => {
      if (payload.id === sessionId && xtermRef.current === term) {
        term.writeln(`\r\n\x1b[90m[Process completed (exit code ${payload.exitCode})]\x1b[0m\r\n`);
        setIsConnected(false);
      }
    });
  }, [rootPath]);

  useEffect(() => {
    initTerminal();

    // Observe container resize for auto-fitting
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          const cols = xtermRef.current.cols;
          const rows = xtermRef.current.rows;
          if (cols > 0 && rows > 0) {
            window.coreMindAPI.terminalResize(sessionIdRef.current, cols, rows);
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
  }, [initTerminal]);

  const handleClear = () => {
    xtermRef.current?.clear();
  };

  const handleRestart = () => {
    initTerminal();
  };

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
      {/* Header */}
      <div
        style={{
          height: '32px',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TerminalIcon size={13} color="var(--accent)" />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            TERMINAL
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '3px',
              backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isConnected ? '#22C55E' : '#EF4444',
              fontWeight: 500,
            }}
          >
            {isConnected ? 'zsh (active)' : 'offline'}
          </span>
          {rootName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '10px' }}>
              <Folder size={11} />
              <span>{rootName}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={handleRestart}
            title="Restart Terminal Session"
            style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: '4px' }}
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={handleClear}
            title="Clear Terminal Output"
            style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: '4px' }}
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={toggleTerminal}
            title="Close Panel (⌘J)"
            style={{ padding: '4px', color: 'var(--text-muted)', borderRadius: '4px' }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          padding: '6px 10px',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};
