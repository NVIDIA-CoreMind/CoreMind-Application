import { languageLabelFor } from './fileIcons';

export type ChangeStatus = 'created' | 'modified' | 'deleted';

export interface TrackedChange {
  /** Workspace-relative POSIX path, or the absolute path when outside the workspace. */
  path: string;
  absPath: string;
  status: ChangeStatus;
  outsideWorkspace: boolean;
  additions: number;
  deletions: number;
  /** Unified diff reported by the backend, when available. */
  diff?: string;
  /** Original content: string = prior content, null = file did not exist, undefined = unknown. */
  baseline?: string | null;
}

export type ChangeMap = Record<string, TrackedChange>;

export interface ResolvedPath {
  absPath: string;
  path: string;
  outsideWorkspace: boolean;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function collapse(value: string): string {
  const isAbs = value.startsWith('/');
  const out: string[] = [];
  for (const part of value.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return (isAbs ? '/' : '') + out.join('/');
}

export function resolveWorkspacePath(rawPath: string, rootPath: string | null): ResolvedPath | null {
  const cleaned = normalizeSlashes(rawPath.trim());
  if (!cleaned) return null;
  const root = rootPath ? collapse(normalizeSlashes(rootPath)) : null;
  const isAbsolute = cleaned.startsWith('/') || /^[A-Za-z]:\//.test(cleaned);

  if (!isAbsolute) {
    if (!root) return null;
    const absPath = collapse(`${root}/${cleaned}`);
    if (absPath !== root && absPath.startsWith(`${root}/`)) {
      return { absPath, path: absPath.slice(root.length + 1), outsideWorkspace: false };
    }
    return { absPath, path: absPath, outsideWorkspace: true };
  }

  const absPath = collapse(cleaned);
  if (root && absPath.startsWith(`${root}/`)) {
    return { absPath, path: absPath.slice(root.length + 1), outsideWorkspace: false };
  }
  return { absPath, path: absPath, outsideWorkspace: true };
}

// Combines the previous known status of a file in this task with a newly observed one.
// Returns null when the net effect is nothing (created then deleted within the same task).
export function mergeStatus(prev: ChangeStatus | undefined, next: ChangeStatus): ChangeStatus | null {
  if (!prev) return next;
  if (prev === 'created') return next === 'deleted' ? null : 'created';
  if (prev === 'deleted') return next === 'deleted' ? 'deleted' : 'modified';
  return next === 'deleted' ? 'deleted' : 'modified';
}

export function recordChange(
  changes: ChangeMap,
  resolved: ResolvedPath,
  status: ChangeStatus,
  extra: Partial<Pick<TrackedChange, 'diff' | 'additions' | 'deletions' | 'baseline'>> = {}
): ChangeMap {
  const prev = changes[resolved.path];
  const merged = mergeStatus(prev?.status, status);
  if (merged === null) {
    const { [resolved.path]: _removed, ...rest } = changes;
    return rest;
  }
  return {
    ...changes,
    [resolved.path]: {
      path: resolved.path,
      absPath: resolved.absPath,
      outsideWorkspace: resolved.outsideWorkspace,
      status: merged,
      additions: extra.additions ?? prev?.additions ?? 0,
      deletions: extra.deletions ?? prev?.deletions ?? 0,
      diff: extra.diff ?? prev?.diff,
      baseline: extra.baseline !== undefined ? extra.baseline : prev?.baseline,
    },
  };
}

export function countDiff(diff: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }
  return { additions, deletions };
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

// Reconstructs the pre-change content by undoing a unified diff against the current content.
// Returns null when the diff does not match the content, so callers never show a wrong diff.
export function reverseApplyUnifiedDiff(current: string, diff: string): string | null {
  const hunks: { newStart: number; newCount: number; oldLines: string[]; newLines: string[] }[] = [];
  let hunk: (typeof hunks)[number] | null = null;

  for (const line of diff.split('\n')) {
    const header = HUNK_HEADER.exec(line);
    if (header) {
      hunk = {
        newStart: parseInt(header[3], 10),
        newCount: header[4] === undefined ? 1 : parseInt(header[4], 10),
        oldLines: [],
        newLines: [],
      };
      hunks.push(hunk);
      continue;
    }
    if (!hunk || line.startsWith('\\')) continue;
    if (line.startsWith('+')) hunk.newLines.push(line.slice(1));
    else if (line.startsWith('-')) hunk.oldLines.push(line.slice(1));
    else if (line.startsWith(' ')) {
      hunk.oldLines.push(line.slice(1));
      hunk.newLines.push(line.slice(1));
    }
  }

  if (hunks.length === 0) return null;

  const lines = current.split('\n');
  for (const h of [...hunks].reverse()) {
    const start = h.newCount === 0 ? h.newStart : h.newStart - 1;
    const existing = lines.slice(start, start + h.newLines.length);
    if (existing.length !== h.newLines.length || existing.some((l, i) => l !== h.newLines[i])) {
      return null;
    }
    lines.splice(start, h.newLines.length, ...h.oldLines);
  }
  return lines.join('\n');
}

export interface ChangeGroup {
  label: string;
  files: TrackedChange[];
}

export function groupByLanguage(changes: TrackedChange[]): ChangeGroup[] {
  const groups = new Map<string, TrackedChange[]>();
  for (const change of changes) {
    const label = languageLabelFor(change.path);
    groups.set(label, [...(groups.get(label) ?? []), change]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
    .map(([label, files]) => ({ label, files: files.sort((a, b) => a.path.localeCompare(b.path)) }));
}

export function sortedChanges(map: ChangeMap): TrackedChange[] {
  return Object.values(map).sort((a, b) => a.path.localeCompare(b.path));
}

export const STATUS_BADGE: Record<ChangeStatus, string> = {
  created: '+',
  modified: 'M',
  deleted: 'D',
};

export const STATUS_LABEL: Record<ChangeStatus, string> = {
  created: 'Created',
  modified: 'Modified',
  deleted: 'Deleted',
};
