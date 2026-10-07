import React, { useEffect, useRef, useState } from 'react';
import { useAIWorkspaceStore, FileChangeInfo } from '../../services/aiWorkspaceService';
import ReactMarkdown from 'react-markdown';
import { useThemeStore } from '../../stores/themeStore';
import { Copy, Edit2, Check } from 'lucide-react';
import { extractToolCalls } from '../../services/aiToolExecution';
import { FileChangesCard } from './FileChangesCard';

const streamedMessages = new Set<string>();

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
          let title = 'Working...';
          if (part.tag === 'thought') title = 'Thinking...';
          else if (part.tag === 'search') title = 'Searching...';
          else if (part.tag === 'tool' || part.tag === 'call') title = 'Running tool...';

          return (
            <details key={index} className="ai-thought-block" open={!part.isClosed} style={{ marginBottom: '12px' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500, userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>{title}</span>
              </summary>
              <div style={{ paddingLeft: '14px', borderLeft: '2px solid var(--border-color)', margin: '8px 0 0 4px', color: 'var(--text-muted)' }}>
                <ReactMarkdown components={markdownComponents}>{part.content}</ReactMarkdown>
              </div>
            </details>
          );
        }
        return <ReactMarkdown key={index} components={markdownComponents}>{part.content}</ReactMarkdown>;
      })}
    </>
  );
}

const StreamingMessage: React.FC<{ msgId: string, content: string, isLastGenerating: boolean, onUpdate?: () => void }> = ({ msgId, content, isLastGenerating, onUpdate }) => {
  const [displayed, setDisplayed] = useState(streamedMessages.has(msgId) ? content : '');
  const [isTyping, setIsTyping] = useState(!streamedMessages.has(msgId));

  useEffect(() => {
    if (streamedMessages.has(msgId)) {
      setDisplayed(content);
      setIsTyping(false);
      return;
    }

    let currentIndex = 0;
    
    const interval = setInterval(async () => {
      if (currentIndex >= content.length) {
        clearInterval(interval);
        streamedMessages.add(msgId);
        setIsTyping(false);
        return;
      }

      // Stream dynamically faster based on remaining text
      const remaining = content.length - currentIndex;
      const charsToAddCount = Math.max(5, Math.ceil(remaining / 20));
      const charsToAdd = content.slice(currentIndex, currentIndex + charsToAddCount);
      currentIndex += charsToAdd.length;
      
      const currentDisplayed = content.slice(0, currentIndex);
      setDisplayed(currentDisplayed);
      onUpdate?.();
      
    }, 15);

    return () => clearInterval(interval);
  }, [content, msgId]);

  return (
    <div className="markdown-body" style={{ color: 'inherit', position: 'relative' }}>
      {renderWithToggles(displayed)}
      {(isLastGenerating || isTyping) && (
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '14px',
          backgroundColor: 'currentColor',
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

  let runningText = 'working';
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

    const lastEvent = [...events].reverse().find(e => e.type === 'ToolCallEvent' || e.type === 'ThoughtEvent' || e.type === 'FileChangedEvent');
    if (lastEvent) {
      if (lastEvent.type === 'ToolCallEvent') {
        const toolName = lastEvent.tool.toLowerCase();
        if (toolName.includes('search') || toolName.includes('web')) {
          runningText = 'Searching the web';
        } else if (toolName.includes('write') || toolName.includes('create') || toolName.includes('file')) {
          runningText = 'Writing files';
        } else {
          runningText = `Running ${lastEvent.tool}`;
        }
      } else if (lastEvent.type === 'ThoughtEvent') {
        runningText = 'thinking';
      } else if (lastEvent.type === 'FileChangedEvent') {
        const fileName = (lastEvent as any).file?.split('/')?.pop() || 'files';
        runningText = `Writing ${fileName}`;
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
          maxWidth: '90%',
          alignSelf: 'flex-start'
        }}>
          {realtimeFiles.length > 0 && (
            <FileChangesCard files={realtimeFiles} isRealtime={true} />
          )}

          <div style={{
            padding: '10px 14px',
            borderRadius: '12px',
            backgroundColor: isDark ? 'rgba(32, 32, 32, 0.7)' : '#ffffff',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.05)',
            width: 'fit-content'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px #10B981',
              animation: 'pulse-dot 1.5s ease-in-out infinite',
              display: 'inline-block'
            }} />
            <span style={{ fontWeight: 500 }}>{runningText}<span className="animated-dots"></span></span>
          </div>
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
