import React from 'react';

export interface CodeHighlightProps {
  code: string;
  language?: string;
  onOpenFile?: (fileRef: string) => void;
  isDark?: boolean;
}

// Strip ANSI escape codes from terminal streaming output
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

const BASH_COMMANDS = new Set([
  'npm', 'npx', 'pnpm', 'yarn', 'bun', 'node', 'git', 'cd', 'ls', 'mkdir', 'rm',
  'cp', 'mv', 'cat', 'grep', 'curl', 'wget', 'docker', 'cargo', 'pip', 'python',
  'python3', 'tsc', 'eslint', 'vite', 'vitest', 'export', 'source', 'chmod', 'sudo',
  'echo', 'kill', 'ps', 'which', 'find', 'sed', 'awk', 'set', 'env', 'clear', 'sh', 'bash', 'zsh',
]);

const BASH_SUBCOMMANDS = new Set([
  'run', 'typecheck', 'test', 'build', 'lint', 'dev', 'start', 'install', 'add',
  'remove', 'commit', 'push', 'pull', 'checkout', 'status', 'diff', 'init', 'clone',
  'branch', 'merge', 'exec', 'ci', 'serve', 'preview', 'format', 'verify',
]);

const JS_KEYWORDS = new Set([
  'import', 'export', 'from', 'as', 'default', 'const', 'let', 'var', 'function',
  'return', 'if', 'else', 'switch', 'case', 'break', 'continue', 'for', 'while',
  'do', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'implements',
  'interface', 'type', 'enum', 'typeof', 'instanceof', 'async', 'await', 'yield',
  'void', 'this', 'super', 'public', 'private', 'protected', 'readonly', 'static',
]);

const JS_LITERALS = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
]);

const PY_KEYWORDS = new Set([
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
  'finally', 'raise', 'import', 'from', 'as', 'with', 'lambda', 'yield', 'pass',
  'break', 'continue', 'async', 'await', 'global', 'nonlocal', 'assert', 'del',
]);

const PY_LITERALS = new Set([
  'True', 'False', 'None', 'self',
]);

export interface TokenColors {
  comment: string;
  command: string;
  subcommand: string;
  flag: string;
  string: string;
  variable: string;
  keyword: string;
  literal: string;
  number: string;
  type: string;
  func: string;
  link: string;
  text: string;
  dim: string;
  punctuation: string;
}

export const DARK_TOKEN_COLORS: TokenColors = {
  comment: '#81c995', // Soft green
  command: '#f08c78', // Warm peach/coral for CLI commands
  subcommand: '#e5c07b', // Warm yellow/cream for verbs
  flag: '#7dd3fc', // Soft blue for CLI flags
  string: '#fca5a5', // Coral peach for strings
  variable: '#c678dd', // Soft violet for shell variables
  keyword: '#c678dd', // Soft violet for language keywords
  literal: '#d19a66', // Warm amber for booleans & primitives
  number: '#d19a66', // Warm amber for numbers
  type: '#4ec9b0', // Soft teal for types
  func: '#61afef', // Soft blue for functions
  link: '#93c5fd', // Link color
  text: '#e4e4e7', // Clean light neutral text
  dim: '#71717a', // Muted text
  punctuation: '#9ca3af',
};

export const LIGHT_TOKEN_COLORS: TokenColors = {
  comment: '#15803d', // Crisp forest green
  command: '#b91c1c', // Rich dark coral/red
  subcommand: '#b45309', // Amber bronze
  flag: '#0284c7', // Crisp azure
  string: '#b91c1c', // Ruby red
  variable: '#7c3aed', // Purple
  keyword: '#7c3aed', // Purple
  literal: '#b45309', // Warm bronze
  number: '#0284c7', // Sky blue
  type: '#0d9488', // Teal
  func: '#2563eb', // Royal blue
  link: '#2563eb', // Royal blue
  text: '#0f172a', // Deep slate neutral text
  dim: '#64748b', // Slate muted
  punctuation: '#64748b',
};

