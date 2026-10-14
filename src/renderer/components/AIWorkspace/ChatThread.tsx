import React, { useEffect, useRef } from 'react';
import { useAIWorkspaceStore, FileChangeInfo } from '../../services/aiWorkspaceService';
import ReactMarkdown from 'react-markdown';
import { useThemeStore, resolveEffectiveTheme } from '../../stores/themeStore';
import {
  Copy,
  Sparkles,
  Bot,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { extractToolCalls } from '../../services/aiToolExecution';
import { RunningIndicator } from './RunningIndicator';
import { ImplementationPlan } from './ImplementationPlan';
import { QuestionCard } from './QuestionCard';
import { AntigravityActivityStream } from './CoreMindActivityStream';
import { TerminalEvent } from '../../types/aiWorkspace';
import { getAITheme } from './themeTokens';
import { AICodeBlock } from './AICodeBlock';

const getBadgeForPathOrSymbol = (text: string): { label: string; color: string; bg: string } | null => {
  const clean = text.trim();
  if (/\.(ts|tsx)$/i.test(clean) || (/Service|Store|Handler|Hook|Context|Controller|Module/i.test(clean) && !clean.includes(' '))) {
    return { label: 'TS', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
  }
  if (/\.dart$/i.test(clean)) {
    return { label: 'DART', color: '#00d2b8', bg: 'rgba(0, 210, 184, 0.15)' };
  }
  if (/\.py$/i.test(clean)) {
    return { label: 'PY', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' };
  }
  if (/\.(js|jsx)$/i.test(clean)) {
    return { label: 'JS', color: '#facc15', bg: 'rgba(250, 204, 21, 0.15)' };
  }
  if (/\.(json|yaml|yml)$/i.test(clean)) {
    return { label: 'CFG', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' };
  }
  return null;
};

function renderMarkdownContent(rawText: string, isDark: boolean = true, isUser: boolean = false) {
  const { formattedText: text } = extractToolCalls(rawText);

  const markdownComponents = {
    pre: ({ children }: any) => <>{children}</>,
    h1: ({ children }: any) => (
      <h1 style={{ fontSize: '16px', fontWeight: 700, color: isDark ? '#ffffff' : '#111827', margin: '20px 0 10px 0', letterSpacing: '-0.01em' }}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: isDark ? '#ffffff' : '#111827', margin: '18px 0 8px 0', letterSpacing: '-0.01em' }}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#f4f4f5' : '#1f2937', margin: '14px 0 6px 0' }}>
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: isDark ? '#f4f4f5' : '#1f2937', margin: '12px 0 4px 0' }}>
        {children}
      </h4>
    ),
    p: ({ children }: any) => (
      <p style={{
        margin: isUser ? 0 : '0 0 12px 0',
        lineHeight: 1.5,
        color: isUser ? (isDark ? '#f4f4f5' : '#111827') : (isDark ? '#d4d4d4' : '#374151'),
        fontSize: '13.5px',
      }}>
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul style={{ margin: '6px 0 14px 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol style={{ margin: '6px 0 14px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li style={{ lineHeight: 1.6, color: isDark ? '#d4d4d4' : '#374151', fontSize: '13.5px' }}>
        {children}
      </li>
    ),
    strong: ({ children }: any) => (
      <strong style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 600 }}>
        {children}
      </strong>
    ),
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      if (!inline && (match || codeString.includes('\n'))) {
        return <AICodeBlock language={match ? match[1] : 'bash'} value={codeString} isDark={isDark} />;
      }
      const badge = getBadgeForPathOrSymbol(codeString);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', verticalAlign: 'baseline', margin: '0 2px' }}>
          {badge && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: isDark ? badge.color : '#0284c7',
                backgroundColor: isDark ? badge.bg : 'rgba(2, 132, 199, 0.12)',
                padding: '1px 5px',
                borderRadius: '3px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                lineHeight: '13px',
                userSelect: 'none',
              }}
            >
              {badge.label}
            </span>
          )}
          <code
            style={{
              backgroundColor: isDark ? '#262626' : '#f1f5f9',
              color: isDark ? '#e5e5e5' : '#1e293b',
              padding: '2px 6px',
              borderRadius: '4px',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '12px',
              letterSpacing: '-0.01em',
            }}
            className={className}
            {...props}
          >
            {children}
          </code>
        </span>
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
            color: isDark ? '#38bdf8' : '#0284c7',
            textDecoration: 'none',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
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
    activeTurnStartTime,
  } = useAIWorkspaceStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const isDark = resolveEffectiveTheme(theme) === 'dark';
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

  const [expandedActivities, setExpandedActivities] = React.useState<Record<string, boolean>>({});

  const toggleActivity = (id: string) => {
    setExpandedActivities((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
        padding: '16px 20px 24px 20px',
        gap: '16px',
        backgroundColor: tokens.bgMain,
      }}
    >
      {chatHistory.map((msg, index) => {
        const isUser = msg.role === 'user';
        const isLastMessage = index === chatHistory.length - 1;
        const isGenerating = currentState === 'running' && !isUser && isLastMessage;

        if (isUser) {
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                width: '100%',
                margin: '4px 0 16px 0',
              }}
            >
              {/* User prompt pill card matching screenshot */}
              <div
                style={{
                  backgroundColor: isDark ? '#262626' : '#f0f2f5',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                  borderRadius: '20px',
                  padding: '10px 18px',
                  color: isDark ? '#f4f4f5' : '#111827',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  width: '100%',
                  wordBreak: 'break-word',
                  boxShadow: isDark ? '0 1px 2px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                }}
              >
                {renderMarkdownContent(msg.content, isDark, true)}
              </div>
            </div>
          );
        }

        // Check if this turn was cancelled
        const isCancelled =
          msg.content?.toLowerCase().includes('user cancelled') ||
          msg.content?.toLowerCase().includes('execution stopped') ||
          msg.content?.toLowerCase().includes('task was cancelled') ||
          msg.content?.toLowerCase().includes('chat request was cancelled');

        if (isCancelled) {
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                margin: '0 0 16px 0',
              }}
            >
              <div
                style={{
                  color: isDark ? '#a1a1aa' : '#57606a',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  padding: '2px 0 6px 0',
                }}
              >
                User cancelled agent execution.
              </div>

              {/* Action icons right-aligned */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '4px',
                  color: isDark ? '#71717a' : '#9ca3af',
                }}
              >
                <button
                  onClick={() => navigator.clipboard.writeText('User cancelled agent execution.')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  title="Copy"
                  onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
                >
                  <Copy size={15} />
                </button>
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  title="Good response"
                  onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
                >
                  <ThumbsUp size={15} />
                </button>
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  title="Bad response"
                  onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
                >
                  <ThumbsDown size={15} />
                </button>
              </div>
            </div>
          );
        }

        // Regular Assistant Message
        const prevUserMsg = chatHistory.slice(0, index).reverse().find((m) => m.role === 'user');
        let durationText = 'Worked for 1s';
        if (prevUserMsg && msg.timestamp > prevUserMsg.timestamp) {
          const diffSec = Math.max(1, Math.round((msg.timestamp - prevUserMsg.timestamp) / 1000));
          if (diffSec >= 60) {
            durationText = `Worked for ${Math.round(diffSec / 60)}m`;
          } else {
            durationText = `Worked for ${diffSec}s`;
          }
        }
        if (isGenerating) {
          durationText = 'Working...';
        }

        const isActivityOpen = expandedActivities[msg.id] ?? false;

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              margin: '2px 0 16px 0',
            }}
          >
            {/* Worked for <duration> > header */}
            <div
              onClick={() => toggleActivity(msg.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                userSelect: 'none',
                color: isDark ? '#8c8c8c' : '#64748b',
                fontSize: '12.5px',
                fontWeight: 500,
                marginBottom: '10px',
                transition: 'color 0.15s ease',
                width: 'fit-content',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#e5e5e5' : '#111827')}
              onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#8c8c8c' : '#64748b')}
            >
              <span>{durationText}</span>
              <span
                style={{
                  fontSize: '11px',
                  display: 'inline-block',
                  transform: isActivityOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }}
              >
                &gt;
              </span>
            </div>

            {/* Collapsible Activity Stream */}
            {isActivityOpen && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: isDark ? '#202020' : '#ffffff',
                  borderRadius: '6px',
                  border: `1px solid ${isDark ? '#303030' : '#e2e8f0'}`,
                  marginBottom: '14px',
                }}
              >
                <AntigravityActivityStream
                  events={isGenerating ? runningTurnEvents : msg.activityEvents}
                  filesChanged={isGenerating ? realtimeFiles : msg.filesChanged}
                  terminalEvents={isGenerating ? runningTurnTerminalEvents : msg.terminalEvents}
                  thoughtText={isGenerating ? agentPhaseDetail : msg.thoughtSummary}
                  isRunning={isGenerating}
                />
              </div>
            )}

            {/* Markdown Content directly on the canvas */}
            {msg.content ? (
              <div style={{ color: isDark ? '#d4d4d4' : '#374151', fontSize: '13.5px', lineHeight: 1.65, position: 'relative' }}>
                {renderMarkdownContent(msg.content, isDark)}
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

            {/* Footer Action buttons: Right-aligned Copy, ThumbsUp, ThumbsDown */}
            {!isGenerating && msg.content && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '10px',
                  paddingTop: '6px',
                  color: isDark ? '#71717a' : '#9ca3af',
                }}
              >
                <button
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  title="Copy response"
                  onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
                >
                  <Copy size={15} />
                </button>
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  title="Good response"
                  onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
                >
                  <ThumbsUp size={15} />
                </button>
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  title="Bad response"
                  onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#ffffff' : '#111827')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'inherit')}
                >
                  <ThumbsDown size={15} />
                </button>
              </div>
            )}
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

      {/* Pending Question */}
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
