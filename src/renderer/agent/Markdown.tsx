import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AICodeBlock } from '../components/AIWorkspace/AICodeBlock';

export const Markdown: React.FC<{ content: string }> = ({ content }) => (
  <div className="cm-markdown">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: '0 0 8px', paddingLeft: '18px' }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: '0 0 8px', paddingLeft: '18px' }}>{children}</ol>,
        h1: ({ children }) => <h3 style={{ margin: '10px 0 6px', fontSize: '14px' }}>{children}</h3>,
        h2: ({ children }) => <h3 style={{ margin: '10px 0 6px', fontSize: '13.5px' }}>{children}</h3>,
        h3: ({ children }) => <h4 style={{ margin: '8px 0 4px', fontSize: '13px' }}>{children}</h4>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--accent)' }}>
            {children}
          </a>
        ),
        pre: ({ children }) => <>{children}</>,
        code: ({ className, children }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          if (match || codeString.includes('\n')) {
            return <AICodeBlock language={match ? match[1] : 'bash'} value={codeString} />;
          }
          return (
            <code
              style={{
                padding: '2px 5px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