export function getTokenColors(isDark: boolean = true): TokenColors {
  return isDark ? DARK_TOKEN_COLORS : LIGHT_TOKEN_COLORS;
}

export const TOKEN_COLORS = DARK_TOKEN_COLORS;

function renderFileLinks(
  text: string,
  keyPrefix: string,
  tokens: TokenColors,
  onOpenFile?: (fileRef: string) => void,
  defaultColor?: string
): React.ReactNode[] {
  const fallbackColor = defaultColor || tokens.text;
  const fileLocRegex = /(?:([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fileLocRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-t-${lastIndex}`} style={{ color: fallbackColor }}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }
    const fullRef = match[0];
    const filePath = match[1];

    if (onOpenFile) {
      nodes.push(
        <button
          key={`${keyPrefix}-link-${match.index}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenFile(filePath);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: tokens.link,
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            cursor: 'pointer',
            padding: 0,
            display: 'inline',
          }}
          title={`Open ${fullRef}`}
        >
          {fullRef}
        </button>
      );
    } else {
      nodes.push(
        <span
          key={`${keyPrefix}-ref-${match.index}`}
          style={{ color: tokens.link, textDecoration: 'underline' }}
        >
          {fullRef}
        </span>
      );
    }
    lastIndex = fileLocRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-t-end`} style={{ color: fallbackColor }}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return nodes;
}

function highlightBashLine(
  line: string,
  lineIdx: number,
  tokens: TokenColors,
  onOpenFile?: (fileRef: string) => void
): React.ReactNode {
  // If line is purely a comment (starts with optional whitespace and #)
  if (/^\s*#/.test(line)) {
    return (
      <span key={lineIdx} style={{ color: tokens.comment }}>
        {line}
      </span>
    );
  }

  const nodes: React.ReactNode[] = [];
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*|--[a-zA-Z0-9_-]+|-[a-zA-Z0-9_-]+|\$\{[^}]+\}|\$[a-zA-Z0-9_]+|[^\s"'#]+|\s+)/g;
  let match: RegExpExecArray | null;
  let isFirstCommandWord = true;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const text = match[0];
    const key = `${lineIdx}-${tokenIdx++}`;

    // Pure whitespace
    if (/^\s+$/.test(text)) {
      nodes.push(<React.Fragment key={key}>{text}</React.Fragment>);
      continue;
    }

    // Comment (#...)
    if (text.startsWith('#')) {
      nodes.push(
        <span key={key} style={{ color: tokens.comment }}>
          {text}
        </span>
      );
      continue;
    }

    // Strings
    if (text.startsWith('"') || text.startsWith("'")) {
      nodes.push(
        <span key={key} style={{ color: tokens.string }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Flags (--flag, -f)
    if (text.startsWith('-')) {
      nodes.push(
        <span key={key} style={{ color: tokens.flag }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Variables ($VAR, ${VAR})
    if (text.startsWith('$')) {
      nodes.push(
        <span key={key} style={{ color: tokens.variable }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Prompt glyph ($ or > or # at start)
    if ((text === '$' || text === '>' || text === '%') && isFirstCommandWord) {
      nodes.push(
        <span key={key} style={{ color: tokens.dim, userSelect: 'none' }}>
          {text}
        </span>
      );
      continue;
    }

    // Check if word is known command or subcommand
    const cleanWord = text.replace(/[^a-zA-Z0-9_-]/g, '');

    if (isFirstCommandWord || BASH_COMMANDS.has(cleanWord)) {
      nodes.push(
        <span key={key} style={{ color: tokens.command, fontWeight: 500 }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    if (BASH_SUBCOMMANDS.has(cleanWord)) {
      nodes.push(
        <span key={key} style={{ color: tokens.subcommand }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Check for clickable file:line pattern in output
    if (onOpenFile && text.includes(':') && (text.includes('.') || text.includes('/'))) {
      const linkNodes = renderFileLinks(text, key, tokens, onOpenFile);
      nodes.push(<React.Fragment key={key}>{linkNodes}</React.Fragment>);
    } else {
      nodes.push(
        <span key={key} style={{ color: tokens.text }}>
          {text}
        </span>
      );
    }
    isFirstCommandWord = false;
  }

  return <React.Fragment key={lineIdx}>{nodes}</React.Fragment>;
}

function highlightJsLine(
  line: string,
  lineIdx: number,
  tokens: TokenColors,
  onOpenFile?: (fileRef: string) => void
): React.ReactNode {
  // Line comment
  if (/^\s*\/\//.test(line)) {
    return (
      <span key={lineIdx} style={{ color: tokens.comment }}>
        {line}
      </span>
    );
  }

  const nodes: React.ReactNode[] = [];
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|[a-zA-Z_$][a-zA-Z0-9_$]*|[0-9]+(?:\.[0-9]+)?|[{}\[\]();,.<>:=+\-*\/&|!%^~?]+|\s+)/g;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const text = match[0];
    const key = `${lineIdx}-${tokenIdx++}`;

    if (/^\s+$/.test(text)) {
      nodes.push(<React.Fragment key={key}>{text}</React.Fragment>);
      continue;
    }

    if (text.startsWith('//')) {
      nodes.push(
        <span key={key} style={{ color: tokens.comment }}>
          {text}
        </span>
      );
      continue;
    }

    if (text.startsWith('"') || text.startsWith("'") || text.startsWith('`')) {
      nodes.push(
        <span key={key} style={{ color: tokens.string }}>
          {text}
        </span>
      );
      continue;
    }

    if (JS_KEYWORDS.has(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.keyword }}>
          {text}
        </span>
      );
      continue;
    }

    if (JS_LITERALS.has(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.literal }}>
          {text}
        </span>
      );
      continue;
    }

    if (/^[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.number }}>
          {text}
        </span>
      );
      continue;
    }

    // Capitalized word -> Likely a Type / Component
    if (/^[A-Z][a-zA-Z0-9_$]*$/.test(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.type }}>
          {text}
        </span>
      );
      continue;
    }

    // Check punctuation or regular text
    if (/^[{}()[\];,.<>:=+\-*\/&|!%^~?]+$/.test(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.punctuation }}>
          {text}
        </span>
      );
      continue;
    }

    if (onOpenFile && text.includes(':') && (text.includes('.') || text.includes('/'))) {
      const linkNodes = renderFileLinks(text, key, tokens, onOpenFile);
      nodes.push(<React.Fragment key={key}>{linkNodes}</React.Fragment>);
      continue;
    }

    nodes.push(
      <span key={key} style={{ color: tokens.text }}>
        {text}
      </span>
    );
  }

  return <React.Fragment key={lineIdx}>{nodes}</React.Fragment>;
}

