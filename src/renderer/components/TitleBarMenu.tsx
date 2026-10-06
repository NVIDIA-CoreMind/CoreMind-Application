import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';
import { useUiStore } from '../stores/uiStore';
import { isMacClient, getShortcutDisplay } from '../../shared/utils/shortcuts';

export interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export const TitleBarMenu: React.FC = () => {
  const { rootPath, openFolderDialog } = useWorkspaceStore();
  const { saveActiveTab, closeTab, activeTabId, createUntitledTab } = useTabsStore();
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

  return (
    <div
      ref={menuBarRef}
      className="app-no-drag"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        position: 'relative',
        height: '100%',
      }}
    >
      {Object.keys(menuDefinitions).map((menuName) => {
        const isOpen = openMenu === menuName;
        const items = menuDefinitions[menuName];

        return (
          <div
            key={menuName}
            style={{
              position: 'relative',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
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
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                userSelect: 'none',
              }}
            >
              {menuName}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
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
  );
};
