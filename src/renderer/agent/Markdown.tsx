import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const codeBlockStyle: React.CSSProperties = {
  margin: '8px 0',
  padding: '10px 12px',
  borderRadius: '8px',
  backgroundColor: 'var(--bg-deep)',
  border: '1px solid var(--ov-8, var(--border-color))',
  overflowX: 'auto',
  fontSize: '12px',
  lineHeight: 1.5,
  fontFamily: "Menlo, Monaco, 'SF Mono', monospace",
  whiteSpace: 'pre',
};

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
        pre: ({ children }) => <pre style={codeBlockStyle}>{children}</pre>,
        code: ({ className, children }) =>
          className ? (
            <code className={className}>{children}</code>
          ) : (
            <code
              style={{
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-deep)',
                fontSize: '11.5px',
                fontFamily: "Menlo, Monaco, 'SF Mono', monospace",
              }}
            >
              {children}
            </code>
          ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
