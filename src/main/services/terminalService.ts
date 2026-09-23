import { logger } from './logger';

export interface TerminalSession {
  id: string;
  pid?: number;
}

export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();

  createSession(id: string): TerminalSession {
    logger.info('Creating terminal session placeholder', { id });
    const session: TerminalSession = { id };
    this.sessions.set(id, session);
    return session;
  }

  closeSession(id: string): void {
    logger.info('Closing terminal session', { id });
    this.sessions.delete(id);
  }

  write(id: string, data: string): void {
    logger.debug('Terminal write called', { id, length: data.length });
    // node-pty will be connected here in Phase 2
  }
}

export const terminalService = new TerminalService();
