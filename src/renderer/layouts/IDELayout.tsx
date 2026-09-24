import React from 'react';
import { TitleBar } from '../components/TitleBar';
import { ActivityBar } from '../components/ActivityBar';
import { ResizableSplitter } from '../components/ResizableSplitter';
import { FileExplorer } from '../explorer/FileExplorer';
import { SearchPanel } from '../search/SearchPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { MonacoEditor } from '../editor/MonacoEditor';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { AgentPanel } from '../agent/AgentPanel';
import { EmptyState } from '../components/EmptyState';
import { StatusBar } from '../components/StatusBar';
import { CommandPalette } from '../components/CommandPalette';
import { QuickOpen } from '../components/QuickOpen';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUiStore } from '../stores/uiStore';

export const IDELayout: React.FC = () => {
  const { rootPath } = useWorkspaceStore();
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
      case 'search':
        return <SearchPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'explorer':
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

      {/* Main Work Area: Row with ActivityBar, Left Sidebar, Center Editor/EmptyState, Right Agent */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Far Left: Activity Bar */}
        <ActivityBar />

        {/* Left: Sidebar (Explorer, Search, Settings) */}
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

        {/* Center: File Editor OR Empty State Welcome Page */}
        <div
          style={{
            flex: 1,
            height: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-panel)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {!rootPath ? <EmptyState /> : <MonacoEditor />}
          </div>

          {/* Integrated Terminal (when open and workspace active) */}
          {isTerminalOpen && rootPath && (
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

        {/* Right: AI Agent Panel */}
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
              <AgentPanel />
            </div>
          </>
        )}
      </div>

      {/* Bottom: Status Bar */}
      <StatusBar />

      {/* Global Quick Modals */}
      <CommandPalette />
      <QuickOpen />
    </div>
  );
};
