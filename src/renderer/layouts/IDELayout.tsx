import React from 'react';
import { TitleBar } from '../components/TitleBar';
import { AppMenuBar } from '../components/AppMenuBar';
import { ActivityBar } from '../components/ActivityBar';
import { ResizableSplitter } from '../components/ResizableSplitter';
import { FileExplorer } from '../explorer/FileExplorer';
import { SearchPanel } from '../search/SearchPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { MonacoEditor } from '../editor/MonacoEditor';
import { PtyTerminal } from '../terminal/PtyTerminal';
import { AIWorkspace } from '../components/AIWorkspace/AIWorkspace';
import { EmptyState } from '../components/EmptyState';
import { StatusBar } from '../components/StatusBar';
import { CommandPalette } from '../components/CommandPalette';
import { QuickOpen } from '../components/QuickOpen';
import { GlobalPrompt } from '../components/GlobalPrompt';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';
import { useUiStore } from '../stores/uiStore';
import { isMacClient, isWindowsClient } from '../../shared/utils/shortcuts';

export const IDELayout: React.FC = () => {
  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : isWindowsClient();
  const { rootPath } = useWorkspaceStore();
  const tabs = useTabsStore((state) => state.tabs);
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
      {/* 1. Top Title Bar */}
      <TitleBar />

      {/* 2. Application Menu (Linux fallback only; on Windows menus are consolidated into TitleBar, on macOS in system bar) */}
      {!isMac && !isWindows && <AppMenuBar />}

      {/* 3. Main Work Area: Row with ActivityBar, Left Sidebar, Center Editor/Terminal, Right Agent */}
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

        {/* Primary Left Sidebar (Collapsible & Resizable) */}
        {isSidebarOpen && (
          <>
            <div
              style={{
                width: `${sidebarWidth}px`,
                height: '100%',
                flexShrink: 0,
                overflow: 'hidden',
                backgroundColor: 'var(--bg-panel)',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
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

        {/* Center: Main Code Workspace (Editor Workspace on top, Terminal Workspace on bottom) */}
        <div
          style={{
            flex: 1,
            height: '100%',
            minWidth: 0,
            overflow: 'hidden',
            backgroundColor: 'var(--bg-panel)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Main Editor Area */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!rootPath && tabs.length === 0 ? <EmptyState /> : <MonacoEditor />}
          </div>

          {/* Integrated Terminal (Child of Code/Editor Workspace ONLY) */}
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
                <PtyTerminal />
              </div>
            </>
          )}
        </div>

        {/* Right: CoreMind AI Agent Panel (Collapsible & Resizable) */}
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
                borderLeft: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-panel)',
              }}
            >
              <AIWorkspace />
            </div>
          </>
        )}
      </div>

      {/* 4. Bottom Status Bar */}
      <StatusBar />

      {/* Global Quick Modals */}
      <CommandPalette />
      <QuickOpen />
      <GlobalPrompt />
    </div>
  );
};

export default IDELayout;
