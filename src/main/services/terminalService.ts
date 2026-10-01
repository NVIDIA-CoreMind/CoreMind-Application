import { createRequire } from 'node:module';
import os from 'node:os';
import fs from 'node:fs';
import { logger } from './logger';
import { TerminalSpawnOptions } from '../../shared/types/ipc';

const require = createRequire(import.meta.url);

interface IPtyProcess {
  pid: number;
  cols: number;
  rows: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  onData(listener: (data: string) => void): { dispose(): void };
  onExit(listener: (event: { exitCode: number; signal?: number }) => void): { dispose(): void };
}

interface NodePtyModule {
  spawn(file: string, args: string[] | string, options: any): IPtyProcess;
}

let ptyModule: NodePtyModule | null = null;
try {
  ptyModule = require('node-pty');
  logger.info('node-pty successfully loaded in main process');
} catch (err: unknown) {
  const error = err as Error;
  logger.error('Failed to load node-pty', { message: error.message });
}

export interface ActiveTerminalSession {
  id: string;
  ptyProcess: IPtyProcess;
  cwd: string;
  dataDisposable?: { dispose(): void };
  exitDisposable?: { dispose(): void };
}

export class TerminalService {
  private sessions: Map<string, ActiveTerminalSession> = new Map();

  /**
   * Spawn a new real shell process attached to a pseudo-terminal.
   */
  createSession(
    id: string,
    options: TerminalSpawnOptions = {},
    onData: (data: string) => void,
    onExit: (code: number) => void
  ): boolean {
    if (!ptyModule) {
      logger.error('Cannot create terminal session: node-pty is unavailable');
      return false;
    }

    // Terminate existing session with the same id if already present
    if (this.sessions.has(id)) {
      this.closeSession(id);
    }

    const defaultShell =
      process.env.SHELL ||
      (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');

    // Resolve working directory: prefer provided cwd if exists, fallback to home directory
    let workingDir = options.cwd || os.homedir();
    if (!fs.existsSync(workingDir)) {
      workingDir = os.homedir();
    }

    const cols = options.cols || 80;
    const rows = options.rows || 24;

    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'en_US.UTF-8',
    };

    try {
      logger.info('Spawning live terminal shell', { id, shell: defaultShell, cwd: workingDir, cols, rows });

      const ptyProcess = ptyModule.spawn(defaultShell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: workingDir,
        env,
      });

      const dataDisposable = ptyProcess.onData((data: string) => {
        onData(data);
      });

      const exitDisposable = ptyProcess.onExit(({ exitCode }) => {
        logger.info('Terminal process exited', { id, exitCode });
        if (this.sessions.get(id)?.ptyProcess === ptyProcess) {
          this.sessions.delete(id);
          onExit(exitCode);
        }
      });

      this.sessions.set(id, {
        id,
        ptyProcess,
        cwd: workingDir,
        dataDisposable,
        exitDisposable,
      });

      return true;
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to spawn terminal process', { id, message: error.message });
      return false;
    }
  }

  /**
   * Send keystrokes / text data to the PTY.
   */
  write(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      logger.warn('Terminal session not found for write', { id });
      return;
    }
    try {
      session.ptyProcess.write(data);
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to write to terminal session', { id, message: error.message });
    }
  }

  /**
   * Resize the PTY columns and rows.
   */
  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id);
    if (!session) return;

    try {
      if (cols > 0 && rows > 0) {
        session.ptyProcess.resize(cols, rows);
      }
    } catch (err: unknown) {
      const error = err as Error;
      logger.warn('Failed to resize terminal session', { id, message: error.message });
    }
  }

  /**
   * Close and kill a terminal session.
   */
  closeSession(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      logger.info('Killing terminal session', { id });
      try {
        session.dataDisposable?.dispose();
        session.exitDisposable?.dispose();
        session.ptyProcess.kill();
      } catch {
        // Process might already be dead
      }
      this.sessions.delete(id);
    }
  }

  /**
   * Kill all active sessions when application exits.
   */
  closeAllSessions(): void {
    for (const session of this.sessions.values()) {
      try {
        session.ptyProcess.kill();
      } catch {
        // Ignore
      }
    }
    this.sessions.clear();
  }
}

export const terminalService = new TerminalService();
