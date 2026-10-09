import React, { useEffect, useRef, useState } from 'react';
import { useAIWorkspaceStore, FileChangeInfo } from '../../services/aiWorkspaceService';
import ReactMarkdown from 'react-markdown';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useTabsStore } from '../../stores/tabsStore';
import { Copy, Edit2, Check, RotateCcw, ArrowDownRight, FileCheck } from 'lucide-react';
import { extractToolCalls } from '../../services/aiToolExecution';
import { FileChangesCard } from './FileChangesCard';
import { RunningIndicator } from './RunningIndicator';


const streamedMessages = new Set<string>();

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
          <button
            onClick={handleCopy}
            style={codeActionBtnStyle}
            title="Copy code"
          >
            {copied ? <Check size={12} color="#3B82F6" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleInsert}
            style={codeActionBtnStyle}
            title="Insert into active editor tab"
          >
            {inserted ? <Check size={12} color="#3B82F6" /> : <ArrowDownRight size={12} />}
            <span>{inserted ? 'Inserted' : 'Insert'}</span>
          </button>
          <button
            onClick={handleApply}
            style={codeActionBtnStyle}
            title="Apply changes to active file"
          >
            {applied ? <Check size={12} color="#3B82F6" /> : <FileCheck size={12} />}
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

const codeActionBtnStyle = {
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

function renderWithToggles(rawText: string) {
  const { formattedText: text } = extractToolCalls(rawText);
  const blockRegex = /<(thought|search|working|tool|call)>([\s\S]*?)(?:<\/\1>|$)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const tag = match[1];
    const content = match[2];
    const isClosed = match[0].endsWith(`</${tag}>`);
    parts.push({ type: 'toggle', tag, content, isClosed });
    lastIndex = blockRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  const markdownComponents = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      if (!inline && (match || codeString.includes('\n'))) {
        return (
          <CodeBlock
            language={match ? match[1] : ''}
            value={codeString}
          />
        );
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
              } else if ((window as any).electronAPI?.openExternalUrl) {
                (window as any).electronAPI.openExternalUrl(href);
              } else {
                window.open(href, '_blank');
              }
            }
          }}
          style={{
            color: isLocal ? '#0284C7' : '#2563EB',
            backgroundColor: isLocal ? '#F0F9FF' : 'transparent',
            padding: isLocal ? '3px 8px' : '0',
            borderRadius: isLocal ? '6px' : '0',
            border: isLocal ? '1px solid #BAE6FD' : 'none',
            textDecoration: isLocal ? 'none' : 'underline',
            fontWeight: 600,
            cursor: 'pointer',
            display: isLocal ? 'inline-flex' : 'inline',
            alignItems: 'center',
            gap: '5px',
            margin: isLocal ? '2px 0' : '0',
            fontSize: isLocal ? '12px' : 'inherit',
          }}
          {...props}
        >
          {isLocal && <span>🌐</span>}
          {children}
          {isLocal && <span style={{ fontSize: '11px', opacity: 0.8 }}>↗</span>}
        </a>
      );
    },
  };

  if (parts.length === 0) {
    return <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>;
  }


  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'toggle') {
          // Remove intrusive board for working/thinking
          if (part.tag === 'thought' || part.tag === 'working') {
            return null;
          }
          return (
            <div key={index} style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <ReactMarkdown components={markdownComponents}>{part.content}</ReactMarkdown>
            </div>
          );
        }
        return <ReactMarkdown key={index} components={markdownComponents}>{part.content}</ReactMarkdown>;
      })}
    </>
  );
}

const StreamingMessage: React.FC<{ msgId: string, content: string, isLastGenerating: boolean, onUpdate?: () => void }> = ({ msgId, content, isLastGenerating, onUpdate }) => {
  const [displayed, setDisplayed] = useState(content);

  useEffect(() => {
    setDisplayed(content);
    streamedMessages.add(msgId);
    onUpdate?.();
  }, [content, msgId, onUpdate]);

  return (
    <div className="markdown-body" style={{ color: 'inherit', position: 'relative' }}>
      {renderWithToggles(displayed)}
      {isLastGenerating && (
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '14px',
          backgroundColor: 'var(--accent, #3B82F6)',
          marginLeft: '4px',
          verticalAlign: 'middle',
          animation: 'chatgpt-blink 1s step-end infinite'
        }} />
      )}
    </div>
  );
};

