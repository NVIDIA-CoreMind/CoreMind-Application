/**
 * Workspace file access for the browser, built on the File System Access API (Chrome and Edge).
 *
 * A folder the user picks is registered as a virtual root, /web-workspace/<folder name>. Every
 * other path is resolved inside that folder's handle, so the explorer and editor use the same
 * path shapes as the desktop app. Handles stay in memory, so after a reload the user picks the
 * folder again.
 */

import type { FileNode, FileSearchResult, FileStat } from '../../shared/types/file';
import type { ImageReadResult, IpcResult } from '../../shared/types/ipc';

// The TypeScript DOM library does not include the File System Access API yet, so declare the parts used here.
interface WebWritable {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

export interface WebFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WebWritable>;
  move?: (...args: unknown[]) => Promise<void>;
}

export interface WebDirectoryHandle {
  kind: 'directory';
  name: string;
  entries(): AsyncIterable<[string, WebFileHandle | WebDirectoryHandle]>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<WebFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<WebDirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  move?: (...args: unknown[]) => Promise<void>;
}

type WebHandle = WebFileHandle | WebDirectoryHandle;

const WORKSPACE_PREFIX = '/web-workspace';
const SEARCH_RESULT_LIMIT = 500;
const SEARCH_MAX_FILE_BYTES = 1024 * 1024;
const SEARCH_SKIPPED_DIRS = new Set(['node_modules', '.git', 'build', 'dist']);
const IMAGE_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
};

const openFolders = new Map<string, WebDirectoryHandle>();

class WebFsFailure extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function succeed<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

function fail<T = never>(code: string, message: string): IpcResult<T> {
  return { success: false, error: { code, message } };
}

function errorName(err: unknown): string {
  return typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : '';
}

function toFailure<T>(err: unknown): IpcResult<T> {
  if (err instanceof WebFsFailure) return fail(err.code, err.message);
  switch (errorName(err)) {
    case 'NotFoundError':
      return fail('NOT_FOUND', 'That file or folder no longer exists.');
    case 'NotAllowedError':
    case 'SecurityError':
      return fail('PERMISSION_DENIED', 'The browser no longer allows access to this folder. Open it again.');
    case 'TypeMismatchError':
      return fail('TYPE_MISMATCH', 'A file and a folder with the same name are in the way.');
    default:
      return fail('FS_ERROR', err instanceof Error ? err.message : 'The file operation failed.');
  }
}

async function run<T>(operation: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return succeed(await operation());
  } catch (err) {
    return toFailure<T>(err);
  }
}

function normalizePath(path: string): string {
  return path.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
}

function joinPath(parentPath: string, name: string): string {
  return `${normalizePath(parentPath)}/${name}`;
}

function rootHandle(rootPath: string): WebDirectoryHandle {
  const handle = openFolders.get(normalizePath(rootPath));
  if (!handle) throw new WebFsFailure('NOT_OPEN', 'This folder is no longer open. Open it again.');
  return handle;
}

/** Path segments below the open folder. Rejects paths outside the folder and dot segments. */
function segmentsBelowRoot(rootPath: string, path: string): string[] {
  const root = normalizePath(rootPath);
  const target = normalizePath(path);
  const outside = new WebFsFailure('OUTSIDE_WORKSPACE', 'That path is outside the open folder.');
  if (target !== root && !target.startsWith(`${root}/`)) throw outside;
  const segments = target.slice(root.length).split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) throw outside;
  return segments;
}

async function findChild(directory: WebDirectoryHandle, name: string): Promise<WebHandle | null> {
  for await (const [entryName, handle] of directory.entries()) {
    if (entryName === name) return handle;
  }
  return null;
}

async function assertAbsent(parent: WebDirectoryHandle, name: string): Promise<void> {
  if (await findChild(parent, name)) {
    throw new WebFsFailure('ALREADY_EXISTS', `"${name}" already exists.`);
  }
}

async function resolveHandle(rootPath: string, path: string): Promise<WebHandle> {
  let current: WebHandle = rootHandle(rootPath);
  for (const segment of segmentsBelowRoot(rootPath, path)) {
    if (current.kind !== 'directory') throw new WebFsFailure('NOT_FOUND', 'That file or folder no longer exists.');
    const child = await findChild(current, segment);
    if (!child) throw new WebFsFailure('NOT_FOUND', 'That file or folder no longer exists.');
    current = child;
  }
  return current;
}

