import { ParsedDiff, DiffHunk } from '../../types/aiWorkspace';

/**
 * Parses a standard unified diff string into structured hunks and lines
 * for syntax-aware visual rendering with line numbers.
 */
export function parseUnifiedDiff(rawDiff: string, filePath: string): ParsedDiff {
  if (!rawDiff || typeof rawDiff !== 'string') {
    return {
      filePath,
      status: 'modified',
      additions: 0,
      deletions: 0,
      hunks: [],
      rawDiff: '',
    };
  }

  const lines = rawDiff.split('\n');
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let additions = 0;
  let deletions = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Hunk Header e.g. @@ -1,5 +1,6 @@ optional section title
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(?:(.*))?$/);
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      const oldStart = parseInt(hunkMatch[1], 10);
      const oldCount = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
      const newStart = parseInt(hunkMatch[3], 10);
      const newCount = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1;

      oldLineNum = oldStart;
      newLineNum = newStart;

      currentHunk = {
        header: line,
        lines: [],
        oldStart,
        oldCount,
        newStart,
        newCount,
      };
      continue;
    }

    // Skip git diff headers before the first hunk
    if (!currentHunk) {
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
      currentHunk.lines.push({
        type: 'add',
        content: line.slice(1),
        newLineNumber: newLineNum++,
      });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
      currentHunk.lines.push({
        type: 'delete',
        content: line.slice(1),
        oldLineNumber: oldLineNum++,
      });
    } else if (line.startsWith(' ') || line === '') {
      currentHunk.lines.push({
        type: 'context',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      });
    } else if (line.startsWith('\\ No newline at end of file')) {
      // Ignored indicator
    } else {
      // Treat other lines as context if in a hunk
      currentHunk.lines.push({
        type: 'context',
        content: line,
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
      });
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  // If no hunks were generated (e.g. newly created file without standard unified header),
  // convert lines into add lines
  if (hunks.length === 0 && rawDiff.trim().length > 0) {
    const rawLines = rawDiff.split('\n');
    const fallbackHunk: DiffHunk = {
      header: '@@ -0,0 +1,' + rawLines.length + ' @@',
      lines: rawLines.map((l, idx) => ({
        type: 'add',
        content: l.startsWith('+') ? l.slice(1) : l,
        newLineNumber: idx + 1,
      })),
      oldStart: 0,
      oldCount: 0,
      newStart: 1,
      newCount: rawLines.length,
    };
    hunks.push(fallbackHunk);
    additions = rawLines.length;
  }

  let status: 'created' | 'modified' | 'deleted' = 'modified';
  if (deletions === 0 && additions > 0) {
    status = 'created';
  } else if (additions === 0 && deletions > 0) {
    status = 'deleted';
  }

  return {
    filePath,
    status,
    additions,
    deletions,
    hunks,
    rawDiff,
  };
}
