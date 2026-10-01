import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Plus, X, Terminal as TerminalIcon } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useThemeStore } from '../stores/themeStore';
import { useWorkspaceStore } from '../stores/workspaceStore';

const THEMES = {
  dark: { background: '#181818', foreground: '#d4d4d4', cursor: '#10b981', selectionBackground: '#264f7888' },
  light: { background: '#ffffff', foreground: '#1f2328', cursor: '#059669', selectionBackground: '#add6ff88' },
};

let sessionCounter = 0;

interface TerminalViewProps {
  id: string;
  active: boolean;
  onExit: (id: string) => void;
}

const TerminalView: React.FC<TerminalViewProps> = ({ id, active, onExit }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const api = window.coreMindAPI;
    if (!api || !hostRef.current) return;

    const term = new XTerm({
      fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, monospace",
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: true,
      theme: THEMES[useThemeStore.getState().theme],
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    termRef.current = term;
    fitRef.current = fit;
    fit.fit();

    const offData = api.onTerminalData(({ id: sid, data }) => {
      if (sid === id) term.write(data);
    });
    const offExit = api.onTerminalExit(({ id: sid, exitCode }) => {
      if (sid === id) {
        term.write(`\r\n\x1b[90m[process exited with code ${exitCode}]\x1b[0m\r\n`);
        onExit(id);
      }
    });
    const input = term.onData((data) => void api.terminalWrite(id, data));
    const resize = term.onResize(({ cols, rows }) => void api.terminalResize(id, cols, rows));

    void api.createTerminal(id, { cols: term.cols, rows: term.rows }).then((res) => {
      if (!res.success) {
        term.write(`\x1b[31m${res.error?.message ?? 'Failed to start shell'}\x1b[0m\r\n`);
      }
    });

    const observer = new ResizeObserver(() => {
      if (hostRef.current && hostRef.current.clientHeight > 0) fit.fit();
    });
    observer.observe(hostRef.current);

    return () => {
      observer.disconnect();
      input.dispose();
      resize.dispose();
      offData();
      offExit();
      void api.closeTerminal(id);
      term.dispose();
    };
  }, [id, onExit]);

  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = THEMES[theme];
  }, [theme]);

  useEffect(() => {
    if (active) {
      fitRef.current?.fit();
      termRef.current?.focus();
    }
  }, [active]);

  return (
    <div
      ref={hostRef}
      style={{ position: 'absolute', inset: '4px 0 0 12px', display: active ? 'block' : 'none' }}
    />
  );
};

export const PtyTerminal: React.FC = () => {
  const { toggleTerminal } = useUiStore();
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [tabs, setTabs] = useState<{ id: string; title: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const addTab = useCallback(() => {
    sessionCounter += 1;
    const id = `pty-${Date.now()}-${sessionCounter}`;
    setTabs((t) => [...t, { id, title: `Terminal ${sessionCounter}` }]);
    setActiveId(id);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((t) => {
      const next = t.filter((x) => x.id !== id);
      setActiveId((cur) => (cur === id ? (next[next.length - 1]?.id ?? null) : cur));
      return next;
    });
  }, []);

  // Shells are bound to the authorized workspace, so restart them when it changes.
  useEffect(() => {
    setTabs([]);
    setActiveId(null);
    if (rootPath) addTab();
  }, [rootPath, addTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-panel)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          padding: '0 8px',
          borderBottom: '1px solid var(--border-color)',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--text-muted)', marginRight: '8px' }}>
          TERMINAL
        </span>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              color: tab.id === activeId ? 'var(--text-primary)' : 'var(--text-muted)',
              backgroundColor: tab.id === activeId ? 'var(--bg-active)' : 'transparent',
            }}
          >
            <TerminalIcon size={12} />
            {tab.title}
            <X
              size={12}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            />
          </div>
        ))}
        <button onClick={addTab} title="New Terminal" style={{ padding: '4px', color: 'var(--text-muted)' }}>
          <Plus size={14} />
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={toggleTerminal} title="Close Panel" style={{ padding: '4px', color: 'var(--text-muted)' }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {!rootPath && (
          <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Open a folder to start a terminal in your workspace.
          </div>
        )}
        {tabs.map((tab) => (
          <TerminalView key={tab.id} id={tab.id} active={tab.id === activeId} onExit={() => undefined} />
        ))}
      </div>
    </div>
  );
};
