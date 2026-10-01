import { describe, it, expect } from 'vitest';
import {
  resolveWorkspacePath,
  recordChange,
  mergeStatus,
  reverseApplyUnifiedDiff,
  groupByLanguage,
  countDiff,
  sortedChanges,
} from '../src/renderer/services/aiChanges';
import { resolveSetiIcon, languageLabelFor, SetiIconTheme } from '../src/renderer/services/fileIcons';
import setiTheme from '../node_modules/@codingame/monaco-vscode-theme-seti-default-extension/resources/vs-seti-icon-theme.json';

const ROOT = '/Users/me/Projects/MyApp';

describe('resolveWorkspacePath', () => {
  it('resolves relative and absolute in-workspace paths', () => {
    expect(resolveWorkspacePath('backend/main.py', ROOT)).toEqual({
      absPath: `${ROOT}/backend/main.py`,
      path: 'backend/main.py',
      outsideWorkspace: false,
    });
    expect(resolveWorkspacePath(`${ROOT}/a/../b.ts`, ROOT)?.path).toBe('b.ts');
  });
  it('flags paths outside the workspace and rejects relative paths without a workspace', () => {
    expect(resolveWorkspacePath('/tmp/x.py', ROOT)?.outsideWorkspace).toBe(true);
    expect(resolveWorkspacePath('../x.py', ROOT)?.outsideWorkspace).toBe(true);
    expect(resolveWorkspacePath('x.py', null)).toBeNull();
  });
});

describe('change tracking', () => {
  const p = (path: string) => resolveWorkspacePath(path, ROOT)!;

  it('merges statuses across a task', () => {
    expect(mergeStatus('created', 'modified')).toBe('created');
    expect(mergeStatus('created', 'deleted')).toBeNull();
    expect(mergeStatus('deleted', 'created')).toBe('modified');
    expect(mergeStatus(undefined, 'deleted')).toBe('deleted');
  });

  it('records, upgrades and removes entries', () => {
    let map = recordChange({}, p('a.py'), 'created');
    map = recordChange(map, p('a.py'), 'modified', { additions: 3 });
    map = recordChange(map, p('b.py'), 'modified');
    expect(sortedChanges(map).map((c) => [c.path, c.status, c.additions])).toEqual([
      ['a.py', 'created', 3],
      ['b.py', 'modified', 0],
    ]);
    map = recordChange(map, p('a.py'), 'deleted');
    expect(Object.keys(map)).toEqual(['b.py']);
  });

  it('groups by language', () => {
    const map = ['m.py', 'App.tsx', 'a.py'].reduce((acc, f) => recordChange(acc, p(f), 'modified'), {});
    const groups = groupByLanguage(sortedChanges(map));
    expect(groups.map((g) => [g.label, g.files.map((f) => f.path)])).toEqual([
      ['Python', ['a.py', 'm.py']],
      ['React', ['App.tsx']],
    ]);
  });
});

describe('reverseApplyUnifiedDiff', () => {
  it('reconstructs the original content', () => {
    const original = 'a\nb\nc\nd\ne\n';
    const current = 'a\nB\nc\nd\nnew\ne\n';
    const diff = '--- a\n+++ b\n@@ -1,5 +1,6 @@\n a\n-b\n+B\n c\n d\n+new\n e\n ';
    expect(reverseApplyUnifiedDiff(current, diff)).toBe(original);
    expect(countDiff(diff)).toEqual({ additions: 2, deletions: 1 });
  });
  it('restores a deleted file from a pure-removal diff and a created file to empty', () => {
    expect(reverseApplyUnifiedDiff('', '@@ -1,2 +0,0 @@\n-x\n-y')).toBe('x\ny\n');
    expect(reverseApplyUnifiedDiff('x\ny', '@@ -0,0 +1,2 @@\n+x\n+y')).toBe('');
  });
  it('returns null on mismatch instead of producing a fake diff', () => {
    expect(reverseApplyUnifiedDiff('zzz', '@@ -1 +1 @@\n-a\n+b')).toBeNull();
    expect(reverseApplyUnifiedDiff('a', 'no hunks')).toBeNull();
  });
});

describe('file icons', () => {
  const theme = setiTheme as unknown as SetiIconTheme;
  const files = [
    'main.py', 'script.js', 'a.ts', 'App.tsx', 'App.jsx', 'index.html', 'styles.css', 'package.json', 'Main.java',
    'a.c', 'main.cpp', 'a.cs', 'main.go', 'main.rs', 'main.dart', 'a.kt', 'a.swift', 'a.php', 'a.rb', 'a.sh',
    'README.md', 'a.yaml', 'a.xml', 'a.sql', 'Dockerfile', '.gitignore',
  ];
  it.each(files)('resolves a specific icon for %s', (file) => {
    const icon = resolveSetiIcon(theme, file);
    const fallback = resolveSetiIcon(theme, 'unknown.zzzz');
    expect(icon).not.toBeNull();
    expect(icon!.character).not.toBe(fallback!.character);
  });
  it('labels languages', () => {
    expect(languageLabelFor('x/App.tsx')).toBe('React');
    expect(languageLabelFor('Dockerfile')).toBe('Docker');
  });
});
