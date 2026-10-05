import { describe, it, expect } from 'vitest';
import { formatIdeTitle, extractBaseName } from '../src/shared/utils/title';

describe('formatIdeTitle', () => {
  it('formats correctly when both folder and file are opened', () => {
    expect(formatIdeTitle('yashas(8350117)', 'autoplace code,.docx')).toBe(
      'yashas(8350117) - CoreMind - autoplace code,.docx'
    );
  });

  it('handles paths with slashes or backslashes for folder and file', () => {
    expect(
      formatIdeTitle(
        'D:\\ATS\\yashas(8350117)',
        'D:\\ATS\\yashas(8350117)\\autoplace code,.docx'
      )
    ).toBe('yashas(8350117) - CoreMind - autoplace code,.docx');

    expect(
      formatIdeTitle(
        '/Users/manojsarya/projects/CoreMind-App',
        'coremind:/projects/CoreMind-App/src/index.ts'
      )
    ).toBe('CoreMind-App - CoreMind - index.ts');
  });

  it('formats correctly when only folder is opened', () => {
    expect(formatIdeTitle('yashas(8350117)', null)).toBe('yashas(8350117) - CoreMind');
    expect(formatIdeTitle('yashas(8350117)', '')).toBe('yashas(8350117) - CoreMind');
    expect(formatIdeTitle('yashas(8350117)', undefined)).toBe('yashas(8350117) - CoreMind');
  });

  it('formats correctly when only file is opened', () => {
    expect(formatIdeTitle(null, 'autoplace code,.docx')).toBe('CoreMind - autoplace code,.docx');
    expect(formatIdeTitle('', 'autoplace code,.docx')).toBe('CoreMind - autoplace code,.docx');
    expect(formatIdeTitle(undefined, 'autoplace code,.docx')).toBe('CoreMind - autoplace code,.docx');
  });

  it('formats correctly when neither folder nor file is opened (shows only IDE name)', () => {
    expect(formatIdeTitle(null, null)).toBe('CoreMind');
    expect(formatIdeTitle('', '')).toBe('CoreMind');
    expect(formatIdeTitle(undefined, undefined)).toBe('CoreMind');
  });

  it('allows custom IDE name if needed', () => {
    expect(formatIdeTitle('my-folder', 'main.py', 'CustomIDE')).toBe(
      'my-folder - CustomIDE - main.py'
    );
  });
});

describe('extractBaseName', () => {
  it('extracts filename from simple string', () => {
    expect(extractBaseName('autoplace code,.docx')).toBe('autoplace code,.docx');
  });

  it('extracts filename from windows path', () => {
    expect(extractBaseName('C:\\Users\\test\\file.txt')).toBe('file.txt');
  });

  it('extracts filename from posix path', () => {
    expect(extractBaseName('/var/log/app.log')).toBe('app.log');
  });

  it('strips trailing slashes from folders', () => {
    expect(extractBaseName('/var/log/subfolder///')).toBe('subfolder');
    expect(extractBaseName('C:\\Projects\\my-project\\\\')).toBe('my-project');
  });

  it('handles query strings or hash', () => {
    expect(extractBaseName('file.ts?v=1#hash')).toBe('file.ts');
  });

  it('returns null for empty or null inputs', () => {
    expect(extractBaseName(null)).toBeNull();
    expect(extractBaseName('')).toBeNull();
    expect(extractBaseName('   ')).toBeNull();
  });
});
