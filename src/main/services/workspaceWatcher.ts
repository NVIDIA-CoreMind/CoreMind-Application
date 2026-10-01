import fs from 'node:fs';
import path from 'node:path';
import type { WebContents } from 'electron';
import { IPC_CHANNELS, WorkspaceFileChange } from '../../shared/types/ipc';
import { logger } from './logger';

const IGNORED_SEGMENTS = new Set(['.git', 'node_modules', '.DS_Store', '__pycache__', '.venv', 'dist', 'build']);
const DEBOUNCE_MS = 150;

interface ActiveWatch {
  root: string;
  watcher: fs.FSWatcher;
  pending: Set<string>;
  timer: NodeJS.Timeout | null;
}

const watches = new Map<number, ActiveWatch>();

function isIgnored(relativePath: string): boolean {
  return relativePath.split(path.sep).some((segment) => IGNORED_SEGMENTS.has(segment));
}

function classify(absPath: string): WorkspaceFileChange['type'] {
  return fs.existsSync(absPath) ? 'changed' : 'deleted';
}

export function stopWorkspaceWatch(webContentsId: number): void {
  const active = watches.get(webContentsId);
  if (!active) return;
  if (active.timer) clearTimeout(active.timer);
  active.watcher.close();
  watches.delete(webContentsId);
}

// Reports real on-disk changes (agent tools, terminal, external editors) so the Workbench Explorer stays accurate.
export function startWorkspaceWatch(sender: WebContents, root: string): void {
  const existing = watches.get(sender.id);
  if (existing?.root === root) return;
  stopWorkspaceWatch(sender.id);

  try {
    const pending = new Set<string>();
    const state: ActiveWatch = { root, pending, timer: null, watcher: null as unknown as fs.FSWatcher };

    const flush = () => {
      state.timer = null;
      if (sender.isDestroyed()) {
        stopWorkspaceWatch(sender.id);
        return;
      }
      const changes: WorkspaceFileChange[] = [...pending].map((p) => ({ path: p, type: classify(p) }));
      pending.clear();
      if (changes.length > 0) sender.send(IPC_CHANNELS.WORKSPACE_FILES_CHANGED, changes);
    };

    state.watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
      if (!filename || isIgnored(filename.toString())) return;
      pending.add(path.join(root, filename.toString()));
      if (!state.timer) state.timer = setTimeout(flush, DEBOUNCE_MS);
    });
    state.watcher.on('error', (err) => logger.warn('Workspace watcher error', { message: err.message }));
    watches.set(sender.id, state);
  } catch (err: unknown) {
    logger.warn('Failed to start workspace watcher', { message: (err as Error).message });
  }
}
