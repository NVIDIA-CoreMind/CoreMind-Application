import React, { useState } from 'react';
import { TerminalEvent } from '../../types/aiWorkspace';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useUiStore } from '../../stores/uiStore';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import { getAITheme } from './themeTokens';
import { AICodeBlock } from './AICodeBlock';

export const TerminalActivity: React.FC<{ event: TerminalEvent }> = ({ event }) => {
  const [expanded, setExpanded] = useState(true);
  const updateEvent = useAIWorkspaceStore((s) => s.updateEvent);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
  const tokens = getAITheme(isDark);

  const handleStop = () => {
    if (event.status === 'running') {
      updateEvent(event.id, {
        status: 'failed',
        output: (event.output || '') + '\n^C (Process terminated by user)',
      });
    }
  };

  const handleOpenTerminal = () => {
    useUiStore.setState({ isTerminalOpen: true });
  };

  // Build the code string representation matching the reference screenshot:
  // First line: executed command (e.g. npm run typecheck)
  // Subsequent lines: streaming output & comments
  const lines: string[] = [];
  if (event.command) {
    lines.push(event.command);
  }
  if (event.output && event.output.trim()) {
    lines.push(event.output.trimEnd());
  } else if (event.status === 'running') {
    lines.push('# Executing command in workspace sandbox...');
  }

  if (event.status === 'completed') {
    lines.push(`# Exit code: ${event.exitCode ?? 0} (Process exited successfully)`);
  } else if (event.status === 'failed') {
    lines.push(`# Exit code: ${event.exitCode ?? 1} (Process exited with error)`);
  }

  const codeValue = lines.join('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '4px 0' }}>
      {/* Header toggle */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12.5px',
          color: tokens.textSecondary,
          cursor: 'pointer',
          fontWeight: 400,
          userSelect: 'none',
          padding: '2px 0',
        }}
      >
        <span>
          Ran <strong style={{ color: tokens.textPrimary, fontWeight: 600 }}>{event.command}</strong>
        </span>
        {expanded ? (
          <ChevronDown size={13} color="currentColor" />
        ) : (
          <ChevronRight size={13} color="currentColor" />
        )}
        {event.status === 'running' && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: tokens.accentRunning,
              animation: 'pulse 1.5s infinite ease-in-out',
              display: 'inline-block',
              marginLeft: '2px',
            }}
          />
        )}
      </div>

      {/* Expanded terminal code block matching reference screenshot */}
      {expanded && (
        <AICodeBlock
          language="bash"
          value={codeValue}
          isRunning={event.status === 'running'}
          durationMs={event.durationMs}
          onStop={event.status === 'running' ? handleStop : undefined}
          onOpenTerminal={handleOpenTerminal}
          maxHeight="380px"
          enableOpenFile={true}
          isDark={isDark}
        />
      )}
    </div>
  );
};
