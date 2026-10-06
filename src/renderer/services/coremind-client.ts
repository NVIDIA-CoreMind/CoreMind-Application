import { AuthTokens, User } from '../types/coremind';

export class CoreMindClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'http://localhost:43110') {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  // --- Auth ---
  async getGoogleAuthUrl(redirectUri?: string) {
    const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
    return this.request<{ auth_url: string; client_id: string; state: string }>(`/v1/auth/google/url${query}`);
  }

  async loginWithGoogleToken(idToken: string): Promise<AuthTokens> {
    return this.request<AuthTokens>('/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/v1/auth/me');
  }

  // --- AI Capabilities ---
  async getAiModels() {
    return this.request<{ provider: string; models: string[] }>('/v1/ai/models');
  }

  async chatWithTools(query: string, projectPath: string, history: any[] = []) {
    return this.request<any>('/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ query, project_path: projectPath, history }),
    });
  }

  async createPlan(objective: string, projectPath: string, context?: string) {
    return this.request<{ status: string; plan: string }>('/v1/ai/plan', {
      method: 'POST',
      body: JSON.stringify({ objective, project_path: projectPath, context }),
    });
  }

  async generateCode(task: string, projectPath: string, plan?: string) {
    return this.request<{ status: string; code: string }>('/v1/ai/code', {
      method: 'POST',
      body: JSON.stringify({ task, plan, project_path: projectPath }),
    });
  }

  // --- Agent ---
  async startAgent(task: string, projectPath: string, sessionId?: string) {
    return this.request<{ agent_id: string; session_id: string; status: string }>('/v1/agent/run', {
      method: 'POST',
      body: JSON.stringify({ task, project_path: projectPath, session_id: sessionId }),
    });
  }

  async stopAgent(agentId: string) {
    return this.request<{ status: string; agent_id: string }>('/v1/agent/stop', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId }),
    });
  }

  async stopAllAgents() {
    return this.request<{ status: string; agents_stopped: number }>('/v1/agent/stop_all', { method: 'POST' });
  }

  async getTasks() {
    return this.request<any[]>('/v1/agent/tasks');
  }

  async getPendingQuestions(agentId?: string) {
    const query = agentId ? `?agent_id=${agentId}` : '';
    return this.request<any[]>(`/v1/agent/questions${query}`);
  }

  async getAuditLogs(limit: number = 100) {
    return this.request<any[]>(`/v1/agent/audit_logs?limit=${limit}`);
  }

  async answerQuestion(questionId: string, answer: string) {
    return this.request<{ status: string }>('/v1/agent/question', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, answer }),
    });
  }

  async approveAction(agentId: string, approvalId: string) {
    return this.request<{ status: string }>('/v1/agent/approve', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, approval_id: approvalId }),
    });
  }

  async denyAction(agentId: string, approvalId: string, reason?: string) {
    return this.request<{ status: string }>('/v1/agent/deny', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, approval_id: approvalId, reason }),
    });
  }

  // --- Project ---
  async openProject(projectPath: string) {
    return this.request<any>('/v1/project/open', {
      method: 'POST',
      body: JSON.stringify({ path: projectPath }),
    });
  }

  // --- Change Review ---
  async getChanges(changeId: string) {
    return this.request<any>(`/v1/changes/${changeId}`);
  }

  async acceptChanges(changeId: string) {
    return this.request<any>(`/v1/changes/${changeId}/accept`, { method: 'POST' });
  }

  async rejectChanges(changeId: string) {
    return this.request<any>(`/v1/changes/${changeId}/reject`, { method: 'POST' });
  }
}

export const coremindClient = new CoreMindClient();
