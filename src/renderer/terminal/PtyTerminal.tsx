import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  Trash2,
  X,
  Plus,
  ChevronDown,
  MoreHorizontal,
  Filter,
} from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useThemeStore, resolveEffectiveTheme } from '../stores/themeStore';
import { isWebBridgeInstalled } from '../services/webBridge';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTerminalStore, TopPanelTab } from '../stores/terminalStore';

// --- Antigravity & VS Code Precise SVG Codicons ---

const TerminalBoxIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({
  size = 14,
  className,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke={color}
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" strokeWidth="1.2" />
    <path d="M4.5 5.5L7 8L4.5 10.5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8.5" y1="10.5" x2="11.5" y2="10.5" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const SplitPaneIcon: React.FC<{ size?: number; color?: string }> = ({ size = 13, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke={color}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <rect x="2" y="2" width="12" height="12" rx="1.5" strokeWidth="1.2" />
    <line x1="8" y1="2" x2="8" y2="14" strokeWidth="1.2" />
  </svg>
);

const WarningGlyphIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <path d="M8 1.8L14.7 13.5H1.3L8 1.8Z" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    <path d="M8 5.8V9.2" stroke="#181818" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="8" cy="11.4" r="0.8" fill="#181818" />
  </svg>
);

const PanelToggleGlyphIcon: React.FC<{ size?: number; isMaximized?: boolean }> = ({ size = 14, isMaximized }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <rect x="2" y="2" width="12" height="12" rx="1.8" strokeWidth="1.2" />
    <line
      x1="2"
      y1={isMaximized ? '7' : '10.5'}
      x2="14"
      y2={isMaximized ? '7' : '10.5'}
      strokeWidth="1.2"
    />
  </svg>
);

const THEMES = {
  dark: {
    background: '#121212',
    foreground: '#E8EAED',
    cursor: '#38BDF8',
    cursorAccent: '#121212',
    selectionBackground: 'rgba(56, 189, 248, 0.25)',
    black: '#181818',
    red: '#F87171',
    green: '#4ADE80',
    yellow: '#FACC15',
    blue: '#38BDF8',
    magenta: '#C084FC',
    cyan: '#22D3EE',
    white: '#E8EAED',
    brightBlack: '#64748B',
    brightRed: '#EF4444',
    brightGreen: '#22C55E',
    brightYellow: '#EAB308',
    brightBlue: '#0EA5E9',
    brightMagenta: '#A855F7',
    brightCyan: '#06B6D4',
    brightWhite: '#FFFFFF',
  },
  light: {
    background: '#FFFFFF',
    foreground: '#1F2328',
    cursor: '#2563EB',
    cursorAccent: '#FFFFFF',
    selectionBackground: '#ADD6FF88',
    black: '#000000',
    red: '#CF222E',
    green: '#116329',
    yellow: '#4D2D00',
    blue: '#0969DA',
    magenta: '#8250DF',
    cyan: '#1B7C83',
    white: '#6E7781',
    brightBlack: '#57606A',
    brightRed: '#A40E26',
    brightGreen: '#1A7F37',
    brightYellow: '#633C01',
    brightBlue: '#218BFF',
    brightMagenta: '#A475F9',
    brightCyan: '#3192AA',
    brightWhite: '#8C959F',
  },
};

// Global map to hold term instances for direct operations (clear, scroll, etc.)
const terminalRegistry = new Map<string, { term: XTerm; fit: FitAddon }>();

const safeFit = (term?: XTerm | null, fit?: FitAddon | null) => {
  if (!term || !fit) return;
  try {
    const core = (term as unknown as { _core?: { _renderService?: { _renderer?: { value?: unknown } } } })._core;
    if (!core?._renderService?._renderer?.value) {
      return;
    }
    fit.fit();
  } catch {
    // ignore
  }
};

interface TerminalViewProps {
  id: string;
  active: boolean;
  shell?: string;
  onExit: (id: string, code: number) => void;
}

const TerminalView: React.FC<TerminalViewProps> = React.memo(({ id, active, shell, onExit }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const rootPathRef = useRef(rootPath);
  rootPathRef.current = rootPath;

  useEffect(() => {
    const api = window.coreMindAPI;
    if (!api || !hostRef.current) return;

    // Clear any stale child elements in container
    hostRef.current.innerHTML = '';

    const term = new XTerm({
      fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.28,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowProposedApi: true,
      theme: THEMES[resolveEffectiveTheme(useThemeStore.getState().theme)],
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    termRef.current = term;
    fitRef.current = fit;

    terminalRegistry.set(id, { term, fit });

    if (hostRef.current.clientWidth > 0 && hostRef.current.clientHeight > 0) {
      safeFit(term, fit);
    }

    const offData = api.onTerminalData(({ id: sid, data }) => {
      if (sid === id) term.write(data);
    });

    const offExit = api.onTerminalExit(({ id: sid, exitCode }) => {
      if (sid === id) {
        term.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
        onExitRef.current?.(id, exitCode);
      }
    });

    const input = term.onData((data) => void api.terminalWrite(id, data));
    const resize = term.onResize(({ cols, rows }) => void api.terminalResize(id, cols, rows));

    const initialCwd = rootPathRef.current || useWorkspaceStore.getState().rootPath || undefined;

    void api
      .createTerminal(id, {
        cols: term.cols || 80,
        rows: term.rows || 24,
        cwd: initialCwd,
        shell: shell || undefined,
      })
      .then((res) => {
        if (!res.success) {
          term.write(`\x1b[31m${res.error?.message ?? 'Failed to start shell process'}\x1b[0m\r\n`);
        }
      });

    const observer = new ResizeObserver(() => {
      if (hostRef.current && hostRef.current.clientWidth > 0 && hostRef.current.clientHeight > 0) {
        try {
          safeFit(term, fit);
          if (term.cols > 0 && term.rows > 0) {
            void api.terminalResize(id, term.cols, term.rows);
          }
        } catch {
          // ignore
        }
      }
    });
    observer.observe(hostRef.current);

    return () => {
      observer.disconnect();
      input.dispose();
      resize.dispose();
      offData();
      offExit();
      terminalRegistry.delete(id);
      void api.closeTerminal(id);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [id, shell]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = THEMES[resolveEffectiveTheme(theme)];
    }
  }, [theme]);

  useEffect(() => {
    if (active) {
      setTimeout(() => {
        if (hostRef.current && hostRef.current.clientWidth > 0 && hostRef.current.clientHeight > 0) {
          try {
            safeFit(termRef.current, fitRef.current);
            termRef.current?.focus();
          } catch {
            // ignore
          }
        }
      }, 30);
    }
  }, [active]);

  return (
    <div
      ref={hostRef}
      style={{
        position: 'absolute',
        inset: '2px 0 0 10px',
        display: active ? 'block' : 'none',
      }}
    />
  );
});

export const PtyTerminal: React.FC = () => {
  const toggleTerminal = useUiStore((s) => s.toggleTerminal);
  const terminalHeight = useUiStore((s) => s.terminalHeight);
  const setTerminalHeight = useUiStore((s) => s.setTerminalHeight);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';

  const tabs = useTerminalStore((s) => s.tabs);
  const activeId = useTerminalStore((s) => s.activeId);
  const activeTopTab = useTerminalStore((s) => s.activeTopTab);
  const setActiveTopTab = useTerminalStore((s) => s.setActiveTopTab);
  const setActiveId = useTerminalStore((s) => s.setActiveId);
  const addTab = useTerminalStore((s) => s.addTab);
  const closeTab = useTerminalStore((s) => s.closeTab);
  const setTabWarning = useTerminalStore((s) => s.setTabWarning);
  const renameTab = useTerminalStore((s) => s.renameTab);

  const handleExit = React.useCallback((id: string, code: number) => {
    if (code !== 0) {
      setTabWarning(id, true);
    }
  }, [setTabWarning]);

  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showShellDropdown, setShowShellDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [prevNormalHeight, setPrevNormalHeight] = useState(240);

  // Initialize single clean terminal session rooted in active workspace
  useEffect(() => {
    if (useTerminalStore.getState().tabs.length === 0) {
      const defaultShell = window.coreMindAPI?.platform?.isWindows ? 'powershell' : 'zsh';
      addTab(defaultShell, undefined, false);
    }
  }, [addTab]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.terminal-menu-trigger')) {
        setShowShellDropdown(false);
        setShowMoreMenu(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCreateNewTerminal = (title = 'zsh') => {
    const newId = addTab(title, undefined, false);
    setActiveId(newId);
    setShowShellDropdown(false);
  };

  const handleSplitTerminal = () => {
    const newId = addTab('zsh', undefined, false);
    setActiveId(newId);
  };

  const handleClearTerminal = () => {
    if (activeId && terminalRegistry.has(activeId)) {
      terminalRegistry.get(activeId)?.term.clear();
    }
    setShowMoreMenu(false);
  };

  const handleScrollToTop = () => {
    if (activeId && terminalRegistry.has(activeId)) {
      terminalRegistry.get(activeId)?.term.scrollToTop();
    }
    setShowMoreMenu(false);
  };

  const handleScrollToBottom = () => {
    if (activeId && terminalRegistry.has(activeId)) {
      terminalRegistry.get(activeId)?.term.scrollToBottom();
    }
    setShowMoreMenu(false);
  };

  const handleToggleMaximize = () => {
    setShowMoreMenu(false);
    if (terminalHeight < 420) {
      setPrevNormalHeight(terminalHeight);
      setTerminalHeight(520);
    } else {
      setTerminalHeight(prevNormalHeight || 240);
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  };

  const isMaximized = terminalHeight >= 420;

  const topTabs: { id: TopPanelTab; label: string }[] = [
    { id: 'problems', label: 'Problems' },
    { id: 'output', label: 'Output' },
    { id: 'debug', label: 'Debug Console' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'ports', label: 'Ports' },
    { id: 'postgres', label: 'PostgreSQL Query Results' },
  ];

  // A browser has no shell to attach to, so skip the xterm sessions and explain where a terminal runs.
  if (isWebBridgeInstalled()) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '16px',
          textAlign: 'center',
          fontSize: '13px',
          backgroundColor: isDark ? '#121212' : '#ffffff',
          color: isDark ? '#9ca3af' : '#6b7280',
        }}
      >
        The terminal runs in the CoreMind desktop app. A browser cannot start a shell on your machine.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: isDark ? '#121212' : '#ffffff',
        borderTop: `1px solid ${isDark ? '#262626' : '#e5e7eb'}`,
        overflow: 'hidden',
        color: isDark ? '#f3f4f6' : '#111827',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* 1. TOP HEADER WITH TABS & ACTIONS */}
      <div
        style={{
          height: '35px',
          backgroundColor: isDark ? '#181818' : '#f8f9fa',
          borderBottom: `1px solid ${isDark ? '#262626' : '#e5e7eb'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 12px',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {/* Left: Tab list */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
          {topTabs.map((tab) => {
            const isActive = activeTopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTopTab(tab.id)}
                style={{
                  background: isActive
                    ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')
                    : 'transparent',
                  color: isActive
                    ? (isDark ? '#ffffff' : '#111827')
                    : (isDark ? '#8c8c8c' : '#6b7280'),
                  border: 'none',
                  outline: 'none',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 500 : 400,
                  padding: '3px 9px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = isDark ? '#ffffff' : '#111827';
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = isDark ? '#8c8c8c' : '#6b7280';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Actions Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', position: 'relative' }}>
          {/* New Terminal / Shell Dropdown Trigger */}
          <div
            className="terminal-menu-trigger"
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'transparent',
              borderRadius: '3px',
            }}
          >
            <button
              onClick={() => handleCreateNewTerminal('zsh')}
              title="New Terminal"
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#cccccc' : '#6b7280',
                padding: '4px 2px 4px 5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '3px 0 0 3px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? '#ffffff' : '#111827';
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? '#cccccc' : '#6b7280';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowShellDropdown((v) => !v);
                setShowMoreMenu(false);
              }}
              title="Select Shell Profile..."
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#cccccc' : '#6b7280',
                padding: '4px 5px 4px 2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '0 3px 3px 0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? '#ffffff' : '#111827';
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? '#cccccc' : '#6b7280';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <ChevronDown size={11} />
            </button>
          </div>

          {/* Dropdown for Shells */}
          {showShellDropdown && (
            <div
              className="terminal-menu-trigger"
              style={{
                position: 'absolute',
                top: '28px',
                right: '70px',
                zIndex: 100,
                backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                border: `1px solid ${isDark ? '#333333' : '#e5e7eb'}`,
                borderRadius: '5px',
                boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                minWidth: '180px',
                padding: '4px 0',
                fontSize: '12px',
                color: isDark ? '#e5e5e5' : '#1f2937',
              }}
            >
              <div
                onClick={() => handleCreateNewTerminal('zsh')}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#2c2d30' : '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <TerminalBoxIcon size={13} color={isDark ? '#cccccc' : '#6b7280'} />
                <span>zsh (Default)</span>
              </div>
              <div
                onClick={() => handleCreateNewTerminal('bash')}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#2c2d30' : '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <TerminalBoxIcon size={13} color={isDark ? '#cccccc' : '#6b7280'} />
                <span>bash</span>
              </div>
              <div
                onClick={() => handleCreateNewTerminal('sh')}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#2c2d30' : '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <TerminalBoxIcon size={13} color={isDark ? '#cccccc' : '#6b7280'} />
                <span>sh</span>
              </div>
              <div style={{ height: '1px', backgroundColor: isDark ? '#333333' : '#e5e7eb', margin: '4px 0' }} />
              <div
                onClick={() => {
                  handleSplitTerminal();
                  setShowShellDropdown(false);
                }}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#2c2d30' : '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <SplitPaneIcon size={13} />
                <span>Split Terminal</span>
              </div>
            </div>
          )}

          {/* More Actions `...` Trigger */}
          <div className="terminal-menu-trigger" style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu((v) => !v);
                setShowShellDropdown(false);
              }}
              title="More Actions..."
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#cccccc' : '#6b7280',
                padding: '4px 5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '3px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? '#ffffff' : '#111827';
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? '#cccccc' : '#6b7280';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <MoreHorizontal size={14} />
            </button>

            {/* Dropdown for More Actions */}
            {showMoreMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '28px',
                  right: '0',
                  zIndex: 100,
                  backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
                  border: `1px solid ${isDark ? '#333333' : '#e5e7eb'}`,
                  borderRadius: '5px',
                  boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                  minWidth: '170px',
                  padding: '4px 0',
                  fontSize: '12px',
                  color: isDark ? '#e5e5e5' : '#1f2937',
                }}
              >
                <div
                  onClick={handleClearTerminal}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#2c2d30' : '#f3f4f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Clear Terminal
                </div>
                <div
                  onClick={handleScrollToTop}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#2c2d30' : '#f3f4f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Scroll to Top
                </div>
                <div
                  onClick={handleScrollToBottom}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#2c2d30' : '#f3f4f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Scroll to Bottom
                </div>
                <div style={{ height: '1px', backgroundColor: isDark ? '#333333' : '#e5e7eb', margin: '4px 0' }} />
                <div
                  onClick={handleToggleMaximize}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#2c2d30' : '#f3f4f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {isMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
                </div>
              </div>
            )}
          </div>

          {/* Toggle Panel Size / Maximize Icon */}
          <button
            onClick={handleToggleMaximize}
            title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#cccccc' : '#6b7280',
              padding: '4px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? '#ffffff' : '#111827';
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? '#cccccc' : '#6b7280';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <PanelToggleGlyphIcon size={14} isMaximized={isMaximized} />
          </button>

          {/* Close Panel Button */}
          <button
            onClick={toggleTerminal}
            title="Close Panel"
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#cccccc' : '#6b7280',
              padding: '4px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? '#ffffff' : '#111827';
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? '#cccccc' : '#6b7280';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {/* VIEW 1: TERMINAL (DEFAULT & PRIMARY) */}
        {activeTopTab === 'terminal' && (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Left: Terminal output */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                position: 'relative',
                height: '100%',
                backgroundColor: isDark ? '#121212' : '#ffffff',
              }}
            >
              {!rootPath && (
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 16,
                    fontSize: '12px',
                    color: isDark ? '#8c8c8c' : '#6b7280',
                    zIndex: 5,
                  }}
                >
                  Open a folder to start a workspace terminal session.
                </div>
              )}
              {tabs.map((tab) => (
                <TerminalView
                  key={tab.id}
                  id={tab.id}
                  active={tab.id === activeId}
                  shell={tab.shell}
                  onExit={handleExit}
                />
              ))}
            </div>

            {/* Right: Vertical List of Terminal Sessions */}
            <div
              style={{
                width: '144px',
                flexShrink: 0,
                height: '100%',
                borderLeft: `1px solid ${isDark ? '#242424' : '#e5e7eb'}`,
                backgroundColor: isDark ? '#161616' : '#f9fafb',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                userSelect: 'none',
              }}
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeId;
                const isHovered = hoveredTabId === tab.id;

                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveId(tab.id)}
                    onMouseEnter={() => setHoveredTabId(tab.id)}
                    onMouseLeave={() => setHoveredTabId(null)}
                    style={{
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 8px 0 10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      backgroundColor: isActive
                        ? (isDark ? '#222222' : '#e5e7eb')
                        : isHovered
                        ? (isDark ? '#1c1c1c' : '#f3f4f6')
                        : 'transparent',
                      color: isActive ? (isDark ? '#ffffff' : '#111827') : (isDark ? '#8c8c8c' : '#6b7280'),
                      borderLeft: isActive ? `2px solid ${isDark ? '#38bdf8' : '#2563eb'}` : '2px solid transparent',
                      transition: 'background-color 0.1s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Left: Boxed `>_` icon & Name */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0,
                        overflow: 'hidden',
                        flex: 1,
                      }}
                    >
                      <TerminalBoxIcon
                        size={13}
                        color={isActive ? (isDark ? '#ffffff' : '#111827') : (isDark ? '#cccccc' : '#6b7280')}
                      />

                      {editingTabId === tab.id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameTab(tab.id, editTitle);
                              setEditingTabId(null);
                            } else if (e.key === 'Escape') {
                              setEditingTabId(null);
                            }
                          }}
                          onBlur={() => {
                            renameTab(tab.id, editTitle);
                            setEditingTabId(null);
                          }}
                          style={{
                            background: isDark ? '#121212' : '#ffffff',
                            color: isDark ? '#ffffff' : '#111827',
                            border: `1px solid ${isDark ? '#3b82f6' : '#2563eb'}`,
                            borderRadius: '2px',
                            fontSize: '11.5px',
                            padding: '1px 3px',
                            width: '60px',
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingTabId(tab.id);
                            setEditTitle(tab.title);
                          }}
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '12px',
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {tab.title}
                        </span>
                      )}
                    </div>

                    {/* Right: Actions on Hover or Warning State */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      {/* When Hovered: Quick actions `@`, `◫`, `🗑` */}
                      {isHovered ? (
                        <>
                          {/* Info / Config action `@` */}
                          <button
                            title="Terminal Process Info"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isDark ? '#a0a0a0' : '#6b7280',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              lineHeight: 1,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#a0a0a0' : '#6b7280')}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>@</span>
                          </button>

                          {/* Split Pane Icon */}
                          <button
                            title="Split Terminal"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSplitTerminal();
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isDark ? '#a0a0a0' : '#6b7280',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#a0a0a0' : '#6b7280')}
                          >
                            <SplitPaneIcon size={12} />
                          </button>

                          {/* Trash / Kill Icon */}
                          <button
                            title="Kill Terminal"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(tab.id);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isDark ? '#a0a0a0' : '#6b7280',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#a0a0a0' : '#6b7280')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        /* When NOT Hovered: Show Warning glyph if present */
                        tab.hasWarning && <WarningGlyphIcon size={13} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: PROBLEMS */}
        {activeTopTab === 'problems' && (
          <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: isDark ? '#121212' : '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: isDark ? '#202020' : '#f3f4f6',
                  border: `1px solid ${isDark ? '#333333' : '#e5e7eb'}`,
                  borderRadius: '4px',
                  padding: '3px 8px',
                  width: '260px',
                }}
              >
                <Filter size={12} color={isDark ? '#8c959f' : '#6b7280'} />
                <input
                  placeholder="Filter (e.g. text, !exclude)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: isDark ? '#ffffff' : '#111827',
                    fontSize: '11px',
                    width: '100%',
                  }}
                />
              </div>
            </div>
            <div style={{ color: isDark ? '#8c959f' : '#6b7280', fontSize: '12px', marginTop: '10px' }}>
              No problems have been detected in the workspace.
            </div>
          </div>
        )}

        {/* VIEW 3: OUTPUT */}
        {activeTopTab === 'output' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: isDark ? '#121212' : '#ffffff' }}>
            <div
              style={{
                height: '28px',
                borderBottom: `1px solid ${isDark ? '#282a2d' : '#e5e7eb'}`,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <select
                style={{
                  background: isDark ? '#222222' : '#f9fafb',
                  border: `1px solid ${isDark ? '#333333' : '#e5e7eb'}`,
                  color: isDark ? '#cccccc' : '#111827',
                  fontSize: '11px',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  outline: 'none',
                }}
              >
                <option>CoreMind AI Agent</option>
                <option>Tasks</option>
                <option>Git</option>
                <option>Window</option>
              </select>
            </div>
            <div
              style={{
                flex: 1,
                padding: '10px 14px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: isDark ? '#cccccc' : '#374151',
                lineHeight: '1.5',
                overflowY: 'auto',
              }}
            >
              <div>[CoreMind Output] Environment initialized.</div>
              <div>[CoreMind Output] Workspace: {rootPath || 'None'}</div>
              <div>[CoreMind Output] Ready.</div>
            </div>
          </div>
        )}

        {/* VIEW 4: DEBUG CONSOLE */}
        {activeTopTab === 'debug' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: isDark ? '#121212' : '#ffffff' }}>
            <div style={{ padding: '12px', color: isDark ? '#8c959f' : '#6b7280', fontSize: '12px' }}>
              Debug session is not active. Start debugging from the Run & Debug panel.
            </div>
            <div
              style={{
                borderTop: `1px solid ${isDark ? '#282a2d' : '#e5e7eb'}`,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ color: '#3b82f6', fontSize: '13px' }}>&gt;</span>
              <input
                placeholder="Evaluate in debug console..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: isDark ? '#ffffff' : '#111827',
                  fontSize: '12px',
                  width: '100%',
                }}
              />
            </div>
          </div>
        )}

        {/* VIEW 5: PORTS */}
        {activeTopTab === 'ports' && (
          <div style={{ flex: 1, padding: '12px', backgroundColor: isDark ? '#121212' : '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: isDark ? '#cccccc' : '#111827' }}>Forwarded Ports</span>
              <button
                style={{
                  backgroundColor: isDark ? '#2a2d2e' : '#f3f4f6',
                  border: `1px solid ${isDark ? '#3a3d42' : '#e5e7eb'}`,
                  color: isDark ? '#ffffff' : '#111827',
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + Forward a Port
              </button>
            </div>
            <div style={{ fontSize: '12px', color: isDark ? '#8c959f' : '#6b7280' }}>
              No forwarded ports. Ports forwarded automatically by running processes will appear here.
            </div>
          </div>
        )}

        {/* VIEW 6: POSTGRESQL QUERY RESULTS */}
        {activeTopTab === 'postgres' && (
          <div style={{ flex: 1, padding: '12px', color: isDark ? '#8c959f' : '#6b7280', fontSize: '12px', backgroundColor: isDark ? '#121212' : '#ffffff' }}>
            No query results to display. Execute a PostgreSQL query in the database client to inspect tables and rows.
          </div>
        )}
      </div>
    </div>
  );
};