function highlightPyLine(
  line: string,
  lineIdx: number,
  tokens: TokenColors
): React.ReactNode {
  if (/^\s*#/.test(line)) {
    return (
      <span key={lineIdx} style={{ color: tokens.comment }}>
        {line}
      </span>
    );
  }

  const nodes: React.ReactNode[] = [];
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*|[a-zA-Z_][a-zA-Z0-9_]*|[0-9]+(?:\.[0-9]+)?|[{}\[\]();,.<>:=+\-*\/&|!%^~?]+|\s+)/g;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const text = match[0];
    const key = `${lineIdx}-${tokenIdx++}`;

    if (/^\s+$/.test(text)) {
      nodes.push(<React.Fragment key={key}>{text}</React.Fragment>);
      continue;
    }

    if (text.startsWith('#')) {
      nodes.push(
        <span key={key} style={{ color: tokens.comment }}>
          {text}
        </span>
      );
      continue;
    }

    if (text.startsWith('"') || text.startsWith("'")) {
      nodes.push(
        <span key={key} style={{ color: tokens.string }}>
          {text}
        </span>
      );
      continue;
    }

    if (PY_KEYWORDS.has(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.keyword }}>
          {text}
        </span>
      );
      continue;
    }

    if (PY_LITERALS.has(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.literal }}>
          {text}
        </span>
      );
      continue;
    }

    if (/^[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.number }}>
          {text}
        </span>
      );
      continue;
    }

    nodes.push(
      <span key={key} style={{ color: tokens.text }}>
        {text}
      </span>
    );
  }

  return <React.Fragment key={lineIdx}>{nodes}</React.Fragment>;
}

