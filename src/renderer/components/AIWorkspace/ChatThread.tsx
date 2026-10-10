import React, { useEffect, useRef, useState } from 'react';
import { useAIWorkspaceStore, FileChangeInfo } from '../../services/aiWorkspaceService';
import ReactMarkdown from 'react-markdown';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import {
  Copy,
  Check,
  RotateCcw,
  ArrowDownRight,
  FileCheck,
  Sparkles,
  Bot,
} from 'lucide-react';
import { extractToolCalls } from '../../services/aiToolExecution';
import { RunningIndicator } from './RunningIndicator';
import { ImplementationPlan } from './ImplementationPlan';
import { QuestionCard } from './QuestionCard';
import { ApprovalCard } from './ApprovalCard';
import { AntigravityActivityStream } from './AntigravityActivityStream';
import { TerminalEvent } from '../../types/aiWorkspace';

const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    useTabsStore.getState().insertSnippetToActiveTab(value);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  const handleApply = async () => {
    const tabsState = useTabsStore.getState();
    const activeTab = tabsState.tabs.find((t) => t.id === tabsState.activeTabId);
    if (activeTab && rootPath && window.coreMindAPI?.writeFile) {
      await window.coreMindAPI.writeFile(activeTab.filePath, value, rootPath);
      tabsState.updateTabContent(activeTab.id, value);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  return (
    <div
      style={{
        margin: '10px 0',
        borderRadius: '8px',
        overflow: 'hidden',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
        backgroundColor: isDark ? '#141414' : '#F8FAFC',
        fontSize: '12px',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          backgroundColor: isDark ? '#1F1F1F' : '#F1F5F9',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {language || 'code'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={handleCopy} style={codeActionBtnStyle} title="Copy code snippet">
            {copied ? <Check size={12} color="#22C55E" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button onClick={handleInsert} style={codeActionBtnStyle} title="Insert into active editor tab">
            {inserted ? <Check size={12} color="#22C55E" /> : <ArrowDownRight size={12} />}
            <span>{inserted ? 'Inserted' : 'Insert'}</span>
          </button>
          <button onClick={handleApply} style={codeActionBtnStyle} title="Apply changes to active file">
            {applied ? <Check size={12} color="#22C55E" /> : <FileCheck size={12} />}
            <span>{applied ? 'Applied' : 'Apply'}</span>
          </button>
        </div>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '10px 12px',
          overflowX: 'auto',
          lineHeight: 1.5,
          color: isDark ? '#E2E8F0' : '#1E293B',
        }}
      >
        <code>{value}</code>
      </pre>
    </div>
  );
};

const codeActionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '3px 6px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
  transition: 'background-color 0.15s, color 0.15s',
};

function renderMarkdownContent(rawText: string) {
  const { formattedText: text } = extractToolCalls(rawText);

  const markdownComponents = {
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      if (!inline && (match || codeString.includes('\n'))) {
        return <CodeBlock language={match ? match[1] : ''} value={codeString} />;
      }
      return (
        <code
          style={{
            backgroundColor: 'var(--bg-input, rgba(255, 255, 255, 0.08))',
            padding: '2px 5px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
          }}
          className={className}
          {...props}
        >
          {children}
        </code>
      );
    },
    a: ({ href, children, ...props }: any) => {
      const isLocal = href && (href.includes('localhost') || href.includes('127.0.0.1'));
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            if (href) {
              const api = window.coreMindAPI;
              if (api?.openExternalUrl) {
                api.openExternalUrl(href);
              } else {
                window.open(href, '_blank');
              }
            }
          }}
          style={{
            color: isLocal ? '#0284C7' : 'var(--accent, #3B82F6)',
            backgroundColor: isLocal ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
            padding: isLocal ? '2px 6px' : '0',
            borderRadius: isLocal ? '4px' : '0',
            textDecoration: isLocal ? 'none' : 'underline',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  return <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>;
}

export const ChatThread: React.FC = () => {
  const {
    chatHistory,
    currentState,
    events,
    taskGraph,
    trackedChanges,
    pendingQuestion,
    pendingApproval,
    activeTurnStartTime,
  } = useAIWorkspaceStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const setDraftPrompt = useAIWorkspaceStore((s) => s.setDraftPrompt);
  const agentPhaseDetail = useAIWorkspaceStore((s) => s.agentPhaseDetail);

  const realtimeFiles: FileChangeInfo[] = Object.values(trackedChanges);

  const runningTurnEvents = events.filter(
    (e) => (activeTurnStartTime ? e.timestamp >= activeTurnStartTime - 2000 : true)
  );

  const runningTurnTerminalEvents = events.filter(
    (e): e is TerminalEvent =>
      e.type === 'TerminalEvent' &&
      (activeTurnStartTime ? e.timestamp >= activeTurnStartTime - 2000 : true)
  );

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = scrollContainerRef.current;
    if (!container) {
      bottomRef.current?.scrollIntoView({ behavior });
      return;
    }
    const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 120;
    if (!isScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [chatHistory, currentState, events]);

  if (chatHistory.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <Bot size={22} color="var(--accent)" />
        </div>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
          CoreMind AI Workspace
        </h2>
        <p style={{ maxWidth: '300px', lineHeight: 1.5, fontSize: '12.5px', marginBottom: '20px' }}>
          Autonomous coding agent inspired by Cursor and Google Antigravity. Generate plans, execute tools, edit files, and review diffs.
        </p>

        {/* Suggestion Starter Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
          {[
            'Explain the architecture and main components of this project',
            'Find and fix potential errors or test failures in the workspace',
            'Create a new feature with an implementation plan and verification',
          ].map((promptText, i) => (
            <button
              key={i}
              onClick={() => setDraftPrompt(promptText)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
                color: 'var(--text-primary)',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'border-color 0.15s ease',
              }}
            >
              <Sparkles size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
              <span style={{ lineHeight: 1.4 }}>{promptText}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        gap: '20px',
      }}
    >
      {chatHistory.map((msg, index) => {
        const isUser = msg.role === 'user';
        const isLastMessage = index === chatHistory.length - 1;
        const isGenerating = currentState === 'running' && !isUser && isLastMessage;

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '10px',
                maxWidth: isUser ? '85%' : '98%',
                flexDirection: isUser ? 'row-reverse' : 'row',
                width: isUser ? 'auto' : '100%',
              }}
            >
              {/* Message Bubble */}
              <div
                style={{
                  padding: isUser ? '10px 14px' : '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: isUser
                    ? isDark
                      ? '#2A2A2A'
                      : '#F1F5F9'
                    : isDark
                    ? 'rgba(28, 28, 28, 0.75)'
                    : '#FFFFFF',
                  color: 'var(--text-primary)',
                  border: isUser
                    ? 'none'
                    : isDark
                    ? '1px solid rgba(255, 255, 255, 0.08)'
                    : '1px solid #E2E8F0',
                  boxShadow: isUser
                    ? 'none'
                    : isDark
                    ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                    : '0 1px 4px rgba(0, 0, 0, 0.05)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  width: isUser ? 'auto' : '100%',
                }}
              >
                {isUser ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                ) : (
                  <div>
                    {/* Antigravity Activity Stream: Analyzed files, Edited files, Searches, Thoughts, Ran Terminal */}
                    <AntigravityActivityStream
                      events={msg.activityEvents}
                      filesChanged={msg.filesChanged}
                      terminalEvents={msg.terminalEvents}
                      thoughtText={msg.thoughtSummary}
                    />

                    {msg.content ? (
                      <div className="markdown-body" style={{ color: 'inherit', position: 'relative' }}>
                        {renderMarkdownContent(msg.content)}
                        {isGenerating && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '14px',
                              backgroundColor: 'var(--accent, #3B82F6)',
                              marginLeft: '4px',
                              verticalAlign: 'middle',
                              animation: 'chatgpt-blink 1s step-end infinite',
                            }}
                          />
                        )}
                      </div>
                    ) : null}

                    {!isGenerating && msg.content && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #F1F5F9',
                        }}
                      >
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          style={codeActionBtnStyle}
                          title="Copy response"
                        >
                          <Copy size={12} />
                          <span>Copy</span>
                        </button>
                        <button
                          onClick={() => {
                            const prevUser = chatHistory.slice(0, index).reverse().find((m) => m.role === 'user');
                            if (prevUser) {
                              setDraftPrompt(prevUser.content);
                            }
                          }}
                          style={codeActionBtnStyle}
                          title="Regenerate prompt"
                        >
                          <RotateCcw size={12} />
                          <span>Regenerate</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Real-time Inline Cards During Agent Execution */}
      {currentState === 'running' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%',
          }}
        >
          {/* Active Implementation Plan Card (if available) */}
          {taskGraph && (taskGraph.tasks?.length || taskGraph.nodes?.length) ? (
            <div
              style={{
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
                overflow: 'hidden',
              }}
            >
              <ImplementationPlan compact={true} />
            </div>
          ) : null}

          {/* Antigravity Live Activity Stream (Analyzed files, Edited files, Searches, Thinking, Terminal) */}
          <AntigravityActivityStream
            events={runningTurnEvents}
            filesChanged={realtimeFiles}
            terminalEvents={runningTurnTerminalEvents}
            thoughtText={agentPhaseDetail}
            isRunning={true}
          />

          {/* Running Indicator with Active Phase */}
          <RunningIndicator />
        </div>
      )}

      {/* Pending Question or Approval Cards */}
      {pendingQuestion && (
        <QuestionCard
          event={{
            id: 'pending-q',
            type: 'QuestionEvent',
            questionId: pendingQuestion.question_id,
            question: pendingQuestion.question,
            options: pendingQuestion.options,
            timestamp: Date.now(),
          }}
        />
      )}

      {pendingApproval && <ApprovalCard />}

      <div ref={bottomRef} />

      <style>{`
        @keyframes chatgpt-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
