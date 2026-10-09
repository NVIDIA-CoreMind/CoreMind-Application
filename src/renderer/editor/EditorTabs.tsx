import React, { useState } from 'react';
import { X, Circle, Play, Loader2 } from 'lucide-react';
import { useTabsStore } from '../stores/tabsStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTerminalStore } from '../stores/terminalStore';
import { editorModelManager } from './EditorModelManager';
import { isMacClient, isWindowsClient, getShortcutDisplay } from '../../shared/utils/shortcuts';

export const EditorTabs: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, saveActiveTab } = useTabsStore();
  const { rootPath } = useWorkspaceStore();
  const { runCommand } = useTerminalStore();
  const [isRunning, setIsRunning] = useState(false);

  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : isWindowsClient();

  if (tabs.length === 0) return null;

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const ext = activeTab?.fileName.split('.').pop()?.toLowerCase();
  const isPython = activeTab?.language === 'python' || ext === 'py';
  const isRunnable = isPython || ext === 'js' || ext === 'ts' || ext === 'sh' || ext === 'bash';

  const handleRun = async () => {
    if (!activeTab || isRunning) return;
    setIsRunning(true);
    try {
      if (activeTab.isDirty && rootPath) {
        await saveActiveTab(rootPath);
      }

      let cmd = '';
      if (isPython) {
        cmd = isWindows ? `python "${activeTab.filePath}"` : `python3 "${activeTab.filePath}"`;
      } else if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
        cmd = `node "${activeTab.filePath}"`;
      } else if (ext === 'ts') {
        cmd = `npx tsx "${activeTab.filePath}"`;
      } else if (ext === 'sh' || ext === 'bash') {
        cmd = `bash "${activeTab.filePath}"`;
      }

      if (cmd) {
        await runCommand(cmd);
      }
    } finally {
      setTimeout(() => setIsRunning(false), 500);
    }
  };

  const handleClose = (e: React.MouseEvent, tabId: string, isDirty: boolean, fileName: string) => {
    e.stopPropagation();
    if (isDirty) {
      const confirm = window.confirm(
        `"${fileName}" has unsaved changes. Do you want to close it anyway?`
      );
      if (!confirm) return;
    }
    editorModelManager.disposeModel(tabId);
    closeTab(tabId);
  };

  const handleMouseDown = (e: React.MouseEvent, tabId: string, isDirty: boolean, fileName: string) => {
    // Middle click (button 1) to close tab
    if (e.button === 1) {
      e.preventDefault();
      handleClose(e, tabId, isDirty, fileName);
    }
  };

  return (
    <div
      style={{
        height: '35px',
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        userSelect: 'none',
      }}
    >
      {/* Tab Items List */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          flex: 1,
          minWidth: 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseDown={(e) => handleMouseDown(e, tab.id, tab.isDirty, tab.fileName)}
              title={tab.filePath}
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--bg-panel)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRight: '1px solid var(--border-color)',
                borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                whiteSpace: 'nowrap',
                position: 'relative',
                transition: 'background-color 0.15s ease',
              }}
            >
              <span>{tab.fileName}</span>

              {/* Dirty Indicator / Close Button */}
              <div style={{ display: 'flex', alignItems: 'center', width: '16px', justifyContent: 'center' }}>
                {tab.isDirty ? (
                  <div
                    title="Unsaved changes"
                    onClick={(e) => handleClose(e, tab.id, tab.isDirty, tab.fileName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Circle size={8} fill="var(--accent)" color="var(--accent)" />
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleClose(e, tab.id, tab.isDirty, tab.fileName)}
                    title={`Close tab (${getShortcutDisplay('closeTab', isMac)})`}
                    style={{
                      padding: '2px',
                      borderRadius: '3px',
                      color: 'var(--text-muted)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Action Toolbar (Run Button) */}
      {isRunnable && activeTab && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 10px',
            height: '100%',
            flexShrink: 0,
            borderLeft: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          <button
            onClick={handleRun}
            disabled={isRunning}
            title={isPython ? 'Run Python File in Terminal' : `Run ${activeTab.fileName} in Terminal`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11.5px',
              fontWeight: 500,
              backgroundColor: 'var(--accent-bg, rgba(59, 130, 246, 0.12))',
              color: 'var(--accent, #3B82F6)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              cursor: isRunning ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isRunning ? (
              <Loader2 size={13} className="animate-spin" color="var(--accent, #3B82F6)" />
            ) : (
              <Play size={12} fill="var(--accent, #3B82F6)" color="var(--accent, #3B82F6)" />
            )}
            <span>{isPython ? 'Run Python' : 'Run File'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
