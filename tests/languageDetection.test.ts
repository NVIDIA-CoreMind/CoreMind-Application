import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../src/renderer/stores/tabsStore';

describe('Editor Language Detection', () => {
  it('detects TypeScript files', () => {
    expect(detectLanguage('main.ts')).toBe('typescript');
    expect(detectLanguage('App.tsx')).toBe('typescript');
  });

  it('detects JavaScript files', () => {
    expect(detectLanguage('index.js')).toBe('javascript');
    expect(detectLanguage('Component.jsx')).toBe('javascript');
    expect(detectLanguage('server.mjs')).toBe('javascript');
  });

  it('detects Python files', () => {
    expect(detectLanguage('train.py')).toBe('python');
    expect(detectLanguage('agent.py')).toBe('python');
  });

  it('detects Dart files', () => {
    expect(detectLanguage('main.dart')).toBe('dart');
  });

  it('detects JSON files', () => {
    expect(detectLanguage('package.json')).toBe('json');
    expect(detectLanguage('tsconfig.json')).toBe('json');
  });

  it('detects Markdown and markup', () => {
    expect(detectLanguage('README.md')).toBe('markdown');
    expect(detectLanguage('index.html')).toBe('html');
    expect(detectLanguage('style.css')).toBe('css');
  });

  it('falls back to plaintext for unknown files', () => {
    expect(detectLanguage('unknown.xyz')).toBe('plaintext');
    expect(detectLanguage('Dockerfile')).toBe('plaintext');
  });
});
