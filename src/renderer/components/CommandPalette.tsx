import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, FolderOpen, Save, X, Terminal, Search, Settings, RefreshCw, Eye } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';
import { isMacClient, getShortcutDisplay } from '../../shared/utils/shortcuts';

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen, toggleSidebar, toggleTerminal, setActiveSidebarTab } = useUiStore();
  const { openFolderDialog, rootPath } = useWorkspaceStore();
  const { saveActiveTab, closeTab, activeTabId } = useTabsStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();

  const commands: CommandItem[] = [
    {
      id: 'open-folder',
      label: 'File: Open Folder...',
      shortcut: getShortcutDisplay('openFolder', isMac),
      icon: <FolderOpen size={14} />,
      action: () => openFolderDialog(),
    },
    {
      id: 'save-file',
      label: 'File: Save',
      shortcut: getShortcutDisplay('saveFile', isMac),
      icon: <Save size={14} />,
      action: () => {
        if (rootPath) saveActiveTab(rootPath);
      },
    },
    {
      id: 'close-tab',
      label: 'View: Close Active Tab',
      shortcut: getShortcutDisplay('closeTab', isMac),
      icon: <X size={14} />,
      action: () => {
        if (activeTabId) closeTab(activeTabId);
      },
    },
    {
      id: 'toggle-explorer',
      label: 'View: Toggle Primary Sidebar',
      shortcut: getShortcutDisplay('toggleSidebar', isMac),
      icon: <Eye size={14} />,
      action: () => toggleSidebar(),
    },
    {
      id: 'toggle-terminal',
      label: 'View: Toggle Terminal',
      shortcut: getShortcutDisplay('toggleTerminal', isMac),
      icon: <Terminal size={14} />,
      action: () => toggleTerminal(),
    },
    {
      id: 'search-project',
      label: 'Search: Find in Files',
      shortcut: getShortcutDisplay('search', isMac),
      icon: <Search size={14} />,
      action: () => {
        setActiveSidebarTab('search');
      },
    },
    {
      id: 'open-settings',
      label: 'Preferences: Open Settings',
      shortcut: getShortcutDisplay('settings', isMac),
      icon: <Settings size={14} />,
      action: () => {
        setActiveSidebarTab('settings');
      },
    },
    {
      id: 'reload-window',
      label: 'Developer: Reload Window',
      icon: <RefreshCw size={14} />,
      action: () => window.location.reload(),
    },
  ];


  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '60px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxHeight: '400px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <Sparkles size={16} color="var(--accent)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontSize: '13px',
              padding: 0,
            }}
          />
          <kbd
            style={{
              fontSize: '10px',
              backgroundColor: 'var(--bg-panel)',
              padding: '2px 5px',
              borderRadius: '3px',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', padding: '6px' }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No matching commands
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {cmd.icon}
                    </span>
                    <span style={{ fontSize: '12px' }}>{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd
                      style={{
                        fontSize: '10px',
                        backgroundColor: 'var(--bg-panel)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
