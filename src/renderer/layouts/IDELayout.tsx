import React from 'react';
import { TitleBar } from '../components/TitleBar';
import { ActivityBar } from '../components/ActivityBar';
import { StatusBar } from '../components/StatusBar';
import { ResizableSplitter } from '../components/ResizableSplitter';
import { FileExplorer } from '../explorer/FileExplorer';
import { SearchPanel } from '../search/SearchPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { MonacoEditor } from '../editor/MonacoEditor';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { WorkspaceInfoPanel } from '../components/WorkspaceInfoPanel';
import { CommandPalette } from '../components/CommandPalette';
import { QuickOpen } from '../components/QuickOpen';
import { useUiStore } from '../stores/uiStore';

export const IDELayout: React.FC = () => {
  const {
    activeSidebarTab,
    isSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    isRightPanelOpen,
    rightPanelWidth,
    setRightPanelWidth,
    isTerminalOpen,
    terminalHeight,
    setTerminalHeight,
  } = useUiStore();

  const renderSidebarContent = () => {
    switch (activeSidebarTab) {
      case 'explorer':
        return <FileExplorer />;
      case 'search':
        return <SearchPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <FileExplorer />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-app)',
        overflow: 'hidden',
      }}
    >
      {/* Top Title Bar */}
      <TitleBar />

      {/* Center Body: Activity Bar + Sidebar + Editor + Terminal + Right Panel */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Activity Bar */}
        <ActivityBar />

        {/* Primary Sidebar (Collapsible & Resizable) */}
        {isSidebarOpen && (
          <>
            <div
              style={{
                width: `${sidebarWidth}px`,
                height: '100%',
                flexShrink: 0,
                borderRight: '1px solid var(--border-color)',
                overflow: 'hidden',
              }}
            >
              {renderSidebarContent()}
            </div>
            <ResizableSplitter
              direction="horizontal"
              onResize={(delta) => setSidebarWidth(sidebarWidth + delta)}
            />
          </>
        )}

        {/* Central Work Area (Editor + Bottom Terminal) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            height: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-panel)',
          }}
        >
          {/* Main Editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <MonacoEditor />
          </div>

          {/* Integrated Terminal (Collapsible & Resizable) */}
          {isTerminalOpen && (
            <>
              <ResizableSplitter
                direction="vertical"
                onResize={(delta) => setTerminalHeight(terminalHeight + delta)}
              />
              <div
                style={{
                  height: `${terminalHeight}px`,
                  width: '100%',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                <TerminalPanel />
              </div>
            </>
          )}
        </div>

        {/* Right Info Panel (Collapsible & Resizable) */}
        {isRightPanelOpen && (
          <>
            <ResizableSplitter
              direction="horizontal"
              onResize={(delta) => setRightPanelWidth(rightPanelWidth - delta)}
            />
            <div
              style={{
                width: `${rightPanelWidth}px`,
                height: '100%',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <WorkspaceInfoPanel />
            </div>
          </>
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Modals & Overlays */}
      <CommandPalette />
      <QuickOpen />
    </div>
  );
};
