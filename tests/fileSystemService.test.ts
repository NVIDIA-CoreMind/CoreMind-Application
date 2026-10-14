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
        try {
          await fs.symlink(outsideDir, linkPath);
        } catch (e: any) {
          if (e.code === 'EPERM') return;
          throw e;
        }
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

    it('copies a file safely', async () => {
      const srcPath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'dest.txt');
      await service.createFile(srcPath, tempDir);
      await service.writeFile(srcPath, 'Content to copy', tempDir);

      const copyRes = await service.copy(srcPath, destPath, tempDir);
      expect(copyRes.success).toBe(true);

      const readDest = await service.readFile(destPath, tempDir);
      expect(readDest.success).toBe(true);
      if (readDest.success) {
        expect(readDest.data).toBe('Content to copy');
      }

      // Source should still exist
      const readSrc = await service.readFile(srcPath, tempDir);
      expect(readSrc.success).toBe(true);
    });

    it('prevents deleting or renaming normalized equivalents of the workspace root', async () => {
      const equivalentRoot = path.join(tempDir, '.');
      const deleteRes = await service.delete(equivalentRoot, tempDir);
      const renameRes = await service.rename(equivalentRoot, `${tempDir}-renamed`, tempDir);

      expect(deleteRes.success).toBe(false);
      expect(renameRes.success).toBe(false);
    });
  });

  describe('Image Reading Operations (PNG, JPG, JPEG)', () => {
    // 1x1 transparent PNG buffer
    const mockPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    // Minimal JPEG header buffer
    const mockJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);

    it('reads a PNG image file as data URL via readFile and readImage', async () => {
      const pngPath = path.join(tempDir, 'sample.png');
      await fs.writeFile(pngPath, mockPngBuffer);

      // 1. Test readFile returns base64 data URL
      const readRes = await service.readFile(pngPath, tempDir);
      expect(readRes.success).toBe(true);
      if (readRes.success) {
        expect(readRes.data).toContain('data:image/png;base64,');
      }

      // 2. Test readImage returns structured metadata
      const imgRes = await service.readImage(pngPath, tempDir);
      expect(imgRes.success).toBe(true);
      if (imgRes.success) {
        expect(imgRes.data.mimeType).toBe('image/png');
        expect(imgRes.data.name).toBe('sample.png');
        expect(imgRes.data.size).toBe(mockPngBuffer.length);
        expect(imgRes.data.dataUrl).toContain('data:image/png;base64,');
        expect(imgRes.data.base64).toBe(mockPngBuffer.toString('base64'));
      }
    });

    it('reads JPG and JPEG image files correctly', async () => {
      const jpgPath = path.join(tempDir, 'photo.jpg');
      const jpegPath = path.join(tempDir, 'photo.jpeg');
      await fs.writeFile(jpgPath, mockJpgBuffer);
      await fs.writeFile(jpegPath, mockJpgBuffer);

      const jpgRes = await service.readImage(jpgPath, tempDir);
      expect(jpgRes.success).toBe(true);
      if (jpgRes.success) {
        expect(jpgRes.data.mimeType).toBe('image/jpeg');
        expect(jpgRes.data.dataUrl).toContain('data:image/jpeg;base64,');
      }

      const jpegRes = await service.readImage(jpegPath, tempDir);
      expect(jpegRes.success).toBe(true);
      if (jpegRes.success) {
        expect(jpegRes.data.mimeType).toBe('image/jpeg');
        expect(jpegRes.data.dataUrl).toContain('data:image/jpeg;base64,');
      }
    });

    it('rejects readImage for non-image files', async () => {
      const txtPath = path.join(tempDir, 'not-an-image.txt');
      await fs.writeFile(txtPath, 'text content');

      const res = await service.readImage(txtPath, tempDir);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('INVALID_IMAGE_FORMAT');
      }
    });

    it('rejects readImage for paths outside the workspace', async () => {
      const res = await service.readImage('/etc/unauthorized.png', tempDir);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.code).toBe('ACCESS_DENIED');
      }
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
        try {
          await fs.symlink(outsideFile, linkPath);
        } catch (e: any) {
          if (e.code === 'EPERM') return;
          throw e;
        }
        const searchRes = await service.searchFiles('searchable-secret', tempDir);
        expect(searchRes.success).toBe(true);
        if (searchRes.success) expect(searchRes.data).toHaveLength(0);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });
  });
});
