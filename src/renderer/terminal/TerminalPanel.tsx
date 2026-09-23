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
  const [isConnected, setIsConnected] = useState(false);

  const initTerminal = useCallback(async () => {
    if (!terminalRef.current) return;

    // Clean up previous instance if restarting
    if (xtermRef.current) {
      window.coreMindAPI.closeTerminal(sessionIdRef.current);
      xtermRef.current.dispose();
      xtermRef.current = null;
    }

    const sessionId = `term-${Date.now()}`;
    sessionIdRef.current = sessionId;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.3,
      allowTransparency: true,
      theme: {
        background: '#151821',
        foreground: '#E6EAF2',
        cursor: '#818CF8',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
        black: '#191D27',
        red: '#EF4444',
        green: '#22C55E',
        yellow: '#F59E0B',
        blue: '#3B82F6',
        magenta: '#818CF8',
        cyan: '#06B6D4',
        white: '#E6EAF2',
        brightBlack: '#5B6376',
        brightRed: '#F87171',
        brightGreen: '#4ADE80',
        brightYellow: '#FBBF24',
        brightBlue: '#60A5FA',
        brightMagenta: '#A5B4FC',
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

    // Spawn backend PTY process
    const res = await window.coreMindAPI.createTerminal(sessionId, {
      cols: term.cols || 80,
      rows: term.rows || 24,
      cwd: rootPath || undefined,
    });

    if (res.success) {
      setIsConnected(true);
    } else {
      term.writeln(`\x1b[31mFailed to start terminal: ${res.error.message}\x1b[0m`);
    }

    // Forward keystrokes to PTY
    const onDataDisposable = term.onData((data) => {
      window.coreMindAPI.terminalWrite(sessionId, data);
    });

    // Listen for data from backend PTY
    const removeDataListener = window.coreMindAPI.onTerminalData((payload) => {
      if (payload.id === sessionIdRef.current && xtermRef.current) {
        xtermRef.current.write(payload.data);
      }
    });

    // Listen for process exit
    const removeExitListener = window.coreMindAPI.onTerminalExit((payload) => {
      if (payload.id === sessionIdRef.current && xtermRef.current) {
        xtermRef.current.writeln(`\r\n\x1b[90m[Process completed (exit code ${payload.exitCode})]\x1b[0m\r\n`);
        setIsConnected(false);
      }
    });

    return () => {
      onDataDisposable.dispose();
      removeDataListener();
      removeExitListener();
      window.coreMindAPI.closeTerminal(sessionId);
      term.dispose();
    };
  }, [rootPath]);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    initTerminal().then((cleanup) => {
      cleanupFn = cleanup;
    });

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
      if (cleanupFn) cleanupFn();
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
        backgroundColor: '#151821',
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
