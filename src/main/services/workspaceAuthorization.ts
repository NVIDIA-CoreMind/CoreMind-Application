import fs from 'node:fs';
import path from 'node:path';

import { app } from 'electron';

const workspacesByWebContents = new Map<number, string>();

function trustedWorkspacesFile(): string | null {
  try {
    return path.join(app.getPath('userData'), 'trusted-workspaces.json');
  } catch {
    return null;
  }
}

function readTrustedWorkspaces(): string[] {
  const file = trustedWorkspacesFile();
  if (!file) return [];
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function rememberTrustedWorkspace(canonicalPath: string): void {
  const file = trustedWorkspacesFile();
  if (!file) return;
  const next = [canonicalPath, ...readTrustedWorkspaces().filter((p) => p !== canonicalPath)].slice(0, 50);
  try {
    fs.writeFileSync(file, JSON.stringify(next));
  } catch {
    // Persistence is best-effort; the in-memory authorization still applies.
  }
}

// Authorizes a path the user explicitly chose (dialog/menu) and remembers it for later restores.
export function authorizeWorkspace(webContentsId: number, workspacePath: string): string {
  const canonicalPath = fs.realpathSync(workspacePath);
  workspacesByWebContents.set(webContentsId, canonicalPath);
  rememberTrustedWorkspace(canonicalPath);
  return canonicalPath;
}

// Re-authorizes only a workspace the user previously selected; arbitrary renderer paths are rejected.
export function restoreWorkspace(webContentsId: number, workspacePath: string): string | null {
  let canonicalPath: string;
  try {
    canonicalPath = fs.realpathSync(workspacePath);
  } catch {
    return null;
  }
  if (!readTrustedWorkspaces().includes(canonicalPath)) return null;
  workspacesByWebContents.set(webContentsId, canonicalPath);
  return canonicalPath;
}

export function getAuthorizedWorkspace(webContentsId: number): string | undefined {
  return workspacesByWebContents.get(webContentsId);
}

export function clearAuthorizedWorkspace(webContentsId: number): void {
  workspacesByWebContents.delete(webContentsId);
}

export function isAuthorizedWorkspacePath(webContentsId: number, requestedPath: string): boolean {
  const workspacePath = getAuthorizedWorkspace(webContentsId);
  return workspacePath !== undefined && path.resolve(requestedPath) === path.resolve(workspacePath);
}
