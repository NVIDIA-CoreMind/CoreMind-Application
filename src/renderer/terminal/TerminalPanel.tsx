import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Trash2, X, Terminal as TerminalIcon } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';

export const TerminalPanel: React.FC = () => {
  const { toggleTerminal } = useUiStore();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.3,
      theme: {
        background: '#151821',
        foreground: '#E6EAF2',
        cursor: '#6366F1',
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

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // CoreMind Welcome Banner
    term.writeln('\x1b[1;35mCoreMind Terminal\x1b[0m — macOS Apple Silicon (arm64)');
    term.writeln('\x1b[90mTerminal execution will be enabled in the next development phase (Phase 2 with node-pty).\x1b[0m');
    term.writeln('\x1b[90mType "help" for a list of available built-in commands.\x1b[0m');
    term.writeln('');

    let currentLine = '';
    const prompt = () => term.write('\x1b[1;32mcoremind\x1b[0m:\x1b[1;34m~$\x1b[0m ');
    prompt();

    const disposable = term.onData((data) => {
      // Enter key
      if (data === '\r') {
        term.writeln('');
        const trimmed = currentLine.trim();

        if (trimmed === 'clear') {
          term.clear();
        } else if (trimmed === 'help') {
          term.writeln('  \x1b[1;33mclear\x1b[0m       - Clear terminal output');
          term.writeln('  \x1b[1;33mstatus\x1b[0m      - Print CoreMind runtime info');
          term.writeln('  \x1b[1;33marchitecture\x1b[0m- Display system architecture');
          term.writeln('  \x1b[1;33mhelp\x1b[0m        - Show this message');
        } else if (trimmed === 'status') {
          term.writeln('  CoreMind IDE: \x1b[1;32mv0.1.0 (Phase 1 Foundation)\x1b[0m');
          term.writeln('  Platform:     macOS Darwin');
          term.writeln('  Target:       Apple Silicon M4 (arm64)');
          term.writeln('  Status:       Ready');
        } else if (trimmed === 'architecture') {
          term.writeln('  Architecture: arm64 (Apple M4 Optimized)');
          term.writeln('  Engine:       Electron + Vite + Monaco + xterm');
        } else if (trimmed.length > 0) {
          term.writeln(`  coremind: command not found: ${trimmed} (Live execution disabled in Phase 1)`);
        }

        currentLine = '';
        prompt();
      }
      // Backspace
      else if (data === '\u007F') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
      }
      // Printable characters
      else if (data >= ' ' && data <= '~') {
        currentLine += data;
        term.write(data);
      }
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit error if unmounted
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      disposable.dispose();
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  const handleClear = () => {
    xtermRef.current?.clear();
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
          height: '30px',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TerminalIcon size={13} color="var(--accent)" />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            TERMINAL
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={handleClear}
            title="Clear Terminal"
            style={{ padding: '3px', color: 'var(--text-muted)' }}
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={toggleTerminal}
            title="Close Panel (⌘J)"
            style={{ padding: '3px', color: 'var(--text-muted)' }}
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
          padding: '8px 12px',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};
