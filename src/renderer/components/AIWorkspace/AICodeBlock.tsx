import React, { useState } from 'react';
import {
  Copy,
  Check,
  AtSign,
  ArrowDownRight,
  FileCheck,
  Square,
  Terminal,
} from 'lucide-react';
import { CodeHighlight } from './codeHighlight';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useTabsStore } from '../../stores/tabsStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export interface AICodeBlockProps {
  language?: string;
  value: string;
  onCopy?: () => void;
  onInsert?: () => void;
  onApply?: () => void;
  onStop?: () => void;
  onOpenTerminal?: () => void;
  isRunning?: boolean;
  durationMs?: number;
  maxHeight?: string;
  className?: string;
  style?: React.CSSProperties;
  enableOpenFile?: boolean;
}

export const AICodeBlock: React.FC<AICodeBlockProps> = ({
  language = 'bash',
  value,
  onCopy,
  onInsert,
  onApply,
  onStop,
  onOpenTerminal,
  isRunning = false,
  durationMs,
  maxHeight = '440px',
  className = '',
  style,
  enableOpenFile = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [applied, setApplied] = useState(false);
  const [atMentioned, setAtMentioned] = useState(false);

  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFile = useTabsStore((s) => s.openFile);

  const normalizedLang = (language || 'bash').toLowerCase().trim();

  // Copy handler
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopy) {
      onCopy();
    } else {
      navigator.clipboard.writeText(value);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mention / add to prompt composer handler
  const handleMention = (e: React.MouseEvent) => {
    e.stopPropagation();
    const store = useAIWorkspaceStore.getState();
    const currentPrompt = store.draftPrompt || '';
    const snippet = `\`\`\`${normalizedLang}\n${value}\n\`\`\``;
    const nextPrompt = currentPrompt.trim()
      ? `${currentPrompt}\n\n${snippet}\n`
      : `${snippet}\n`;
    store.setDraftPrompt(nextPrompt);

    setAtMentioned(true);
    setTimeout(() => setAtMentioned(false), 2000);
  };

  // Insert into active editor tab
  const handleInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInsert) {
      onInsert();
    } else {
      useTabsStore.getState().insertSnippetToActiveTab(value);
    }
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  // Apply directly to active editor file
  const handleApply = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApply) {
      onApply();
    } else {
      const tabsState = useTabsStore.getState();
      const activeTab = tabsState.tabs.find((t) => t.id === tabsState.activeTabId);
      if (activeTab && rootPath && window.coreMindAPI?.writeFile) {
        await window.coreMindAPI.writeFile(activeTab.filePath, value, rootPath);
        tabsState.updateTabContent(activeTab.id, value);
      }
    }
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  // Clickable file:line reference handler
  const handleOpenFileRef = async (fileRef: string) => {
    if (!rootPath) return;
    const cleanPath = fileRef.replace(/^\/+/, '').trim();
    const fullPath = fileRef.startsWith('/') ? fileRef : `${rootPath}/${cleanPath}`;
    const fileName = cleanPath.split('/').pop() || cleanPath;
    try {
      await openFile(fullPath, fileName, rootPath);
    } catch (err) {
      console.warn('Failed to open file in editor:', err);
    }
  };

  return (
    <div
      className={`cm-code-block ${className}`}
      style={{
        margin: '10px 0',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#18181b',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
        fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Monaco, Consolas, monospace',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* Top Toolbar matching reference screenshot */}
      <div
        className="cm-code-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 14px',
          backgroundColor: '#18181b',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          userSelect: 'none',
          minHeight: '34px',
        }}
      >
        {/* Left: Language label (e.g. "bash") */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="cm-code-language"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '13px',
              fontWeight: 400,
              color: '#9ca3af',
              textTransform: 'lowercase',
              letterSpacing: '0.01em',
            }}
          >
            {normalizedLang}
          </span>

          {isRunning && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#8ab4f8',
                animation: 'pulse 1.5s infinite ease-in-out',
                display: 'inline-block',
              }}
              title="Process running"
            />
          )}

          {typeof durationMs === 'number' && durationMs > 0 && (
            <span
              style={{
                fontSize: '11px',
                color: '#71717a',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
            </span>
          )}
        </div>

        {/* Right: Action buttons (@ mention, copy, insert, apply, stop) */}
        <div
          className="cm-code-actions"
          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          {isRunning && onStop && (
            <button
              onClick={onStop}
              className="cm-code-btn"
              style={{
                ...actionBtnStyle,
                color: '#f28b82',
                padding: '3px 7px',
                backgroundColor: 'rgba(242, 139, 130, 0.12)',
              }}
              title="Terminate running process"
            >
              <Square size={9} fill="currentColor" color="currentColor" />
              <span style={{ fontSize: '11px', marginLeft: '4px', fontWeight: 600 }}>Stop</span>
            </button>
          )}

          {onOpenTerminal && (
            <button
              onClick={onOpenTerminal}
              className="cm-code-btn"
              style={actionBtnStyle}
              title="Open Workbench Terminal"
            >
              <Terminal size={12.5} strokeWidth={1.8} />
            </button>
          )}

          {onInsert && (
            <button
              onClick={handleInsert}
              className="cm-code-btn"
              style={actionBtnStyle}
              title={inserted ? 'Inserted into active file' : 'Insert into active file'}
            >
              {inserted ? (
                <Check size={13} color="#81c995" />
              ) : (
                <ArrowDownRight size={13.5} strokeWidth={1.8} />
              )}
            </button>
          )}

          {onApply && (
            <button
              onClick={handleApply}
              className="cm-code-btn"
              style={actionBtnStyle}
              title={applied ? 'Applied to file' : 'Apply changes to file'}
            >
              {applied ? (
                <Check size={13} color="#81c995" />
              ) : (
                <FileCheck size={13.5} strokeWidth={1.8} />
              )}
            </button>
          )}

          {/* @ Mention / Context Button (Reference Screenshot) */}
          <button
            onClick={handleMention}
            className="cm-code-btn"
            style={actionBtnStyle}
            title={atMentioned ? 'Added to prompt composer' : 'Add snippet to prompt composer (@)'}
          >
            {atMentioned ? (
              <Check size={13} color="#81c995" />
            ) : (
              <AtSign size={13.5} strokeWidth={1.8} />
            )}
          </button>

          {/* Copy Button (Reference Screenshot) */}
          <button
            onClick={handleCopy}
            className="cm-code-btn"
            style={actionBtnStyle}
            title={copied ? 'Copied to clipboard' : 'Copy'}
          >
            {copied ? (
              <Check size={13.5} color="#81c995" />
            ) : (
              <Copy size={13.5} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {/* Code / Terminal Output Body */}
      <div
        className="cm-code-body"
        style={{
          margin: 0,
          padding: '12px 16px',
          backgroundColor: '#18181b',
          color: '#e4e4e7',
          fontFamily: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
          fontSize: '12.5px',
          lineHeight: 1.6,
          letterSpacing: '-0.01em',
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight,
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      >
        <CodeHighlight
          code={value}
          language={normalizedLang}
          onOpenFile={enableOpenFile ? handleOpenFileRef : undefined}
        />
      </div>
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#9ca3af',
  cursor: 'pointer',
  padding: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  fontSize: '12px',
  lineHeight: 1,
  transition: 'all 0.15s ease',
};
