import { coremindClient } from './client';
import { ChangeActionResponse, ChangeSet } from './types';

export class ChangesService {
  /**
   * Retrieves full unified diff ChangeSet for review.
   */
  public async getChanges(changeId: string): Promise<ChangeSet> {
    return coremindClient.get<ChangeSet>(`/v1/changes/${encodeURIComponent(changeId)}`);
  }

  /**
   * Atomically accepts all file modifications in the ChangeSet.
   */
  public async acceptChanges(changeId: string): Promise<ChangeActionResponse> {
    return coremindClient.post<ChangeActionResponse>(`/v1/changes/${encodeURIComponent(changeId)}/accept`);
  }

  /**
   * Atomically rejects all file modifications and rolls back created/modified files.
   */
  public async rejectChanges(changeId: string): Promise<ChangeActionResponse> {
    return coremindClient.post<ChangeActionResponse>(`/v1/changes/${encodeURIComponent(changeId)}/reject`);
  }

  /**
   * Accepts a specific file in the ChangeSet.
   */
  public async acceptFile(changeId: string, filePath: string): Promise<ChangeActionResponse> {
    return coremindClient.post<ChangeActionResponse>(
      `/v1/changes/${encodeURIComponent(changeId)}/accept_file`,
      { file_path: filePath }
    );
  }

  /**
   * Rejects and reverts a single file in the ChangeSet.
   */
  public async rejectFile(changeId: string, filePath: string): Promise<ChangeActionResponse> {
    return coremindClient.post<ChangeActionResponse>(
      `/v1/changes/${encodeURIComponent(changeId)}/reject_file`,
      { file_path: filePath }
    );
  }
}

export const changesService = new ChangesService();
