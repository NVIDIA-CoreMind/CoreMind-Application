import { afterEach, describe, expect, it, vi } from 'vitest';
import * as webFiles from '../src/renderer/services/webFileSystem';
import type { WebDirectoryHandle, WebFileHandle } from '../src/renderer/services/webFileSystem';
import type { IpcResult } from '../src/shared/types/ipc';

// In-memory stand-ins for the File System Access handles. They implement only what webFileSystem uses.
function domError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

class FakeFile implements WebFileHandle {
  readonly kind = 'file' as const;
  content: string;

  constructor(readonly name: string, content: string) {
    this.content = content;
  }

  async getFile(): Promise<File> {
    return new File([this.content], this.name, { type: 'text/plain' });
  }

  async createWritable() {
    let pending = '';
    return {
      write: async (data: string | Blob) => {
        pending = typeof data === 'string' ? data : await data.text();
      },
      close: async () => {
        this.content = pending;
      },
    };
  }
}

class FakeDirectory implements WebDirectoryHandle {
  readonly kind = 'directory' as const;
  readonly children = new Map<string, FakeFile | FakeDirectory>();

  constructor(readonly name: string) {}

  async *entries(): AsyncGenerator<[string, WebFileHandle | WebDirectoryHandle]> {
    for (const entry of this.children) yield entry;
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FakeFile> {
    const existing = this.children.get(name);
    if (existing?.kind === 'directory') throw domError('TypeMismatchError');
    if (existing) return existing;
    if (!options?.create) throw domError('NotFoundError');
    const file = new FakeFile(name, '');
    this.children.set(name, file);
    return file;
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FakeDirectory> {
    const existing = this.children.get(name);
    if (existing?.kind === 'file') throw domError('TypeMismatchError');
    if (existing) return existing;
    if (!options?.create) throw domError('NotFoundError');
    const folder = new FakeDirectory(name);
    this.children.set(name, folder);
    return folder;
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.children.delete(name)) throw domError('NotFoundError');
  }
}

function sampleFolder(name: string): FakeDirectory {
  const root = new FakeDirectory(name);
  root.children.set('README.md', new FakeFile('README.md', '# Demo\nhello world'));
  const src = new FakeDirectory('src');
  src.children.set('main.dart', new FakeFile('main.dart', "void main() {\n  print('hello');\n}"));
  root.children.set('src', src);
  const deps = new FakeDirectory('node_modules');
  deps.children.set('pkg.js', new FakeFile('pkg.js', 'hello from a dependency'));
  root.children.set('node_modules', deps);
  return root;
}

function unwrap<T>(result: IpcResult<T>): T {
  if (!result.success) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function codeOf(result: IpcResult<unknown>): string | undefined {
  return result.success ? undefined : result.error.code;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser workspace files', () => {
  it('lists folders before files, with full paths', async () => {
    const root = webFiles.registerFolder(sampleFolder('list-app'));
    const nodes = unwrap(await webFiles.readDirectory(root, root));
    expect(nodes.map((node) => [node.name, node.isDirectory, node.path])).toEqual([
      ['node_modules', true, `${root}/node_modules`],
      ['src', true, `${root}/src`],
      ['README.md', false, `${root}/README.md`],
    ]);
  });

  it('reads and writes text inside the open folder', async () => {
    const root = webFiles.registerFolder(sampleFolder('rw-app'));
    expect(unwrap(await webFiles.readFileText(`${root}/README.md`, root))).toBe('# Demo\nhello world');

    unwrap(await webFiles.writeFileText(`${root}/src/new.ts`, 'export {};', root));
    expect(unwrap(await webFiles.readFileText(`${root}/src/new.ts`, root))).toBe('export {};');
  });

  it('creates, renames, copies, and deletes entries', async () => {
    const root = webFiles.registerFolder(sampleFolder('ops-app'));

    unwrap(await webFiles.createFile(`${root}/notes.txt`, root));
    expect(codeOf(await webFiles.createFile(`${root}/notes.txt`, root))).toBe('ALREADY_EXISTS');
    unwrap(await webFiles.createDirectory(`${root}/docs`, root));

    // The fake has no handle.move(), so rename takes the copy-then-remove path.
    unwrap(await webFiles.renameEntry(`${root}/notes.txt`, `${root}/docs/notes.txt`, root));
    expect(unwrap(await webFiles.readFileText(`${root}/docs/notes.txt`, root))).toBe('');
    expect(codeOf(await webFiles.readFileText(`${root}/notes.txt`, root))).toBe('NOT_FOUND');

    unwrap(await webFiles.copyEntryTo(`${root}/README.md`, `${root}/docs/README.md`, root));
    expect(unwrap(await webFiles.readFileText(`${root}/docs/README.md`, root))).toBe('# Demo\nhello world');
    expect(codeOf(await webFiles.copyEntryTo(`${root}/docs`, `${root}/docs/inner`, root))).toBe('INVALID_PATH');

    unwrap(await webFiles.deleteEntry(`${root}/docs`, root));
    const names = unwrap(await webFiles.readDirectory(root, root)).map((node) => node.name);
    expect(names).not.toContain('docs');
    expect(codeOf(await webFiles.deleteEntry(root, root))).toBe('INVALID_PATH');
  });

  it('refuses paths outside the open folder, including ".." segments', async () => {
    const root = webFiles.registerFolder(sampleFolder('outside-app'));
    expect(codeOf(await webFiles.readFileText('/web-workspace/other/x.txt', root))).toBe('OUTSIDE_WORKSPACE');
    expect(codeOf(await webFiles.readFileText(`${root}/../secret.txt`, root))).toBe('OUTSIDE_WORKSPACE');
  });

  it('searches text files case-insensitively and skips dependency folders', async () => {
    const root = webFiles.registerFolder(sampleFolder('search-app'));
    const matches = unwrap(await webFiles.searchFiles('HELLO', root));
    expect(matches.map((match) => [match.fileName, match.line])).toEqual([
      ['README.md', 2],
      ['main.dart', 2],
    ]);
    expect(matches.map((match) => match.matchIndex)).toEqual([0, 9]);
  });

  it('reports a folder that is no longer open', async () => {
    const result = await webFiles.readDirectory('/web-workspace/never-opened', '/web-workspace/never-opened');
    expect(codeOf(result)).toBe('NOT_OPEN');
  });

  it('opens a folder through the browser picker and treats cancel as no selection', async () => {
    vi.stubGlobal('showDirectoryPicker', async () => sampleFolder('picked-app'));
    const picked = unwrap(await webFiles.pickFolder()) as string;
    expect(picked).toBe('/web-workspace/picked-app');
    expect(unwrap(webFiles.restoreFolder(picked))).toBe(picked);
    expect(unwrap(webFiles.restoreFolder('/web-workspace/missing'))).toBeNull();

    vi.stubGlobal('showDirectoryPicker', async () => {
      throw domError('AbortError');
    });
    expect(unwrap(await webFiles.pickFolder())).toBeNull();
  });

  it('explains when the browser has no folder picker', async () => {
    vi.stubGlobal('showDirectoryPicker', undefined);
    expect(codeOf(await webFiles.pickFolder())).toBe('UNSUPPORTED');
  });
});
