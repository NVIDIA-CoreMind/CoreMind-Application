import React from 'react';
import { X, Circle, Image as ImageIcon } from 'lucide-react';
import { useTabsStore, isImageFileName } from '../stores/tabsStore';
import { editorModelManager } from './EditorModelManager';
import { isMacClient, getShortcutDisplay } from '../../shared/utils/shortcuts';
import { RunDebugButton } from '../components/RunDebugButton';

export const EditorTabs: React.FC = () => {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const closeTab = useTabsStore((s) => s.closeTab);

  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();

  if (tabs.length === 0) return null;

  const handleClose = (e: React.MouseEvent, tabId: string, isDirty: boolean, fileName: string) => {
    e.stopPropagation();
    if (isDirty) {
      const confirm = window.confirm(
        `"${fileName}" has unsaved changes. Do you want to close it anyway?`
      );
      if (!confirm) return;
    }
    closeTab(tabId);
    editorModelManager.disposeModel(tabId);
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
              {isImageFileName(tab.fileName) || tab.language === 'image' ? (
                <ImageIcon size={13} style={{ color: '#38bdf8', flexShrink: 0 }} />
              ) : null}
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

      {/* Editor Action Toolbar (Run and Debug Button) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 8px',
          height: '100%',
          flexShrink: 0,
          borderLeft: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        <RunDebugButton />
      </div>
    </div>
  );
};

