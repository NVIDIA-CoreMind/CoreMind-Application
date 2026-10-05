export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' | 'copied' | 'ignored';
  staged: boolean;
}

export interface GitStatusResult {
  isRepo: boolean;
  currentBranch?: string;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
  clean: boolean;
}

export interface GitBranchInfo {
  current: string;
  all: string[];
}

export interface GitCommitOptions {
  message: string;
  all?: boolean;
}
