import React from 'react';

export interface CodeHighlightProps {
  code: string;
  language?: string;
  onOpenFile?: (fileRef: string) => void;
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

// Color tokens matching the reference screenshot & modern dark theme
export const TOKEN_COLORS = {
  comment: '#81c995', // Soft green (matches "# > tsc --noEmit" & "# Exit code: 0")
  command: '#f08c78', // Warm peach/coral for CLI commands (npm, npx, git, etc.)
  subcommand: '#e5c07b', // Warm yellow/cream for verbs (run, typecheck, lint, build)
  flag: '#7dd3fc', // Soft blue for CLI flags (--noEmit, -rf)
  string: '#fca5a5', // Coral peach for string literals
  variable: '#c678dd', // Soft violet for shell variables ($VAR)
  keyword: '#c678dd', // Soft violet for language keywords (import, const, def)
  literal: '#d19a66', // Warm amber for booleans & primitives
  number: '#d19a66', // Warm amber for numeric literals
  type: '#4ec9b0', // Soft teal for types & interfaces
  func: '#61afef', // Soft blue for function calls
  link: '#93c5fd', // Link color for file:line locations
  text: '#e4e4e7', // Clean light neutral text
  dim: '#71717a', // Muted prompt/divider text
};

function renderFileLinks(
  text: string,
  keyPrefix: string,
  onOpenFile?: (fileRef: string) => void,
  defaultColor = TOKEN_COLORS.text
): React.ReactNode[] {
  const fileLocRegex = /(?:([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fileLocRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-t-${lastIndex}`} style={{ color: defaultColor }}>
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
            color: TOKEN_COLORS.link,
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
          style={{ color: TOKEN_COLORS.link, textDecoration: 'underline' }}
        >
          {fullRef}
        </span>
      );
    }
    lastIndex = fileLocRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-t-end`} style={{ color: defaultColor }}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return nodes;
}

function highlightBashLine(
  line: string,
  lineIdx: number,
  onOpenFile?: (fileRef: string) => void
): React.ReactNode {
  // If line is purely a comment (starts with optional whitespace and #)
  if (/^\s*#/.test(line)) {
    return (
      <span key={lineIdx} style={{ color: TOKEN_COLORS.comment }}>
        {line}
      </span>
    );
  }

  const tokens: React.ReactNode[] = [];
  // Tokenize strings, inline comments, flags, variables, words, or whitespace
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
      tokens.push(<React.Fragment key={key}>{text}</React.Fragment>);
      continue;
    }

    // Comment (#...)
    if (text.startsWith('#')) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.comment }}>
          {text}
        </span>
      );
      continue;
    }

    // Strings
    if (text.startsWith('"') || text.startsWith("'")) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.string }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Flags (--flag, -f)
    if (text.startsWith('-')) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.flag }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Variables ($VAR, ${VAR})
    if (text.startsWith('$')) {
      if (text === '$') {
        // Muted prompt symbol
        tokens.push(
          <span key={key} style={{ color: TOKEN_COLORS.dim }}>
            {text}
          </span>
        );
        isFirstCommandWord = true;
      } else {
        tokens.push(
          <span key={key} style={{ color: TOKEN_COLORS.variable }}>
            {text}
          </span>
        );
        isFirstCommandWord = false;
      }
      continue;
    }

    // Separators (|, &&, ||, ;) reset first command word
    if (/^(?:\||&&|\|\||;)$/.test(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.dim }}>
          {text}
        </span>
      );
      isFirstCommandWord = true;
      continue;
    }

    // Numeric literals
    if (/^\d+$/.test(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.number }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Commands (npm, npx, git, etc.)
    if (isFirstCommandWord && BASH_COMMANDS.has(text.toLowerCase())) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.command, fontWeight: 500 }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Subcommands (run, typecheck, lint, etc.)
    if (BASH_SUBCOMMANDS.has(text.toLowerCase())) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.subcommand }}>
          {text}
        </span>
      );
      isFirstCommandWord = false;
      continue;
    }

    // Check if word contains a clickable file reference
    if (text.includes(':') && (text.includes('.') || text.includes('/'))) {
      const nodes = renderFileLinks(text, key, onOpenFile);
      tokens.push(<React.Fragment key={key}>{nodes}</React.Fragment>);
    } else {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.text }}>
          {text}
        </span>
      );
    }
    isFirstCommandWord = false;
  }

  return <React.Fragment key={lineIdx}>{tokens}</React.Fragment>;
}