function highlightJsonLine(
  line: string,
  lineIdx: number,
  tokens: TokenColors
): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const tokenRegex =
    /("(?:\\.|[^"\\])*"(?:\s*:)?|[0-9]+(?:\.[0-9]+)?|true|false|null|[{}\[\],:]|\s+)/g;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const text = match[0];
    const key = `${lineIdx}-${tokenIdx++}`;

    if (/^\s+$/.test(text)) {
      nodes.push(<React.Fragment key={key}>{text}</React.Fragment>);
      continue;
    }

    if (text.endsWith(':')) {
      // Key
      nodes.push(
        <span key={key} style={{ color: tokens.func }}>
          {text}
        </span>
      );
      continue;
    }

    if (text.startsWith('"')) {
      nodes.push(
        <span key={key} style={{ color: tokens.string }}>
          {text}
        </span>
      );
      continue;
    }

    if (/^(?:true|false|null|[0-9]+(?:\.[0-9]+)?)$/.test(text)) {
      nodes.push(
        <span key={key} style={{ color: tokens.literal }}>
          {text}
        </span>
      );
      continue;
    }

    nodes.push(
      <span key={key} style={{ color: tokens.punctuation }}>
        {text}
      </span>
    );
  }

  return <React.Fragment key={lineIdx}>{nodes}</React.Fragment>;
}

export const CodeHighlight: React.FC<CodeHighlightProps> = ({
  code,
  language = 'bash',
  onOpenFile,
  isDark = true,
}) => {
  const cleaned = stripAnsi(code || '');
  const lines = cleaned.split('\n');
  const lang = (language || 'bash').toLowerCase().trim();
  const tokens = getTokenColors(isDark);

  const isBash = ['bash', 'sh', 'shell', 'zsh', 'terminal', 'cmd'].includes(lang);
  const isJsTs = ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'].includes(lang);
  const isPy = ['python', 'py'].includes(lang);
  const isJson = ['json'].includes(lang);

  return (
    <>
      {lines.map((line, idx) => {
        let content: React.ReactNode;
        if (isBash) {
          content = highlightBashLine(line, idx, tokens, onOpenFile);
        } else if (isJsTs) {
          content = highlightJsLine(line, idx, tokens, onOpenFile);
        } else if (isPy) {
          content = highlightPyLine(line, idx, tokens);
        } else if (isJson) {
          content = highlightJsonLine(line, idx, tokens);
        } else {
          // Fallback: check comments & file links
          if (/^\s*#/.test(line) || /^\s*\/\//.test(line)) {
            content = (
              <span key={idx} style={{ color: tokens.comment }}>
                {line}
              </span>
            );
          } else if (line.includes(':') && onOpenFile) {
            content = renderFileLinks(line, `gen-${idx}`, tokens, onOpenFile);
          } else {
            content = (
              <span key={idx} style={{ color: tokens.text }}>
                {line}
              </span>
            );
          }
        }

        return (
          <div
            key={idx}
            style={{
              minHeight: '20px',
              whiteSpace: 'pre',
            }}
          >
            {content || '\u00A0'}
          </div>
        );
      })}
    </>
  );
};
