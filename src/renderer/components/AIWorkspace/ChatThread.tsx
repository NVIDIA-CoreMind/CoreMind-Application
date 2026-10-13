import React, { useEffect, useRef } from 'react';
import { useAIWorkspaceStore, FileChangeInfo } from '../../services/aiWorkspaceService';
import ReactMarkdown from 'react-markdown';
import { useThemeStore } from '../../stores/themeStore';
import {
  Copy,
  RotateCcw,
  Sparkles,
  Bot,
} from 'lucide-react';
import { extractToolCalls } from '../../services/aiToolExecution';
import { RunningIndicator } from './RunningIndicator';
import { ImplementationPlan } from './ImplementationPlan';
import { QuestionCard } from './QuestionCard';
import { ApprovalCard } from './ApprovalCard';
import { AntigravityActivityStream } from './CoreMindActivityStream';
import { TerminalEvent } from '../../types/aiWorkspace';
import { getAITheme } from './themeTokens';
import { AICodeBlock } from './AICodeBlock';

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
    pre: ({ children }: any) => <>{children}</>,
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      if (!inline && (match || codeString.includes('\n'))) {
        return <AICodeBlock language={match ? match[1] : 'bash'} value={codeString} />;
      }
      return (
        <code
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 5px',
            borderRadius: '4px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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
            color: 'inherit',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
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
  const tokens = getAITheme(isDark);
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
          color: isDark ? '#A1A1AA' : '#71717A',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: tokens.bgCard,
            border: `1px solid ${tokens.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <Bot size={20} color={tokens.iconPrimary} />
        </div>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: tokens.textPrimary, marginBottom: '6px' }}>
          CoreMind AI Workspace
        </h2>
        <p style={{ maxWidth: '300px', lineHeight: 1.5, fontSize: '12.5px', marginBottom: '20px', color: tokens.textSecondary }}>
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
                borderRadius: '6px',
                border: `1px solid ${tokens.border}`,
                backgroundColor: tokens.bgPanel,
                color: tokens.textPrimary,
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.bgCard;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = tokens.bgPanel;
              }}
            >
              <Sparkles size={13} color={tokens.textSecondary} style={{ flexShrink: 0 }} />
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
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 12px 24px 12px',
        gap: '12px',
        backgroundColor: tokens.bgMain,
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
                maxWidth: isUser ? '85%' : '100%',
                width: isUser ? 'auto' : '100%',
                flexDirection: isUser ? 'row-reverse' : 'row',
              }}
            >
              {/* Message Bubble / Card */}
              <div
                style={{
                  padding: isUser ? '10px 14px' : '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: isUser
                    ? tokens.bgCard
                    : tokens.bgPanel,
                  color: tokens.textPrimary,
                  border: `1px solid ${tokens.border}`,
                  boxShadow: 'none',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  width: isUser ? 'auto' : '100%',
                }}
              >
                {isUser ? (
                  <div className="markdown-body" style={{ color: 'inherit' }}>
                    {renderMarkdownContent(msg.content)}
                  </div>
                ) : (
                  <div>
                    {/* Antigravity Activity Stream: Analyzed files, Edited files, Searches, Thoughts, Ran Terminal */}
                    <AntigravityActivityStream
                      events={isGenerating ? runningTurnEvents : msg.activityEvents}
                      filesChanged={isGenerating ? realtimeFiles : msg.filesChanged}
                      terminalEvents={isGenerating ? runningTurnTerminalEvents : msg.terminalEvents}
                      thoughtText={isGenerating ? agentPhaseDetail : msg.thoughtSummary}
                      isRunning={isGenerating}
                    />

                    {msg.content ? (
                      <div className="markdown-body" style={{ color: 'inherit', position: 'relative' }}>
                        {renderMarkdownContent(msg.content)}
                        {isGenerating && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: '7px',
                              height: '14px',
                              backgroundColor: isDark ? '#F4F4F5' : '#18181B',
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
                          borderTop: `1px solid ${tokens.borderSubtle}`,
                        }}
                      >
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          style={{
                            ...codeActionBtnStyle,
                            color: tokens.textSecondary,
                          }}
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
                          style={{
                            ...codeActionBtnStyle,
                            color: tokens.textSecondary,
                          }}
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
                borderRadius: '6px',
                border: isDark ? '1px solid #27272A' : '1px solid #E4E4E7',
                overflow: 'hidden',
              }}
            >
              <ImplementationPlan compact={true} />
            </div>
          ) : null}

          {/* Only render live activity stream at bottom if the last message is NOT already rendering it */}
          {(!chatHistory.length || chatHistory[chatHistory.length - 1].role !== 'assistant') && (
            <AntigravityActivityStream
              events={runningTurnEvents}
              filesChanged={realtimeFiles}
              terminalEvents={runningTurnTerminalEvents}
              thoughtText={agentPhaseDetail}
              isRunning={true}
            />
          )}

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
