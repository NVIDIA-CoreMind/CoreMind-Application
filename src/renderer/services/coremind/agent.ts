import { coremindClient } from './client';
import {
  AgentRunRequest,
  AgentRunResponse,
  AgentStatusResponse,
} from './types';

export class AgentService {
  /**
   * Starts a new autonomous AI agent task on a project.
   */
  public async run(task: string, projectPath: string, sessionId?: string): Promise<AgentRunResponse> {
    const payload: AgentRunRequest = {
      task,
      project_path: projectPath,
      session_id: sessionId,
    };
    return coremindClient.post<AgentRunResponse>('/v1/agent/run', payload);
  }

  /**
   * Fetches latest agent execution status and task graph.
   */
  public async getStatus(agentId: string): Promise<AgentStatusResponse> {
    return coremindClient.get<AgentStatusResponse>(`/v1/agent/${encodeURIComponent(agentId)}`);
  }

  /**
   * Stops an active agent execution.
   */
  public async stop(agentId: string): Promise<{ status: string; agent_id: string }> {
    return coremindClient.post<{ status: string; agent_id: string }>('/v1/agent/stop', {
      agent_id: agentId,
    });
  }

  /**
   * Cancels an active agent execution (alias for stop).
   */
  public async cancel(agentId: string): Promise<{ status: string; agent_id: string }> {
    return coremindClient.post<{ status: string; agent_id: string }>('/v1/agent/cancel', {
      agent_id: agentId,
    });
  }

  /**
   * Submits user clarification answer for a pending agent question.
   */
  public async answerQuestion(questionId: string, answer: string): Promise<{ status: string }> {
    return coremindClient.post<{ status: string }>('/v1/agent/question', {
      question_id: questionId,
      answer,
    });
  }

  /**
   * Confirms human approval for a high-risk tool action.
   */
  public async approveAction(approvalId: string, agentId?: string): Promise<{ status: string }> {
    return coremindClient.post<{ status: string }>('/v1/agent/approve', {
      approval_id: approvalId,
      agent_id: agentId,
    });
  }

  /**
   * Denies human approval for a high-risk tool action.
   */
  public async denyAction(approvalId: string, agentId?: string, reason?: string): Promise<{ status: string }> {
    return coremindClient.post<{ status: string }>('/v1/agent/deny', {
      approval_id: approvalId,
      agent_id: agentId,
      reason,
    });
  }
}

export const agentService = new AgentService();