const UserMessageBubble: React.FC<{ msgId: string, content: string }> = ({ content }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const setDraftPrompt = useAIWorkspaceStore(s => s.setDraftPrompt);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setDraftPrompt(content);
  };

  return (
    <div 
      style={{ whiteSpace: 'pre-wrap', position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ flex: 1 }}>{content}</div>
      {isHovered && (
        <div style={{
          display: 'flex',
          gap: '4px',
          position: 'absolute',
          bottom: '-32px',
          right: '0',
          backgroundColor: 'var(--bg-surface)',
          padding: '4px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 10
        }}>
          <button 
            onClick={handleCopy}
            title="Copy"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '4px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', borderRadius: '4px'
            }}
          >
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
          </button>
          <button 
            onClick={handleEdit}
            title="Edit prompt"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '4px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', borderRadius: '4px'
            }}
          >
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export const ChatThread: React.FC = () => {
  const { chatHistory, currentState, events } = useAIWorkspaceStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  
  const isDark = theme === 'dark';

  const realtimeFiles: FileChangeInfo[] = [];

  if (currentState === 'running' && events.length > 0) {
    for (const ev of events) {
      if (ev.type === 'FileChangedEvent') {
        const existing = realtimeFiles.find((f) => f.file === ev.file);
        if (existing) {
          if (ev.lines) existing.lines = ev.lines;
          if (ev.action) existing.action = ev.action;
        } else {
          realtimeFiles.push({
            file: ev.file,
            action: ev.action || 'created',
            lines: ev.lines,
            additions: ev.additions,
          });
        }
      }
    }
  }

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = scrollContainerRef.current;
    if (!container) {
      bottomRef.current?.scrollIntoView({ behavior });
      return;
    }
    const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 100;
    if (!isScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [chatHistory, currentState]);

  if (chatHistory.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: 'var(--text-secondary)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Welcome to CoreMind Chat
        </h2>
        <p style={{ textAlign: 'center', maxWidth: '280px', lineHeight: 1.5, fontSize: '13px' }}>
          I'm here to help you understand your codebase, write code, and solve complex problems.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} style={{
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px',
      gap: '24px'
    }}>
      {chatHistory.map((msg, index) => {
        const isUser = msg.role === 'user';
        const isLastMessage = index === chatHistory.length - 1;
        const isGenerating = currentState === 'running' && !isUser && isLastMessage;
        
        return (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            width: '100%',
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              maxWidth: '90%',
              flexDirection: isUser ? 'row-reverse' : 'row'
            }}>
              {/* Message Bubble */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '16px',
                borderTopRightRadius: isUser ? '4px' : '16px',
                borderTopLeftRadius: !isUser ? '4px' : '16px',
                backgroundColor: isUser 
                  ? (isDark ? '#2A2A2A' : '#f3f4f6') 
                  : (isDark ? 'rgba(32, 32, 32, 0.6)' : '#ffffff'),
                color: 'var(--text-primary)',
                border: 'none',
                boxShadow: isUser ? 'none' : (isDark ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.05)'),
                backdropFilter: !isUser ? 'blur(10px)' : 'none',
                fontSize: '13.5px',
                lineHeight: 1.6,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                maxWidth: '100%'
              }}>
                {isUser ? (
                  <UserMessageBubble msgId={msg.id} content={msg.content} />
                ) : (
                  <div>
                    {msg.filesChanged && msg.filesChanged.length > 0 && (
                      <FileChangesCard
                        files={msg.filesChanged}
                      />
                    )}
                    <StreamingMessage 
                      msgId={msg.id} 
                      content={msg.content} 
                      isLastGenerating={isGenerating} 
                      onUpdate={() => scrollToBottom('auto')}
                    />
                    {!isGenerating && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
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
                              useAIWorkspaceStore.getState().setDraftPrompt(prevUser.content);
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

      
      {currentState === 'running' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignSelf: 'flex-start',
          paddingLeft: '4px',
          animation: 'antigravity-fade-in 0.15s ease-out',
        }}>
          {realtimeFiles.length > 0 && (
            <div style={{ maxWidth: '90%' }}>
              <FileChangesCard files={realtimeFiles} isRealtime={true} />
            </div>
          )}
          <RunningIndicator />
        </div>
      )}
      
      <style>{`
        @keyframes chatgpt-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes loading-dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.85); }
        }
        .animated-dots::after {
          content: '';
          animation: loading-dots 1.5s infinite;
          display: inline-block;
          width: 12px;
          text-align: left;
        }
      `}</style>
      
      <div ref={bottomRef} />
    </div>
  );
};