function highlightJsLine(
  line: string,
  lineIdx: number,
  onOpenFile?: (fileRef: string) => void
): React.ReactNode {
  // Line comment
  if (/^\s*\/\//.test(line)) {
    return (
      <span key={lineIdx} style={{ color: TOKEN_COLORS.comment }}>
        {line}
      </span>
    );
  }

  const tokens: React.ReactNode[] = [];
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|[a-zA-Z_$][a-zA-Z0-9_$]*|[0-9]+(?:\.[0-9]+)?|[{}()[\];,.<>:=+\-*/&|!%^~?]+|\s+)/g;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const text = match[0];
    const key = `${lineIdx}-${tokenIdx++}`;

    if (/^\s+$/.test(text)) {
      tokens.push(<React.Fragment key={key}>{text}</React.Fragment>);
      continue;
    }

    if (text.startsWith('//')) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.comment }}>
          {text}
        </span>
      );
      continue;
    }

    if (text.startsWith('"') || text.startsWith("'") || text.startsWith('`')) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.string }}>
          {text}
        </span>
      );
      continue;
    }

    if (JS_KEYWORDS.has(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.keyword }}>
          {text}
        </span>
      );
      continue;
    }

    if (JS_LITERALS.has(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.literal }}>
          {text}
        </span>
      );
      continue;
    }

    if (/^[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.number }}>
          {text}
        </span>
      );
      continue;
    }

    // Capitalized word -> Likely a Type / Component
    if (/^[A-Z][a-zA-Z0-9_$]*$/.test(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.type }}>
          {text}
        </span>
      );
      continue;
    }

    // Check punctuation or regular text
    if (/^[{}()[\];,.<>:=+\-*/&|!%^~?]+$/.test(text)) {
      tokens.push(
        <span key={key} style={{ color: '#9ca3af' }}>
          {text}
        </span>
      );
      continue;
    }

    if (onOpenFile && text.includes(':') && (text.includes('.') || text.includes('/'))) {
      const nodes = renderFileLinks(text, key, onOpenFile);
      tokens.push(<React.Fragment key={key}>{nodes}</React.Fragment>);
      continue;
    }

    tokens.push(
      <span key={key} style={{ color: TOKEN_COLORS.text }}>
        {text}
      </span>
    );
  }

  return <React.Fragment key={lineIdx}>{tokens}</React.Fragment>;
}

function highlightPyLine(
  line: string,
  lineIdx: number
): React.ReactNode {
  if (/^\s*#/.test(line)) {
    return (
      <span key={lineIdx} style={{ color: TOKEN_COLORS.comment }}>
        {line}
      </span>
    );
  }

  const tokens: React.ReactNode[] = [];
  const tokenRegex =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*|[a-zA-Z_][a-zA-Z0-9_]*|[0-9]+(?:\.[0-9]+)?|[{}()[\];,.<>:=+\-*/&|!%^~?]+|\s+)/g;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const text = match[0];
    const key = `${lineIdx}-${tokenIdx++}`;

    if (/^\s+$/.test(text)) {
      tokens.push(<React.Fragment key={key}>{text}</React.Fragment>);
      continue;
    }

    if (text.startsWith('#')) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.comment }}>
          {text}
        </span>
      );
      continue;
    }

    if (text.startsWith('"') || text.startsWith("'")) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.string }}>
          {text}
        </span>
      );
      continue;
    }

    if (PY_KEYWORDS.has(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.keyword }}>
          {text}
        </span>
      );
      continue;
    }

    if (PY_LITERALS.has(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.literal }}>
          {text}
        </span>
      );
      continue;
    }

    if (/^[0-9]+(?:\.[0-9]+)?$/.test(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.number }}>
          {text}
        </span>
      );
      continue;
    }

    tokens.push(
      <span key={key} style={{ color: TOKEN_COLORS.text }}>
        {text}
      </span>
    );
  }

  return <React.Fragment key={lineIdx}>{tokens}</React.Fragment>;
}

function highlightJsonLine(
  line: string,
  lineIdx: number
): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  const tokenRegex =
    /("(?:\\.|[^"\\])*"(?:\s*:)?|[0-9]+(?:\.[0-9]+)?|true|false|null|[{}[\],:]|\s+)/g;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const text = match[0];
    const key = `${lineIdx}-${tokenIdx++}`;

    if (/^\s+$/.test(text)) {
      tokens.push(<React.Fragment key={key}>{text}</React.Fragment>);
      continue;
    }

    if (text.endsWith(':')) {
      // Key
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.func }}>
          {text}
        </span>
      );
      continue;
    }

    if (text.startsWith('"')) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.string }}>
          {text}
        </span>
      );
      continue;
    }

    if (/^(?:true|false|null|[0-9]+(?:\.[0-9]+)?)$/.test(text)) {
      tokens.push(
        <span key={key} style={{ color: TOKEN_COLORS.literal }}>
          {text}
        </span>
      );
      continue;
    }

    tokens.push(
      <span key={key} style={{ color: '#9ca3af' }}>
        {text}
      </span>
    );
  }

  return <React.Fragment key={lineIdx}>{tokens}</React.Fragment>;
}

export const CodeHighlight: React.FC<CodeHighlightProps> = ({
  code,
  language = 'bash',
  onOpenFile,
}) => {
  const cleaned = stripAnsi(code || '');
  const lines = cleaned.split('\n');
  const lang = (language || 'bash').toLowerCase().trim();

  const isBash = ['bash', 'sh', 'shell', 'zsh', 'terminal', 'cmd'].includes(lang);
  const isJsTs = ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'].includes(lang);
  const isPy = ['python', 'py'].includes(lang);
  const isJson = ['json'].includes(lang);

  return (
    <>
      {lines.map((line, idx) => {
        let content: React.ReactNode;
        if (isBash) {
          content = highlightBashLine(line, idx, onOpenFile);
        } else if (isJsTs) {
          content = highlightJsLine(line, idx, onOpenFile);
        } else if (isPy) {
          content = highlightPyLine(line, idx);
        } else if (isJson) {
          content = highlightJsonLine(line, idx);
        } else {
          // Fallback: check comments & file links
          if (/^\s*#/.test(line) || /^\s*\/\//.test(line)) {
            content = (
              <span key={idx} style={{ color: TOKEN_COLORS.comment }}>
                {line}
              </span>
            );
          } else if (line.includes(':') && onOpenFile) {
            content = renderFileLinks(line, `gen-${idx}`, onOpenFile);
          } else {
            content = (
              <span key={idx} style={{ color: TOKEN_COLORS.text }}>
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
