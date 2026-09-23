export interface FileNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  size?: number;
  extension?: string;
  lastModified?: number;
}

export interface FileStat {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
}

export interface FileSearchResult {
  filePath: string;
  fileName: string;
  line: number;
  preview: string;
  matchIndex: number;
}
