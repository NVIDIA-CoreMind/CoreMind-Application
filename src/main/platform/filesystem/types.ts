export interface IPlatformFileSystem {
  validateWorkspacePath(targetPath: string, rootPath: string): boolean;
  normalizePath(filePath: string): string;
  isWithinRoot(targetPath: string, rootPath: string): boolean;
  resolveNearestExistingPath(targetPath: string): string | null;
  getHomeDir(): string;
  isPathEqual(pathA: string, pathB: string): boolean;
}
