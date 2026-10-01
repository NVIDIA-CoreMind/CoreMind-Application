// Single source of truth for file type -> language/icon resolution outside the VS Code Workbench.
// The Workbench renders the same Seti icon theme natively (see `workbench.iconTheme` in CoreMindWorkbench),
// so Explorer, tabs, open editors and React surfaces all share one icon set.

export interface SetiIconDefinition {
  fontCharacter: string;
  fontColor?: string;
}

export interface SetiIconTheme {
  iconDefinitions: Record<string, SetiIconDefinition>;
  file: string;
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  languageIds: Record<string, string>;
}

export interface ResolvedIcon {
  character: string;
  color?: string;
}

const EXTENSION_LANGUAGE: Record<string, string> = {
  py: 'python',
  pyw: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascriptreact',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'typescriptreact',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  jsonc: 'jsonc',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  dart: 'dart',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  php: 'php',
  rb: 'ruby',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  md: 'markdown',
  markdown: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  sql: 'sql',
};

const FILENAME_LANGUAGE: Record<string, string> = {
  dockerfile: 'dockerfile',
  '.gitignore': 'ignore',
  '.gitattributes': 'properties',
  '.dockerignore': 'ignore',
};

// Human-friendly group names used by the AI Changes panel ("React", "Python", ...).
const LANGUAGE_LABEL: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  javascriptreact: 'React',
  typescript: 'TypeScript',
  typescriptreact: 'React',
  html: 'HTML',
  css: 'CSS',
  scss: 'CSS',
  json: 'JSON',
  jsonc: 'JSON',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  dart: 'Dart',
  kotlin: 'Kotlin',
  swift: 'Swift',
  php: 'PHP',
  ruby: 'Ruby',
  shellscript: 'Shell',
  markdown: 'Markdown',
  yaml: 'YAML',
  xml: 'XML',
  sql: 'SQL',
  dockerfile: 'Docker',
  ignore: 'Git',
  properties: 'Git',
};

export function baseName(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
}

export function extensionOf(filePath: string): string {
  const name = baseName(filePath).toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : '';
}

export function languageIdFor(filePath: string): string | undefined {
  const name = baseName(filePath).toLowerCase();
  if (FILENAME_LANGUAGE[name]) return FILENAME_LANGUAGE[name];
  if (name.startsWith('dockerfile')) return 'dockerfile';
  return EXTENSION_LANGUAGE[extensionOf(filePath)];
}

export function languageLabelFor(filePath: string): string {
  const languageId = languageIdFor(filePath);
  return (languageId && LANGUAGE_LABEL[languageId]) || 'Other';
}

export function resolveSetiIcon(theme: SetiIconTheme, filePath: string): ResolvedIcon | null {
  const name = baseName(filePath).toLowerCase();
  const ext = extensionOf(filePath);
  const languageId = languageIdFor(filePath);

  // Same precedence as the VS Code icon theme service: file name, extension, language, default.
  const candidates = [
    theme.fileNames[name],
    ext ? theme.fileExtensions[ext] : undefined,
    languageId ? theme.languageIds[languageId] : undefined,
    theme.file,
  ];
  for (const key of candidates) {
    const definition = key ? theme.iconDefinitions[key] : undefined;
    if (definition) {
      return {
        character: String.fromCodePoint(parseInt(definition.fontCharacter.replace(/\\/g, ''), 16)),
        color: definition.fontColor,
      };
    }
  }
  return null;
}
