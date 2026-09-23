import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { FileNode, FileSearchResult } from '../../shared/types/file';
import { IpcResult } from '../../shared/types/ipc';
import { logger } from './logger';

export class FileSystemService {
  /**
   * Validate that targetPath resides inside rootPath and does not escape via traversal.
   */
  public validateWorkspacePath(targetPath: string, rootPath: string): boolean {
    if (!rootPath || !targetPath) return false;
    const resolvedRoot = path.normalize(path.resolve(rootPath));
    const resolvedTarget = path.normalize(path.resolve(targetPath));

    // Ensure target path starts with root path
    if (resolvedTarget === resolvedRoot) {
      return true;
    }

    const relative = path.relative(resolvedRoot, resolvedTarget);
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      return true;
    }

    // Fallback for macOS symlinks (e.g. /var vs /private/var, /tmp vs /private/tmp)
    try {
      const realRoot = fsSync.realpathSync(resolvedRoot);
      const realTarget = fsSync.realpathSync(resolvedTarget);
      if (realRoot === realTarget) return true;
      const realRel = path.relative(realRoot, realTarget);
      return !realRel.startsWith('..') && !path.isAbsolute(realRel);
    } catch {
      return false;
    }
  }

  /**
   * Read directory children for a given path.
   */
  public async readDirectory(dirPath: string, rootPath: string): Promise<IpcResult<FileNode[]>> {
    try {
      if (!this.validateWorkspacePath(dirPath, rootPath)) {
        logger.warn('Access denied reading directory outside workspace', { dirPath, rootPath });
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Cannot read directory outside of the active workspace.',
          },
        };
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        // Skip hidden system/git metadata files
        if (entry.name === '.git' || entry.name === '.DS_Store') {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        let isDirectory = entry.isDirectory();
        let size: number | undefined;
        let lastModified: number | undefined;

        try {
          const stat = await fs.stat(fullPath);
          if (entry.isSymbolicLink()) {
            isDirectory = stat.isDirectory();
          }
          size = stat.size;
          lastModified = stat.mtimeMs;
        } catch {
          // Ignore stats errors on inaccessible items
        }

        const node: FileNode = {
          id: fullPath,
          name: entry.name,
          path: fullPath,
          isDirectory,
          size,
          lastModified,
          extension: isDirectory ? undefined : path.extname(entry.name).toLowerCase(),
        };

        nodes.push(node);
      }

      // Sort: folders first alphabetically, then files alphabetically
      nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });

      return { success: true, data: nodes };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Error reading directory', { dirPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'DIRECTORY_READ_FAILED',
          message: error.message || 'Failed to read directory.',
        },
      };
    }
  }

  /**
   * Read file content.
   */
  public async readFile(filePath: string, rootPath: string): Promise<IpcResult<string>> {
    try {
      if (!this.validateWorkspacePath(filePath, rootPath)) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Cannot read file outside of workspace.',
          },
        };
      }

      const stat = await fs.stat(filePath);
      // Safeguard against opening giant binary files (over 10MB) directly in editor
      if (stat.size > 10 * 1024 * 1024) {
        return {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds maximum editor limit (10MB).',
          },
        };
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Error reading file', { filePath, message: error.message });
      return {
        success: false,
        error: {
          code: 'FILE_READ_FAILED',
          message: error.message || 'Failed to read file.',
        },
      };
    }
  }

  /**
   * Write file content.
   */
  public async writeFile(filePath: string, content: string, rootPath: string): Promise<IpcResult<void>> {
    try {
      if (!this.validateWorkspacePath(filePath, rootPath)) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Cannot write file outside of workspace.',
          },
        };
      }

      await fs.writeFile(filePath, content, 'utf-8');
      logger.info('File saved successfully', { filePath });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Error writing file', { filePath, message: error.message });
      return {
        success: false,
        error: {
          code: 'FILE_WRITE_FAILED',
          message: error.message || 'Failed to save file.',
        },
      };
    }
  }

  /**
   * Create a new file.
   */
  public async createFile(filePath: string, rootPath: string): Promise<IpcResult<void>> {
    try {
      if (!this.validateWorkspacePath(filePath, rootPath)) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Cannot create file outside of workspace.',
          },
        };
      }

      // Check if file already exists
      try {
        await fs.access(filePath);
        return {
          success: false,
          error: {
            code: 'FILE_EXISTS',
            message: 'A file with this name already exists.',
          },
        };
      } catch {
        // Doesn't exist, proceed
      }

      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, '', 'utf-8');
      logger.info('File created successfully', { filePath });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Error creating file', { filePath, message: error.message });
      return {
        success: false,
        error: {
          code: 'FILE_CREATE_FAILED',
          message: error.message || 'Failed to create file.',
        },
      };
    }
  }

  /**
   * Create a new directory.
   */
  public async createDirectory(dirPath: string, rootPath: string): Promise<IpcResult<void>> {
    try {
      if (!this.validateWorkspacePath(dirPath, rootPath)) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Cannot create directory outside of workspace.',
          },
        };
      }

      await fs.mkdir(dirPath, { recursive: true });
      logger.info('Directory created successfully', { dirPath });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Error creating directory', { dirPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'DIRECTORY_CREATE_FAILED',
          message: error.message || 'Failed to create directory.',
        },
      };
    }
  }

  /**
   * Rename file or folder.
   */
  public async rename(oldPath: string, newPath: string, rootPath: string): Promise<IpcResult<void>> {
    try {
      if (
        !this.validateWorkspacePath(oldPath, rootPath) ||
        !this.validateWorkspacePath(newPath, rootPath)
      ) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Path outside workspace is not allowed.',
          },
        };
      }

      if (oldPath === rootPath) {
        return {
          success: false,
          error: {
            code: 'CANNOT_RENAME_ROOT',
            message: 'Cannot rename the workspace root folder.',
          },
        };
      }

      await fs.rename(oldPath, newPath);
      logger.info('Renamed successfully', { oldPath, newPath });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Error renaming path', { oldPath, newPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'RENAME_FAILED',
          message: error.message || 'Failed to rename.',
        },
      };
    }
  }

  /**
   * Delete file or directory.
   */
  public async delete(targetPath: string, rootPath: string): Promise<IpcResult<void>> {
    try {
      if (!this.validateWorkspacePath(targetPath, rootPath)) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Cannot delete path outside workspace.',
          },
        };
      }

      if (targetPath === rootPath) {
        return {
          success: false,
          error: {
            code: 'CANNOT_DELETE_ROOT',
            message: 'Cannot delete the workspace root directory.',
          },
        };
      }

      await fs.rm(targetPath, { recursive: true, force: true });
      logger.info('Deleted successfully', { targetPath });
      return { success: true, data: undefined };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Error deleting path', { targetPath, message: error.message });
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error.message || 'Failed to delete.',
        },
      };
    }
  }

  /**
   * Search files for text query.
   */
  public async searchFiles(
    query: string,
    rootPath: string,
    maxResults = 50
  ): Promise<IpcResult<FileSearchResult[]>> {
    try {
      if (!query || query.trim() === '') {
        return { success: true, data: [] };
      }

      const results: FileSearchResult[] = [];
      const ignoredFolders = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'release', '.next', '.cache']);
      const lowerQuery = query.toLowerCase();

      const searchDir = async (dir: string): Promise<void> => {
        if (results.length >= maxResults) return;
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (results.length >= maxResults) return;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!ignoredFolders.has(entry.name)) {
              await searchDir(fullPath);
            }
          } else {
            // Check file size before reading
            try {
              const stat = await fs.stat(fullPath);
              if (stat.size > 1024 * 1024 * 2) continue; // Skip files > 2MB

              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n');

              for (let i = 0; i < lines.length; i++) {
                const lineText = lines[i];
                const matchIndex = lineText.toLowerCase().indexOf(lowerQuery);
                if (matchIndex !== -1) {
                  results.push({
                    filePath: fullPath,
                    fileName: entry.name,
                    line: i + 1,
                    preview: lineText.trim(),
                    matchIndex,
                  });
                  if (results.length >= maxResults) break;
                }
              }
            } catch {
              // Skip unreadable files (binary etc.)
            }
          }
        }
      };

      await searchDir(rootPath);
      return { success: true, data: results };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error.message || 'Failed to perform project search.',
        },
      };
    }
  }
}

export const fileSystemService = new FileSystemService();
