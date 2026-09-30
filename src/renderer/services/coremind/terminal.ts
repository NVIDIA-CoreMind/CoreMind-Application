import { coremindClient } from './client';
import {
  BackgroundProcess,
  ProcessLogsResponse,
  ProcessStatusResponse,
  TerminalExecuteResponse,
  TerminalSession,
} from './types';

export class TerminalService {
  /**
   * Spawns a stateful persistent terminal session maintaining environment and cwd.
   */
  public async createSession(projectPath: string, sessionId?: string): Promise<TerminalSession> {
    return coremindClient.post<TerminalSession>('/v1/terminal/session', {
      project_path: projectPath,
      session_id: sessionId,
    });
  }

  /**
   * Executes shell commands in the persistent session.
   */
  public async executeInSession(
    sessionId: string,
    command: string,
    timeoutSeconds: number = 60
  ): Promise<TerminalExecuteResponse> {
    return coremindClient.post<TerminalExecuteResponse>(
      `/v1/terminal/session/${encodeURIComponent(sessionId)}/execute`,
      {
        command,
        timeout_seconds: timeoutSeconds,
      }
    );
  }

  /**
   * Lists all active terminal sessions.
   */
  public async listSessions(): Promise<TerminalSession[]> {
    const res = await coremindClient.get<{ sessions?: TerminalSession[] } | TerminalSession[]>('/v1/terminal/sessions');
    if (Array.isArray(res)) return res;
    return res.sessions || [];
  }

  /**
   * Destroys an active terminal session.
   */
  public async deleteSession(sessionId: string): Promise<{ status: string; session_id: string }> {
    return coremindClient.delete<{ status: string; session_id: string }>(
      `/v1/terminal/session/${encodeURIComponent(sessionId)}`
    );
  }

  /**
   * Spawns a long-running background process (e.g. dev server).
   */
  public async startProcess(command: string, cwd: string): Promise<BackgroundProcess> {
    return coremindClient.post<BackgroundProcess>('/v1/terminal/process/start', {
      command,
      cwd,
    });
  }

  /**
   * Queries status of a background process.
   */
  public async getProcessStatus(processId: string): Promise<ProcessStatusResponse> {
    return coremindClient.get<ProcessStatusResponse>(
      `/v1/terminal/process/${encodeURIComponent(processId)}/status`
    );
  }

  /**
   * Tails logs of a background process.
   */
  public async getProcessLogs(processId: string, tail: number = 100): Promise<ProcessLogsResponse> {
    return coremindClient.get<ProcessLogsResponse>(
      `/v1/terminal/process/${encodeURIComponent(processId)}/logs?tail=${tail}`
    );
  }

  /**
   * Terminates a running background process.
   */
  public async stopProcess(processId: string): Promise<{ status: string; process_id: string }> {
    return coremindClient.post<{ status: string; process_id: string }>(
      `/v1/terminal/process/${encodeURIComponent(processId)}/stop`
    );
  }
}

export const terminalService = new TerminalService();
