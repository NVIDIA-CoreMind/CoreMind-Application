import React from 'react';
import { TitleBar } from '../components/TitleBar';
import { ResizableSplitter } from '../components/ResizableSplitter';
import { AgentPanel } from '../agent/AgentPanel';
import { CoreMindWorkbench } from '../components/CoreMindWorkbench';
import { useUiStore } from '../stores/uiStore';

export const IDELayout: React.FC = () => {
  const {
    isRightPanelOpen,
    rightPanelWidth,
    setRightPanelWidth,
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
          <CoreMindWorkbench />
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
