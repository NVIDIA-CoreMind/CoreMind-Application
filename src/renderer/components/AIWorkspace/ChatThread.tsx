import React, { useEffect, useRef } from 'react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import ReactMarkdown from 'react-markdown';
import { User } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export const ChatThread: React.FC = () => {
  const { chatHistory, currentState } = useAIWorkspaceStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  
  const isDark = theme === 'dark';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '32px',
          background: isDark ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: isDark ? '0 8px 32px rgba(16, 185, 129, 0.1)' : '0 8px 32px rgba(16, 185, 129, 0.2)',
          border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.3)'}`,
          color: 'var(--accent)',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          AI
        </div>
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
    <div style={{
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px',
      gap: '24px'
    }}>
      {chatHistory.map((msg) => {
        const isUser = msg.role === 'user';
        
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
              {/* Avatar */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isUser ? (isDark ? '#262626' : '#e5e7eb') : 'var(--accent-bg)',
                border: isUser ? `1px solid var(--border-color)` : `1px solid rgba(16, 185, 129, 0.2)`,
                color: isUser ? 'var(--text-primary)' : 'var(--accent)',
                marginTop: '4px',
                fontSize: isUser ? 'inherit' : '12px',
                fontWeight: isUser ? 'normal' : 'bold'
              }}>
                {isUser ? <User size={14} /> : 'AI'}
              </div>
              
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
                border: isUser ? 'none' : `1px solid var(--border-color)`,
                boxShadow: isUser ? 'none' : (isDark ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.05)'),
                backdropFilter: !isUser ? 'blur(10px)' : 'none',
                fontSize: '13.5px',
                lineHeight: 1.6,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                maxWidth: '100%'
              }}>
                {isUser ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                ) : (
                  <div className="markdown-body" style={{ color: 'inherit' }}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
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
          gap: '12px',
          maxWidth: '90%'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--accent-bg)',
            border: `1px solid rgba(16, 185, 129, 0.2)`,
            color: 'var(--accent)',
            marginTop: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            <div className="animate-pulse">AI</div>
          </div>
          <div style={{
            padding: '12px 16px',
            borderRadius: '16px',
            borderTopLeftRadius: '4px',
            backgroundColor: isDark ? 'rgba(32, 32, 32, 0.6)' : '#ffffff',
            border: `1px solid var(--border-color)`,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}>
            <div className="typing-dot" style={{ animationDelay: '0s' }}>.</div>
            <div className="typing-dot" style={{ animationDelay: '0.2s' }}>.</div>
            <div className="typing-dot" style={{ animationDelay: '0.4s' }}>.</div>
            working...
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
};
