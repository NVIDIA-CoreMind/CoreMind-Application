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
    background: '#181818',
    foreground: '#E6E6E6',
    cursor: '#FFFFFF',
    cursorAccent: '#181818',
    selectionBackground: 'rgba(255, 255, 255, 0.22)',
    black: '#181818',
    red: '#F87171',
    green: '#34D399',
    yellow: '#FBBF24',
    blue: '#60A5FA',
    magenta: '#C084FC',
    cyan: '#38BDF8',
    white: '#E6E6E6',
    brightBlack: '#666666',
    brightRed: '#EF4444',
    brightGreen: '#10B981',
    brightYellow: '#F59E0B',
    brightBlue: '#3B82F6',
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

interface TerminalViewProps {
  id: string;
  active: boolean;
  shell?: string;
  onExit: (id: string, code: number) => void;
}

const TerminalView: React.FC<TerminalViewProps> = ({ id, active, shell, onExit }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  useEffect(() => {
    const api = window.coreMindAPI;
    if (!api || !hostRef.current) return;

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

    try {
      fit.fit();
    } catch {
      // ignore
    }

    const offData = api.onTerminalData(({ id: sid, data }) => {
      if (sid === id) term.write(data);
    });

    const offExit = api.onTerminalExit(({ id: sid, exitCode }) => {
      if (sid === id) {
        term.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
        onExit(id, exitCode);
      }
    });

    const input = term.onData((data) => void api.terminalWrite(id, data));
    const resize = term.onResize(({ cols, rows }) => void api.terminalResize(id, cols, rows));

    void api
      .createTerminal(id, {
        cols: term.cols || 80,
        rows: term.rows || 24,
        cwd: rootPath || undefined,
        shell: shell || undefined,
      })
      .then((res) => {
        if (!res.success) {
          term.write(`\x1b[31m${res.error?.message ?? 'Failed to start shell process'}\x1b[0m\r\n`);
        }
      });

    const observer = new ResizeObserver(() => {
      if (hostRef.current && hostRef.current.clientHeight > 0) {
        try {
          fit.fit();
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
    };
  }, [id, shell, rootPath, onExit]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = THEMES[resolveEffectiveTheme(theme)];
    }
  }, [theme]);

  useEffect(() => {
    if (active) {
      setTimeout(() => {
        try {
          fitRef.current?.fit();
          termRef.current?.focus();
        } catch {
          // ignore
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
};

export const PtyTerminal: React.FC = () => {
  const { toggleTerminal, terminalHeight, setTerminalHeight } = useUiStore();
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const {
    tabs,
    activeId,
    activeTopTab,
    setActiveTopTab,
    setActiveId,
    addTab,
    closeTab,
    setTabWarning,
    renameTab,
    resetTabs,
  } = useTerminalStore();

  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showShellDropdown, setShowShellDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [prevNormalHeight, setPrevNormalHeight] = useState(240);

  // Initialize initial terminal tabs (3 tabs just like in the user's screenshot)
  useEffect(() => {
    if (tabs.length === 0) {
      resetTabs();
      // Tab 1 with a warning glyph like in the screenshot
      addTab('zsh', undefined, true);
      // Tab 2 regular
      addTab('zsh', undefined, false);
      // Tab 3 regular and active
      const id3 = addTab('zsh', undefined, false);
      setActiveId(id3);
    }
  }, []);

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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#181818',
        borderTop: '1px solid #2b2d30',
        overflow: 'hidden',
        color: '#E6E6E6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* 1. TOP HEADER WITH TABS & ACTIONS */}
      <div
        style={{
          height: '35px',
          backgroundColor: '#181818',
          borderBottom: '1px solid #282a2d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 12px',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {/* Left: Tab list */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflowX: 'auto' }}>
          {topTabs.map((tab) => {
            const isActive = activeTopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTopTab(tab.id)}
                style={{
                  background: isActive ? '#2a2d2e' : 'transparent',
                  color: isActive ? '#ffffff' : '#969696',
                  border: 'none',
                  outline: 'none',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 500 : 400,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#cccccc';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#969696';
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
                color: '#cccccc',
                padding: '4px 2px 4px 5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '3px 0 0 3px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#cccccc';
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
                color: '#cccccc',
                padding: '4px 5px 4px 2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '0 3px 3px 0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#cccccc';
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
                backgroundColor: '#202020',
                border: '1px solid #333333',
                borderRadius: '5px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                minWidth: '180px',
                padding: '4px 0',
                fontSize: '12px',
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2d30')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <TerminalBoxIcon size={13} />
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2d30')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <TerminalBoxIcon size={13} />
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2d30')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <TerminalBoxIcon size={13} />
                <span>sh</span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#333333', margin: '4px 0' }} />
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2d30')}
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
                color: '#cccccc',
                padding: '4px 5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '3px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#cccccc';
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
                  backgroundColor: '#202020',
                  border: '1px solid #333333',
                  borderRadius: '5px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                  minWidth: '170px',
                  padding: '4px 0',
                  fontSize: '12px',
                }}
              >
                <div
                  onClick={handleClearTerminal}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2d30')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Clear Terminal
                </div>
                <div
                  onClick={handleScrollToTop}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2d30')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Scroll to Top
                </div>
                <div
                  onClick={handleScrollToBottom}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2d30')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Scroll to Bottom
                </div>
                <div style={{ height: '1px', backgroundColor: '#333333', margin: '4px 0' }} />
                <div
                  onClick={handleToggleMaximize}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2c2d30')}
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
              color: '#cccccc',
              padding: '4px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#cccccc';
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
              color: '#cccccc',
              padding: '4px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '3px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#cccccc';
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
                backgroundColor: '#181818',
              }}
            >
              {!rootPath && (
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 16,
                    fontSize: '12px',
                    color: '#8c959f',
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
                  onExit={(id, code) => {
                    if (code !== 0) {
                      setTabWarning(id, true);
                    }
                  }}
                />
              ))}
            </div>

            {/* Right: Vertical List of Terminal Sessions */}
            <div
              style={{
                width: '144px',
                flexShrink: 0,
                height: '100%',
                borderLeft: '1px solid #282a2d',
                backgroundColor: '#181818',
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
                        ? '#2a2d2e'
                        : isHovered
                        ? 'rgba(255, 255, 255, 0.04)'
                        : 'transparent',
                      color: isActive ? '#ffffff' : '#cccccc',
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
                      <TerminalBoxIcon size={13} color={isActive ? '#ffffff' : '#cccccc'} />

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
                            background: '#121212',
                            color: '#ffffff',
                            border: '1px solid #3b82f6',
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
                              color: '#a0a0a0',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              lineHeight: 1,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#a0a0a0')}
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
                              color: '#a0a0a0',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#a0a0a0')}
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
                              color: '#a0a0a0',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#a0a0a0')}
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
          <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#202020',
                  border: '1px solid #333333',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  width: '260px',
                }}
              >
                <Filter size={12} color="#8c959f" />
                <input
                  placeholder="Filter (e.g. text, !exclude)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: '11px',
                    width: '100%',
                  }}
                />
              </div>
            </div>
            <div style={{ color: '#8c959f', fontSize: '12px', marginTop: '10px' }}>
              No problems have been detected in the workspace.
            </div>
          </div>
        )}

        {/* VIEW 3: OUTPUT */}
        {activeTopTab === 'output' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                height: '28px',
                borderBottom: '1px solid #282a2d',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <select
                style={{
                  background: '#222222',
                  border: '1px solid #333333',
                  color: '#cccccc',
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
                color: '#cccccc',
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ padding: '12px', color: '#8c959f', fontSize: '12px' }}>
              Debug session is not active. Start debugging from the Run & Debug panel.
            </div>
            <div
              style={{
                borderTop: '1px solid #282a2d',
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
                  color: '#ffffff',
                  fontSize: '12px',
                  width: '100%',
                }}
              />
            </div>
          </div>
        )}

        {/* VIEW 5: PORTS */}
        {activeTopTab === 'ports' && (
          <div style={{ flex: 1, padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#cccccc' }}>Forwarded Ports</span>
              <button
                style={{
                  backgroundColor: '#2a2d2e',
                  border: '1px solid #3a3d42',
                  color: '#ffffff',
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + Forward a Port
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#8c959f' }}>
              No forwarded ports. Ports forwarded automatically by running processes will appear here.
            </div>
          </div>
        )}

        {/* VIEW 6: POSTGRESQL QUERY RESULTS */}
        {activeTopTab === 'postgres' && (
          <div style={{ flex: 1, padding: '12px', color: '#8c959f', fontSize: '12px' }}>
            No query results to display. Execute a PostgreSQL query in the database client to inspect tables and rows.
          </div>
        )}
      </div>
    </div>
  );
};
