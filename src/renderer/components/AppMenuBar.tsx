import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  PanelLeft,
  Terminal,
  Bot,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';
import { useThemeStore } from '../stores/themeStore';
import { useUiStore } from '../stores/uiStore';
import { isMacClient, getShortcutDisplay } from '../../shared/utils/shortcuts';

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export const AppMenuBar: React.FC = () => {
  const { rootPath, openFolderDialog } = useWorkspaceStore();
  const { saveActiveTab, closeTab, activeTabId, createUntitledTab } = useTabsStore();
  const { theme, toggleTheme } = useThemeStore();
  const {
    isSidebarOpen,
    toggleSidebar,
    isTerminalOpen,
    toggleTerminal,
    isRightPanelOpen,
    toggleRightPanel,
    setCommandPaletteOpen,
    setQuickOpenOpen,
  } = useUiStore();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const menuDefinitions: Record<string, MenuItem[]> = {
    File: [
      {
        label: 'New File',
        shortcut: getShortcutDisplay('newFile', isMac),
        action: () => createUntitledTab(),
      },
      {
        label: 'Open Folder...',
        shortcut: getShortcutDisplay('openFolder', isMac),
        action: () => void openFolderDialog(),
      },
      { separator: true },
      {
        label: 'Save',
        shortcut: getShortcutDisplay('saveFile', isMac),
        action: () => {
          if (rootPath) void saveActiveTab(rootPath);
        },
        disabled: !activeTabId,
      },
      {
        label: 'Close Tab',
        shortcut: getShortcutDisplay('closeTab', isMac),
        action: () => {
          if (activeTabId) closeTab(activeTabId);
        },
        disabled: !activeTabId,
      },
      { separator: true },
      {
        label: isMac ? 'Quit CoreMind' : 'Exit',
        shortcut: isMac ? '⌘Q' : 'Alt+F4',
        action: () => {
          if (window.coreMindAPI?.closeWindow) {
            void window.coreMindAPI.closeWindow();
          } else {
            window.close();
          }
        },
      },
    ],
    Edit: [
      {
        label: 'Undo',
        shortcut: isMac ? '⌘Z' : 'Ctrl+Z',
        action: () => document.execCommand('undo'),
      },
      {
        label: 'Redo',
        shortcut: isMac ? '⇧⌘Z' : 'Ctrl+Y',
        action: () => document.execCommand('redo'),
      },
      { separator: true },
      {
        label: 'Cut',
        shortcut: isMac ? '⌘X' : 'Ctrl+X',
        action: () => document.execCommand('cut'),
      },
      {
        label: 'Copy',
        shortcut: isMac ? '⌘C' : 'Ctrl+C',
        action: () => document.execCommand('copy'),
      },
      {
        label: 'Paste',
        shortcut: isMac ? '⌘V' : 'Ctrl+V',
        action: () => {
          navigator.clipboard.readText().then((text) => {
            document.execCommand('insertText', false, text);
          }).catch(() => undefined);
        },
      },
      { separator: true },
      {
        label: 'Select All',
        shortcut: isMac ? '⌘A' : 'Ctrl+A',
        action: () => document.execCommand('selectAll'),
      },
    ],
    View: [
      {
        label: 'Command Palette...',
        shortcut: getShortcutDisplay('commandPalette', isMac),
        action: () => setCommandPaletteOpen(true),
      },
      {
        label: 'Quick Open...',
        shortcut: getShortcutDisplay('quickOpen', isMac),
        action: () => setQuickOpenOpen(true),
      },
      { separator: true },
      {
        label: isSidebarOpen ? 'Hide Primary Sidebar' : 'Show Primary Sidebar',
        shortcut: getShortcutDisplay('toggleSidebar', isMac),
        action: () => toggleSidebar(),
      },
      {
        label: isTerminalOpen ? 'Hide Terminal' : 'Show Terminal',
        shortcut: getShortcutDisplay('toggleTerminal', isMac),
        action: () => toggleTerminal(),
      },
      {
        label: isRightPanelOpen ? 'Hide CoreMind AI' : 'Show CoreMind AI',
        shortcut: getShortcutDisplay('toggleAgent', isMac),
        action: () => toggleRightPanel(),
      },
    ],
    Window: [
      {
        label: 'Minimize',
        shortcut: isMac ? '⌘M' : undefined,
        action: () => {
          void window.coreMindAPI?.minimizeWindow?.();
        },
      },
      {
        label: 'Zoom / Maximize',
        action: () => {
          void window.coreMindAPI?.maximizeWindow?.();
        },
      },
      { separator: true },
      {
        label: 'Close Window',
        shortcut: isMac ? '⇧⌘W' : undefined,
        action: () => {
          if (window.coreMindAPI?.closeWindow) {
            void window.coreMindAPI.closeWindow();
          } else {
            window.close();
          }
        },
      },
    ],
  };

  const handleMenuClick = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const handleMenuHover = (name: string) => {
    if (openMenu !== null && openMenu !== name) {
      setOpenMenu(name);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled || item.separator) return;
    setOpenMenu(null);
    item.action?.();
  };

  if (isMac) {
    return null;
  }

  return (
    <div
      ref={menuBarRef}
      className="app-no-drag"
      style={{
        height: '30px',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        fontSize: '12px',
        userSelect: 'none',
        position: 'relative',
        zIndex: 45,
        flexShrink: 0,
      }}
    >
      {/* Left: VS Code-style Application Menus (File, Edit, View, Window) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', position: 'relative' }}>
        {Object.keys(menuDefinitions).map((menuName) => {
          const isOpen = openMenu === menuName;
          const items = menuDefinitions[menuName];

          return (
            <div key={menuName} style={{ position: 'relative' }}>
              <button
                onClick={() => handleMenuClick(menuName)}
                onMouseEnter={() => handleMenuHover(menuName)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isOpen ? 'var(--bg-hover)' : 'transparent',
                  fontWeight: 400,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {menuName}
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 2px)',
                    left: 0,
                    minWidth: '200px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
                    padding: '4px 0',
                    zIndex: 100,
                  }}
                >
                  {items.map((item, idx) => {
                    if (item.separator) {
                      return (
                        <div
                          key={`sep-${idx}`}
                          style={{
                            height: '1px',
                            backgroundColor: 'var(--border-color)',
                            margin: '4px 0',
                          }}
                        />
                      );
                    }

                    return (
                      <div
                        key={item.label || idx}
                        onClick={() => handleItemClick(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 12px',
                          fontSize: '12px',
                          color: item.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                          cursor: item.disabled ? 'default' : 'pointer',
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!item.disabled) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              marginLeft: '20px',
                            }}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Toolbar Quick Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={toggleSidebar}
          title={`Toggle Primary Sidebar (${getShortcutDisplay('toggleSidebar', isMac)})`}
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: isSidebarOpen ? 'var(--text-primary)' : 'var(--text-muted)',
            backgroundColor: isSidebarOpen ? 'var(--bg-active)' : 'transparent',
          }}
        >
          <PanelLeft size={14} />
        </button>

        <button
          onClick={toggleTerminal}
          title={`Toggle Terminal (${getShortcutDisplay('toggleTerminal', isMac)})`}
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: isTerminalOpen ? 'var(--text-primary)' : 'var(--text-muted)',
            backgroundColor: isTerminalOpen ? 'var(--bg-active)' : 'transparent',
          }}
        >
          <Terminal size={14} />
        </button>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
          style={{ padding: '5px', borderRadius: '4px', color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button
          onClick={toggleRightPanel}
          title="Toggle CoreMind AI Agent"
          style={{
            padding: '5px',
            borderRadius: '4px',
            color: isRightPanelOpen ? 'var(--accent)' : 'var(--text-muted)',
            backgroundColor: isRightPanelOpen ? 'var(--accent-bg)' : 'transparent',
          }}
        >
          <Bot size={14} />
        </button>
      </div>
    </div>
  );
};
