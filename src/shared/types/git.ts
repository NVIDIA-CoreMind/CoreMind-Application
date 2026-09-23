export type GitFileChangeType = 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';

export interface GitFileStatus {
  path: string;
  type: GitFileChangeType;
  staged: boolean;
}

export interface GitStatusResult {
  isRepo: boolean;
  branch: string | null;
  files: GitFileStatus[];
}
