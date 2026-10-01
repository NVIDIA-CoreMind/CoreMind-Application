import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { FileSystemService } from '../src/main/services/fileSystemService';

describe('FileSystemService & Workspace Security', () => {
  let service: FileSystemService;
  let tempDir: string;

  beforeEach(async () => {
    service = new FileSystemService();
    tempDir = await fs.mkdtemp(path.join(process.cwd(), '.coremind-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('validateWorkspacePath', () => {
    it('accepts paths inside workspace root', () => {
      const validSubPath = path.join(tempDir, 'src', 'main.ts');
      expect(service.validateWorkspacePath(validSubPath, tempDir)).toBe(true);
    });

    it('accepts the workspace root itself', () => {
      expect(service.validateWorkspacePath(tempDir, tempDir)).toBe(true);
    });

    it('rejects path traversal attacks attempting to escape workspace', () => {
      const attackPath1 = path.join(tempDir, '..', 'secret.txt');
      const attackPath2 = path.join(tempDir, 'src', '..', '..', 'etc', 'passwd');
      expect(service.validateWorkspacePath(attackPath1, tempDir)).toBe(false);
      expect(service.validateWorkspacePath(attackPath2, tempDir)).toBe(false);
    });

    it('rejects arbitrary system directories outside workspace', () => {
      expect(service.validateWorkspacePath('/System/Library', tempDir)).toBe(false);
      expect(service.validateWorkspacePath('/etc/passwd', tempDir)).toBe(false);
    });

    it('rejects paths through symlinks that point outside the workspace', async () => {
      const outsideDir = await fs.mkdtemp(path.join(process.cwd(), '.coremind-outside-'));
      const linkPath = path.join(tempDir, 'outside-link');
      try {
        await fs.symlink(outsideDir, linkPath);
        expect(service.validateWorkspacePath(path.join(linkPath, 'secret.txt'), tempDir)).toBe(false);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });
  });

  describe('File CRUD Operations within Workspace', () => {
    it('creates and reads a file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const createRes = await service.createFile(filePath, tempDir);
      expect(createRes.success).toBe(true);

      const writeRes = await service.writeFile(filePath, 'Hello CoreMind', tempDir);
      expect(writeRes.success).toBe(true);

      const readRes = await service.readFile(filePath, tempDir);
      expect(readRes.success).toBe(true);
      if (readRes.success) {
        expect(readRes.data).toBe('Hello CoreMind');
      }
    });

    it('creates a directory and lists children', async () => {
      const subDir = path.join(tempDir, 'subfolder');
      const createDirRes = await service.createDirectory(subDir, tempDir);
      expect(createDirRes.success).toBe(true);

      const nestedFile = path.join(subDir, 'nested.json');
      await service.createFile(nestedFile, tempDir);
      await service.writeFile(nestedFile, '{"key": "value"}', tempDir);

      const listRes = await service.readDirectory(subDir, tempDir);
      expect(listRes.success).toBe(true);
      if (listRes.success) {
        expect(listRes.data.length).toBe(1);
        expect(listRes.data[0].name).toBe('nested.json');
        expect(listRes.data[0].isDirectory).toBe(false);
      }
    });

    it('renames a file safely', async () => {
      const oldPath = path.join(tempDir, 'old.ts');
      const newPath = path.join(tempDir, 'new.ts');

      await service.createFile(oldPath, tempDir);
      const renameRes = await service.rename(oldPath, newPath, tempDir);
      expect(renameRes.success).toBe(true);

      const readNew = await service.readFile(newPath, tempDir);
      expect(readNew.success).toBe(true);

      const readOld = await service.readFile(oldPath, tempDir);
      expect(readOld.success).toBe(false);
    });

    it('deletes a file safely', async () => {
      const filePath = path.join(tempDir, 'delete-me.md');
      await service.createFile(filePath, tempDir);

      const deleteRes = await service.delete(filePath, tempDir);
      expect(deleteRes.success).toBe(true);

      const readRes = await service.readFile(filePath, tempDir);
      expect(readRes.success).toBe(false);
    });

    it('prevents deleting the workspace root folder', async () => {
      const deleteRes = await service.delete(tempDir, tempDir);
      expect(deleteRes.success).toBe(false);
      if (!deleteRes.success) {
        expect(deleteRes.error.code).toBe('CANNOT_DELETE_ROOT');
      }
    });

    it('prevents deleting or renaming normalized equivalents of the workspace root', async () => {
      const equivalentRoot = path.join(tempDir, '.');
      const deleteRes = await service.delete(equivalentRoot, tempDir);
      const renameRes = await service.rename(equivalentRoot, `${tempDir}-renamed`, tempDir);

      expect(deleteRes.success).toBe(false);
      expect(renameRes.success).toBe(false);
    });
  });

  describe('Search functionality', () => {
    it('finds query matches across workspace files', async () => {
      const file1 = path.join(tempDir, 'app.ts');
      const file2 = path.join(tempDir, 'readme.md');

      await service.createFile(file1, tempDir);
      await service.writeFile(file1, 'function authenticateUser() { return true; }', tempDir);

      await service.createFile(file2, tempDir);
      await service.writeFile(file2, '# Welcome\nAuthentication guide here', tempDir);

      const searchRes = await service.searchFiles('authenticate', tempDir);
      expect(searchRes.success).toBe(true);
      if (searchRes.success) {
        expect(searchRes.data.length).toBeGreaterThanOrEqual(1);
        expect(searchRes.data.some((r) => r.fileName === 'app.ts')).toBe(true);
      }
    });

    it('does not follow symlinks during search', async () => {
      const outsideDir = await fs.mkdtemp(path.join(process.cwd(), '.coremind-outside-'));
      const outsideFile = path.join(outsideDir, 'secret.txt');
      const linkPath = path.join(tempDir, 'outside-link');
      try {
        await fs.writeFile(outsideFile, 'searchable-secret');
        await fs.symlink(outsideFile, linkPath);
        const searchRes = await service.searchFiles('searchable-secret', tempDir);
        expect(searchRes.success).toBe(true);
        if (searchRes.success) expect(searchRes.data).toHaveLength(0);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });
  });
});
