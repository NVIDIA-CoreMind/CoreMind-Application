import { coremindClient } from './client';
import {
  ProjectMetadata,
  ProjectSearchResponse,
  ProjectTreeResponse,
  RepoMapResponse,
} from './types';

export class ProjectService {
  /**
   * Registers a project folder with the backend, detecting language, framework, and configs.
   */
  public async openProject(projectPath: string): Promise<ProjectMetadata> {
    return coremindClient.post<ProjectMetadata>('/v1/project/open', { path: projectPath });
  }

  /**
   * Retrieves the project file tree from the backend.
   */
  public async getProjectTree(projectPath: string): Promise<ProjectTreeResponse> {
    const query = `?path=${encodeURIComponent(projectPath)}`;
    return coremindClient.get<ProjectTreeResponse>(`/v1/project/tree${query}`);
  }

  /**
   * Performs hybrid text, regex, and AST symbol search across project files.
   */
  public async searchProject(params: {
    path: string;
    query: string;
    file_pattern?: string;
    is_regex?: boolean;
    max_results?: number;
  }): Promise<ProjectSearchResponse> {
    const urlParams = new URLSearchParams();
    urlParams.append('path', params.path);
    urlParams.append('query', params.query);
    if (params.file_pattern) urlParams.append('file_pattern', params.file_pattern);
    if (params.is_regex !== undefined) urlParams.append('is_regex', String(params.is_regex));
    if (params.max_results !== undefined) urlParams.append('max_results', String(params.max_results));

    return coremindClient.get<ProjectSearchResponse>(`/v1/project/search?${urlParams.toString()}`);
  }

  /**
   * Generates AST repository symbols and signatures map.
   */
  public async getRepoMap(projectPath: string): Promise<RepoMapResponse> {
    const query = `?path=${encodeURIComponent(projectPath)}`;
    return coremindClient.get<RepoMapResponse>(`/v1/project/repo_map${query}`);
  }
}

export const projectService = new ProjectService();