/** The folder that holds a path, and the final name, for operations that create or remove entries. */
async function resolveParent(rootPath: string, path: string): Promise<{ parent: WebDirectoryHandle; name: string }> {
  const segments = segmentsBelowRoot(rootPath, path);
  const name = segments.pop();
  if (!name) throw new WebFsFailure('INVALID_PATH', 'The open folder itself cannot be changed this way.');
  let parent = rootHandle(rootPath);
  for (const segment of segments) {
    parent = await parent.getDirectoryHandle(segment);
  }
  return { parent, name };
}

function extensionOf(name: string): string | undefined {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1) : undefined;
}

function byFolderThenName(a: FileNode, b: FileNode): number {
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
}

/** Registers an open folder and returns its virtual root path. */
export function registerFolder(handle: WebDirectoryHandle): string {
  const base = `${WORKSPACE_PREFIX}/${handle.name || 'Workspace'}`;
  let rootPath = base;
  for (let copy = 2; openFolders.has(rootPath); copy += 1) {
    rootPath = `${base} (${copy})`;
  }
  openFolders.set(rootPath, handle);
  return rootPath;
}

function isAbort(err: unknown): boolean {
  return errorName(err) === 'AbortError';
}

export async function pickFolder(): Promise<IpcResult<string | null>> {
  const host = globalThis as { showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<WebDirectoryHandle> };
  if (!host.showDirectoryPicker) {
    return fail('UNSUPPORTED', 'Opening a folder in the browser needs Chrome or Edge. Other browsers need the desktop app.');
  }
  try {
    const handle = await host.showDirectoryPicker({ mode: 'readwrite' });
    return succeed(registerFolder(handle));
  } catch (err) {
    if (isAbort(err)) return succeed(null);
    return toFailure(err);
  }
}

/** Folders are not persisted, so a root survives only while this page stays open. */
export function restoreFolder(rootPath: string): IpcResult<string | null> {
  const normalized = normalizePath(rootPath);
  return succeed(openFolders.has(normalized) ? normalized : null);
}

export function readDirectory(dirPath: string, rootPath: string): Promise<IpcResult<FileNode[]>> {
  return run(async () => {
    const directory = await resolveHandle(rootPath, dirPath);
    if (directory.kind !== 'directory') throw new WebFsFailure('NOT_A_FOLDER', 'That path is not a folder.');
    const nodes: FileNode[] = [];
    for await (const [name, handle] of directory.entries()) {
      const path = joinPath(dirPath, name);
      nodes.push({
        id: path,
        name,
        path,
        isDirectory: handle.kind === 'directory',
        extension: handle.kind === 'file' ? extensionOf(name) : undefined,
      });
    }
    return nodes.sort(byFolderThenName);
  });
}

export function statEntry(path: string, rootPath: string): Promise<IpcResult<FileStat>> {
  return run(async () => {
    const handle = await resolveHandle(rootPath, path);
    const normalized = normalizePath(path);
    const name = normalized.split('/').pop() || handle.name;
    if (handle.kind === 'directory') {
      return { name, path: normalized, isDirectory: true, size: 0, lastModified: 0 };
    }
    const file = await handle.getFile();
    return { name, path: normalized, isDirectory: false, size: file.size, lastModified: file.lastModified };
  });
}

