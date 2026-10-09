import { AuthTokens, User } from '../types/coremind';

export class CoreMindClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'http://127.0.0.1:43110') {
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

  async streamChat(
    query: string,
    projectPath: string = '.',
    history: any[] = [],
    onToken: (token: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const url = `${this.baseUrl}/v1/ai/chat/stream`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, project_path: projectPath, history }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Streaming failed (${response.status}): ${errText || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataPayload = trimmed.replace(/^data:\s*/, '');
          if (dataPayload === '[DONE]') {
            return accumulated;
          }

          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.type === 'token' && typeof parsed.token === 'string') {
              accumulated += parsed.token;
              onToken(parsed.token);
            } else if (parsed.content && typeof parsed.content === 'string') {
              accumulated += parsed.content;
              onToken(parsed.content);
            } else if (parsed.type === 'done') {
              return accumulated;
            }
          } catch {
            if (dataPayload !== '[DONE]') {
              accumulated += dataPayload;
              onToken(dataPayload);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulated;
  }
}

export const coremindClient = new CoreMindClient();

