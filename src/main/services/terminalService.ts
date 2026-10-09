import { createRequire } from 'node:module';
import os from 'node:os';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { logger } from './logger';
import { TerminalSpawnOptions, ExecuteCommandOptions, ExecuteCommandResult } from '../../shared/types/ipc';

export interface CommandValidationResult {
  allowed: boolean;
  requiresApproval?: boolean;
  reason?: string;
}

export function validateCommand(command: string): CommandValidationResult {
  const trimmed = command.trim();
  if (!trimmed) {
    return { allowed: false, reason: 'Command cannot be empty.' };
  }

  // Check for destructive root/system wiping commands
  const dangerousPatterns = [
    /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-f[a-zA-Z]*r[a-zA-Z]*)\s+(\/|~|\$HOME|\*)/i,
    /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-f[a-zA-Z]*r[a-zA-Z]*)\s+\/.*(?:\b|$)/i,
    /\bmkfs\b/i,
    /\bdd\s+if=.*of=\/dev\/(?:sd|hd|nvme|disk)/i,
    /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // fork bomb
    />\s*\/dev\/(?:sd|hd|nvme|disk)/i,
    /\bchmod\s+(-[a-zA-Z]*R[a-zA-Z]*\s+)?777\s+\//i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: 'Command blocked: potentially destructive system operation detected.',
      };
    }
  }

  // Check for commands requiring explicit user approval (privilege escalation, system modification)
  const approvalPatterns = [
    /\bsudo\b/i,
    /\bsu\b(?:\s+|$)/i,
    /\bcurl\s+.*\|\s*(?:bash|sh)\b/i,
    /\bwget\s+.*\|\s*(?:bash|sh)\b/i,
  ];

  for (const pattern of approvalPatterns) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: 'Elevated privileges or remote pipe execution requires explicit user approval.',
      };
    }
  }

  return { allowed: true };
}


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

import { platformTerminal } from '../platform/terminal/platformTerminal';
import { ShellInfo } from '../platform/terminal/types';

export class TerminalService {
  private sessions: Map<string, ActiveTerminalSession> = new Map();

  /**
   * Get available shells for the current platform.
   */
  public getAvailableShells(): ShellInfo[] {
    return platformTerminal.getAvailableShells();
  }

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

    const shellToRun = options.shell || platformTerminal.getDefaultShell();
    const shellArgs = options.shellArgs || (options.shell ? [] : platformTerminal.getDefaultShellArgs());

    // Resolve working directory: prefer provided cwd if exists, fallback to home directory
    let workingDir = options.cwd || os.homedir();
    if (!fs.existsSync(workingDir)) {
      workingDir = os.homedir();
    }

    const cols = options.cols || 80;
    const rows = options.rows || 24;

    const env = {
      ...platformTerminal.getTerminalEnv(),
    };

    try {
      logger.info('Spawning live terminal shell', { id, shell: shellToRun, args: shellArgs, cwd: workingDir, cols, rows });

      const ptyProcess = ptyModule.spawn(shellToRun, shellArgs, {
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

  /**
   * Execute a command with streaming output, cancellation, timeout, and output bounding.
   */
  public async executeCommand(
    options: ExecuteCommandOptions & {
      onData?: (data: string, stream: 'stdout' | 'stderr') => void;
      signal?: AbortSignal;
    }
  ): Promise<ExecuteCommandResult> {
    const {
      command,
      cwd = process.cwd(),
      env = {},
      timeoutMs = 120000,
      maxBufferBytes = 1024 * 1024,
      onData,
      signal,
    } = options;

    const validation = validateCommand(command);
    if (!validation.allowed) {
      logger.warn('Blocked command attempt', { command, reason: validation.reason });
      return {
        exitCode: 126,
        stdout: '',
        stderr: validation.reason || 'Command execution was blocked by security policy.',
        timedOut: false,
        killed: false,
      };
    }

    if (signal?.aborted) {
      return {
        exitCode: 130,
        stdout: '',
        stderr: 'Command was aborted before execution.',
        timedOut: false,
        killed: true,
      };
    }

    return new Promise<ExecuteCommandResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let killed = false;
      let timer: NodeJS.Timeout | null = null;

      const isWin = process.platform === 'win32';
      const shellExecutable = isWin ? (process.env.ComSpec || 'cmd.exe') : (process.env.SHELL || '/bin/sh');
      const shellArgs = isWin ? ['/d', '/s', '/c', command] : ['-c', command];

      const mergedEnv = {
        ...process.env,
        ...platformTerminal.getTerminalEnv(),
        ...env,
      };

      const workingDir = fs.existsSync(cwd) ? cwd : process.cwd();
      logger.info('Executing command', { command, cwd: workingDir, timeoutMs });

      const child = spawn(shellExecutable, shellArgs, {
        cwd: workingDir,
        env: mergedEnv,
        windowsHide: true,
      });

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          timedOut = true;
          logger.warn('Command timed out', { command, timeoutMs });
          try {
            child.kill('SIGTERM');
            setTimeout(() => {
              if (!child.killed) child.kill('SIGKILL');
            }, 1000);
          } catch {
            // ignore
          }
        }, timeoutMs);
      }

      const abortHandler = () => {
        killed = true;
        logger.info('Command execution cancelled by abort signal', { command });
        if (timer) clearTimeout(timer);
        try {
          child.kill('SIGTERM');
          setTimeout(() => {
            if (!child.killed) child.kill('SIGKILL');
          }, 1000);
        } catch {
          // ignore
        }
      };

      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      child.stdout?.on('data', (chunk: Buffer | string) => {
        const text = chunk.toString();
        if (stdout.length < maxBufferBytes) {
          stdout += text.slice(0, maxBufferBytes - stdout.length);
        }
        onData?.(text, 'stdout');
      });

      child.stderr?.on('data', (chunk: Buffer | string) => {
        const text = chunk.toString();
        if (stderr.length < maxBufferBytes) {
          stderr += text.slice(0, maxBufferBytes - stderr.length);
        }
        onData?.(text, 'stderr');
      });

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', abortHandler);
        logger.error('Command process error', { command, message: err.message });
        resolve({
          exitCode: (err as any).code === 'ENOENT' ? 127 : 1,
          stdout,
          stderr: (stderr ? stderr + '\n' : '') + err.message,
          timedOut,
          killed,
        });
      });

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', abortHandler);
        const finalExitCode = timedOut ? 124 : killed ? 130 : (code ?? 0);
        logger.info('Command execution finished', { command, exitCode: finalExitCode, timedOut, killed });
        resolve({
          exitCode: finalExitCode,
          stdout,
          stderr,
          timedOut,
          killed,
        });
      });
    });
  }
}

export const terminalService = new TerminalService();