export function readFileText(path: string, rootPath: string): Promise<IpcResult<string>> {
  return run(async () => {
    const handle = await resolveHandle(rootPath, path);
    if (handle.kind !== 'file') throw new WebFsFailure('IS_A_FOLDER', 'That path is a folder, not a file.');
    return (await handle.getFile()).text();
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function imageResult(file: File, filePath: string): Promise<ImageReadResult> {
  const fromName = IMAGE_MIME_TYPES[extensionOf(file.name)?.toLowerCase() ?? ''];
  const mimeType = file.type || fromName || 'application/octet-stream';
  const base64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
  return { dataUrl: `data:${mimeType};base64,${base64}`, base64, mimeType, size: file.size, name: file.name, filePath };
}

export function readImageFile(path: string, rootPath: string): Promise<IpcResult<ImageReadResult>> {
  return run(async () => {
    const handle = await resolveHandle(rootPath, path);
    if (handle.kind !== 'file') throw new WebFsFailure('IS_A_FOLDER', 'That path is a folder, not an image.');
    return imageResult(await handle.getFile(), normalizePath(path));
  });
}

export async function pickImage(): Promise<IpcResult<ImageReadResult | null>> {
  const host = globalThis as { showOpenFilePicker?: (options?: unknown) => Promise<WebFileHandle[]> };
  if (!host.showOpenFilePicker) {
    return fail('UNSUPPORTED', 'Choosing an image in the browser needs Chrome or Edge. Other browsers need the desktop app.');
  }
  try {
    const [handle] = await host.showOpenFilePicker({
      multiple: false,
      types: [{ description: 'Images', accept: { 'image/*': Object.keys(IMAGE_MIME_TYPES).map((ext) => `.${ext}`) } }],
    });
    return succeed(await imageResult(await handle.getFile(), handle.name));
  } catch (err) {
    if (isAbort(err)) return succeed(null);
    return toFailure(err);
  }
}

export function writeFileText(path: string, content: string, rootPath: string): Promise<IpcResult<void>> {
  return run(async () => {
    const { parent, name } = await resolveParent(rootPath, path);
    const file = await parent.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
  });
}

export function createFile(path: string, rootPath: string): Promise<IpcResult<void>> {
  return run(async () => {
    const { parent, name } = await resolveParent(rootPath, path);
    await assertAbsent(parent, name);
    await parent.getFileHandle(name, { create: true });
  });
}

export function createDirectory(path: string, rootPath: string): Promise<IpcResult<void>> {
  return run(async () => {
    const { parent, name } = await resolveParent(rootPath, path);
    await assertAbsent(parent, name);
    await parent.getDirectoryHandle(name, { create: true });
  });
}

export function deleteEntry(path: string, rootPath: string): Promise<IpcResult<void>> {
  return run(async () => {
    const { parent, name } = await resolveParent(rootPath, path);
    await parent.removeEntry(name, { recursive: true });
  });
}

async function copyEntry(source: WebHandle, parent: WebDirectoryHandle, name: string): Promise<void> {
  if (source.kind === 'file') {
    const target = await parent.getFileHandle(name, { create: true });
    const writable = await target.createWritable();
    await writable.write(await source.getFile());
    await writable.close();
    return;
  }
  const folder = await parent.getDirectoryHandle(name, { create: true });
  for await (const [childName, child] of source.entries()) {
    await copyEntry(child, folder, childName);
  }
}

export function copyEntryTo(srcPath: string, destPath: string, rootPath: string): Promise<IpcResult<void>> {
  return run(async () => {
    if (normalizePath(destPath).startsWith(`${normalizePath(srcPath)}/`)) {
      throw new WebFsFailure('INVALID_PATH', 'A folder cannot be copied into itself.');
    }
    const source = await resolveHandle(rootPath, srcPath);
    const dest = await resolveParent(rootPath, destPath);
    await assertAbsent(dest.parent, dest.name);
    await copyEntry(source, dest.parent, dest.name);
  });
}

export function renameEntry(oldPath: string, newPath: string, rootPath: string): Promise<IpcResult<void>> {
  return run(async () => {
    const source = await resolveHandle(rootPath, oldPath);
    const from = await resolveParent(rootPath, oldPath);
    const to = await resolveParent(rootPath, newPath);
    await assertAbsent(to.parent, to.name);
    if (typeof source.move === 'function') {
      await source.move(to.parent, to.name);
      return;
    }
    // Browsers without handle.move() copy the entry, then remove the original.
    await copyEntry(source, to.parent, to.name);
    await from.parent.removeEntry(from.name, { recursive: true });
  });
}

async function searchDirectory(
  directory: WebDirectoryHandle,
  directoryPath: string,
  needle: string,
  results: FileSearchResult[]
): Promise<void> {
  for await (const [name, handle] of directory.entries()) {
    if (results.length >= SEARCH_RESULT_LIMIT) return;
    const path = joinPath(directoryPath, name);
    if (handle.kind === 'directory') {
      if (!SEARCH_SKIPPED_DIRS.has(name)) await searchDirectory(handle, path, needle, results);
      continue;
    }
    const file = await handle.getFile();
    if (file.size > SEARCH_MAX_FILE_BYTES) continue;
    const text = await file.text();
    if (text.includes('\u0000')) continue; // binary file
    const lines = text.split('\n');
    for (let index = 0; index < lines.length && results.length < SEARCH_RESULT_LIMIT; index += 1) {
      const line = lines[index].replace(/\r$/, '');
      const matchIndex = line.toLowerCase().indexOf(needle);
      if (matchIndex >= 0) {
        results.push({ filePath: path, fileName: name, line: index + 1, preview: line.slice(0, 300), matchIndex });
      }
    }
  }
}

export function searchFiles(query: string, rootPath: string): Promise<IpcResult<FileSearchResult[]>> {
  return run(async () => {
    const needle = query.trim().toLowerCase();
    const results: FileSearchResult[] = [];
    if (!needle) return results;
    await searchDirectory(rootHandle(rootPath), normalizePath(rootPath), needle, results);
    return results;
  });
}
