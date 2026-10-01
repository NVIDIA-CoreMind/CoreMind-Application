import React from 'react';
import { TitleBar } from '../components/TitleBar';
import { ResizableSplitter } from '../components/ResizableSplitter';
import { AgentPanel } from '../agent/AgentPanel';
import { CoreMindWorkbench } from '../components/CoreMindWorkbench';
import { PtyTerminal } from '../terminal/PtyTerminal';
import { useUiStore } from '../stores/uiStore';

export const IDELayout: React.FC = () => {
  const {
    isRightPanelOpen,
    rightPanelWidth,
    setRightPanelWidth,
    isTerminalOpen,
    terminalHeight,
    setTerminalHeight,
  } = useUiStore();

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
      {/* Top Title Bar (Native CoreMind macOS styling) */}
      <TitleBar />

      {/* Main Work Area: Left (VS Code), Right (Agent Panel) */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left/Center: VS Code Foundation */}
        <div
          style={{
            flex: 1,
            height: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-panel)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <CoreMindWorkbench />
              </div>
            </div>
            {isTerminalOpen && (
              <>
                <ResizableSplitter
                  direction="vertical"
                  onResize={(delta) => setTerminalHeight(terminalHeight + delta)}
                />
                <div style={{ height: `${terminalHeight}px`, flexShrink: 0 }}>
                  <PtyTerminal />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: AI Agent Panel (CoreMind Specific Feature) */}
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
              }}
            >
              <AgentPanel />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
