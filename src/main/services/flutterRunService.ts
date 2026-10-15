/**
 * FlutterRunService — Main-process service for Flutter SDK discovery,
 * project detection, device listing, and run/reload lifecycle.
 *
 * Uses execFile with explicit arguments. Tracks process lifecycle
 * and cleans up on shutdown.
 */

import { execFile, ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { logger } from './logger';
import type {
  FlutterSdkStatus,
  FlutterDevice,
  FlutterRunState,
  VirtualMobileEvent,
} from '../../shared/types/virtualMobile';

const FLUTTER_TIMEOUT_MS = 30_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function execFileAsync(
  cmd: string,
  args: string[],
  options: { timeout?: number; env?: NodeJS.ProcessEnv; cwd?: string } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      {
        timeout: options.timeout ?? FLUTTER_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
        env: options.env ?? process.env,
        cwd: options.cwd,
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(Object.assign(err, { stdout: stdout ?? '', stderr: stderr ?? '' }));
        } else {
          resolve({ stdout: stdout ?? '', stderr: stderr ?? '' });
        }
      }
    );
  });
}

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class FlutterRunService {
  private flutterPath: string | null = null;
  private runProcess: ChildProcess | null = null;
  private runState: FlutterRunState = {
    status: 'idle',
    deviceId: null,
    pid: null,
    isFlutterProject: false,
    error: null,
  };

  private onEventCallback: ((event: VirtualMobileEvent) => void) | null = null;

  public setEventCallback(cb: (event: VirtualMobileEvent) => void): void {
    this.onEventCallback = cb;
  }

  private emitEvent(event: VirtualMobileEvent): void {
    this.onEventCallback?.(event);
  }

  // ─── SDK Discovery ───────────────────────────────────────────────────────

  public async discoverFlutterSdk(): Promise<FlutterSdkStatus> {
    logger.info('Discovering Flutter SDK...');

    // Check known paths
    const candidates: string[] = [];

    // From environment
    if (process.env.FLUTTER_ROOT) {
      candidates.push(path.join(process.env.FLUTTER_ROOT, 'bin', 'flutter'));
    }

    // Common macOS paths
    const home = os.homedir();
    candidates.push(
      path.join(home, 'development', 'flutter', 'bin', 'flutter'),
      path.join(home, 'flutter', 'bin', 'flutter'),
      path.join(home, '.flutter', 'bin', 'flutter'),
      path.join(home, 'fvm', 'default', 'bin', 'flutter'),
      '/usr/local/flutter/bin/flutter',
      path.join(home, 'snap', 'flutter', 'common', 'flutter', 'bin', 'flutter'),
    );

    // Try `which flutter` first
    try {
      const { stdout } = await execFileAsync('which', ['flutter'], { timeout: 5_000 });
      const whichPath = stdout.trim();
      if (whichPath && !candidates.includes(whichPath)) {
        candidates.unshift(whichPath);
      }
    } catch {
      // which not available or flutter not in PATH
    }

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && isExecutable(candidate)) {
        try {
          const { stdout } = await execFileAsync(candidate, ['--version', '--machine'], {
            timeout: 15_000,
          });

          // Parse version
          let version = 'unknown';
          try {
            const parsed = JSON.parse(stdout);
            version = parsed.frameworkVersion || parsed.flutterVersion || 'unknown';
          } catch {
            // Try non-machine format
            const versionMatch = stdout.match(/Flutter\s+(\d+\.\d+\.\d+)/);
            if (versionMatch) version = versionMatch[1];
          }

          this.flutterPath = candidate;
          logger.info('Flutter SDK found', { path: candidate, version });
          return { found: true, path: candidate, version };
        } catch {
          // This candidate didn't work
          continue;
        }
      }
    }

    logger.warn('Flutter SDK not found');
    return {
      found: false,
      error: 'Flutter SDK not found. Install Flutter and add it to your PATH.',
    };
  }

  public getFlutterPath(): string | null {
    return this.flutterPath;
  }

  // ─── Project Detection ───────────────────────────────────────────────────

  public checkFlutterProject(workspacePath: string): boolean {
    if (!workspacePath) return false;
    const pubspecPath = path.join(workspacePath, 'pubspec.yaml');
    if (!fs.existsSync(pubspecPath)) return false;

    try {
      const content = fs.readFileSync(pubspecPath, 'utf8');
      // A Flutter project has flutter dependency
      return content.includes('flutter:') && (content.includes('sdk: flutter') || content.includes('flutter/flutter'));
    } catch {
      return false;
    }
  }

  // ─── Device Listing ──────────────────────────────────────────────────────

  public async listFlutterDevices(): Promise<FlutterDevice[]> {
    if (!this.flutterPath) return [];

    try {
      const { stdout } = await execFileAsync(this.flutterPath, ['devices', '--machine'], {
        timeout: FLUTTER_TIMEOUT_MS,
      });

      let parsed: Array<{ id: string; name: string; targetPlatform?: string; emulator?: boolean }>;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        logger.warn('Failed to parse flutter devices output');
        return [];
      }

      return parsed.map((d) => ({
        id: d.id,
        name: d.name || d.id,
        platform: d.targetPlatform || 'unknown',
        isEmulator: d.emulator ?? false,
      }));
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to list Flutter devices', { message: error.message });
      return [];
    }
  }

  // ─── Run Lifecycle ───────────────────────────────────────────────────────

  public getRunState(): FlutterRunState {
    return { ...this.runState };
  }

  public async startRun(
    workspacePath: string,
    deviceId: string,
    mode: 'debug' | 'release' | 'profile' = 'debug'
  ): Promise<FlutterRunState> {
    if (!this.flutterPath) {
      return this.setRunState({
        ...this.runState,
        status: 'error',
        error: 'Flutter SDK not found.',
      });
    }

    if (this.runState.status === 'running' || this.runState.status === 'starting') {
      return this.setRunState({
        ...this.runState,
        error: `Flutter is already ${this.runState.status}. Stop it first.`,
      });
    }

    if (!this.checkFlutterProject(workspacePath)) {
      return this.setRunState({
        ...this.runState,
        status: 'error',
        isFlutterProject: false,
        error: 'No Flutter project found in the current workspace.',
      });
    }

    // Validate device ID (alphanumeric, colons, hyphens, dots, underscores)
    if (!/^[\w.:\-]+$/.test(deviceId)) {
      return this.setRunState({
        ...this.runState,
        status: 'error',
        error: 'Invalid device ID.',
      });
    }

    this.setRunState({
      status: 'starting',
      deviceId,
      pid: null,
      isFlutterProject: true,
      error: null,
    });

    try {
      // Auto-generate missing Android platform files if running on an Android target
      if (
        deviceId !== 'chrome' &&
        deviceId !== 'macos' &&
        deviceId !== 'windows' &&
        !fs.existsSync(path.join(workspacePath, 'android'))
      ) {
        logger.info('Android platform missing. Auto-generating Android files via flutter create...', { workspacePath });
        this.emitEvent({
          type: 'flutter-output',
          data: 'Android platform missing. Auto-generating Android files via flutter create...\n',
          stream: 'stdout',
        });
        await execFileAsync(this.flutterPath, ['create', '--platforms=android', '.'], {
          cwd: workspacePath,
          timeout: 45_000,
        });
      }

      const args = ['run', '-d', deviceId];
      if (mode === 'release') args.push('--release');
      if (mode === 'profile') args.push('--profile');
      // Enable machine-readable output for stdin commands
      args.push('--machine');

      logger.info('Starting Flutter run', { deviceId, mode, workspacePath });


      const child = spawn(this.flutterPath, args, {
        cwd: workspacePath,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      this.runProcess = child;

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.emitEvent({ type: 'flutter-output', data: text, stream: 'stdout' });

        // Detect successful launch
        if (text.includes('"event":"app.started"') || text.includes('Flutter run key commands')) {
          this.setRunState({
            ...this.runState,
            status: 'running',
            pid: child.pid ?? null,
          });
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.emitEvent({ type: 'flutter-output', data: text, stream: 'stderr' });
      });

      child.on('error', (err) => {
        logger.error('Flutter run process error', { message: err.message });
        this.setRunState({
          status: 'error',
          deviceId,
          pid: null,
          isFlutterProject: true,
          error: err.message,
        });
        this.runProcess = null;
      });

      child.on('exit', (code) => {
        logger.info('Flutter run process exited', { code });
        this.setRunState({
          status: code === 0 ? 'stopped' : 'error',
          deviceId: null,
          pid: null,
          isFlutterProject: true,
          error: code !== 0 ? `Flutter run exited with code ${code}` : null,
        });
        this.runProcess = null;
      });

      // Set initial state with PID
      this.setRunState({
        ...this.runState,
        pid: child.pid ?? null,
      });

      return this.getRunState();
    } catch (err: unknown) {
      const error = err as Error;
      return this.setRunState({
        status: 'error',
        deviceId,
        pid: null,
        isFlutterProject: true,
        error: error.message,
      });
    }
  }

  public async hotReload(): Promise<boolean> {
    if (this.runState.status !== 'running' || !this.runProcess) {
      return false;
    }

    try {
      this.setRunState({ ...this.runState, status: 'hot-reloading' });
      // Send 'r' for hot reload via stdin
      this.runProcess.stdin?.write('r');
      // Reset status after a short delay
      setTimeout(() => {
        if (this.runState.status === 'hot-reloading') {
          this.setRunState({ ...this.runState, status: 'running' });
        }
      }, 3000);
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Hot reload failed', { message: error.message });
      this.setRunState({ ...this.runState, status: 'running', error: error.message });
      return false;
    }
  }

  public async hotRestart(): Promise<boolean> {
    if (this.runState.status !== 'running' || !this.runProcess) {
      return false;
    }

    try {
      this.setRunState({ ...this.runState, status: 'hot-restarting' });
      // Send 'R' for hot restart via stdin
      this.runProcess.stdin?.write('R');
      setTimeout(() => {
        if (this.runState.status === 'hot-restarting') {
          this.setRunState({ ...this.runState, status: 'running' });
        }
      }, 5000);
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Hot restart failed', { message: error.message });
      this.setRunState({ ...this.runState, status: 'running', error: error.message });
      return false;
    }
  }

  public async stopRun(): Promise<FlutterRunState> {
    if (!this.runProcess) {
      return this.setRunState({
        status: 'idle',
        deviceId: null,
        pid: null,
        isFlutterProject: this.runState.isFlutterProject,
        error: null,
      });
    }

    this.setRunState({ ...this.runState, status: 'stopping' });

    try {
      // Send 'q' to gracefully quit
      this.runProcess.stdin?.write('q');

      // Give it time then force kill
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          if (this.runProcess && !this.runProcess.killed) {
            this.runProcess.kill('SIGTERM');
            setTimeout(() => {
              if (this.runProcess && !this.runProcess.killed) {
                this.runProcess.kill('SIGKILL');
              }
              resolve();
            }, 3000);
          } else {
            resolve();
          }
        }, 5000);

        this.runProcess?.on('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    } catch {
      // Force kill
      try {
        this.runProcess?.kill('SIGKILL');
      } catch { /* ignore */ }
    }

    this.runProcess = null;
    return this.setRunState({
      status: 'stopped',
      deviceId: null,
      pid: null,
      isFlutterProject: this.runState.isFlutterProject,
      error: null,
    });
  }

  // ─── Flutter Pub Get ────────────────────────────────────────────────────

  public async pubGet(workspacePath: string): Promise<boolean> {
    if (!this.flutterPath) {
      await this.discoverFlutterSdk();
    }
    if (!this.flutterPath) {
      this.emitEvent({
        type: 'flutter-output',
        data: 'Flutter SDK not found. Install Flutter or add it to PATH.\n',
        stream: 'stderr',
      });
      return false;
    }

    this.emitEvent({
      type: 'flutter-output',
      data: `Running "flutter pub get" in ${workspacePath}...\n`,
      stream: 'stdout',
    });

    try {
      const { stdout, stderr } = await execFileAsync(
        this.flutterPath,
        ['pub', 'get'],
        { cwd: workspacePath, timeout: 60_000 }
      );
      if (stdout) {
        this.emitEvent({ type: 'flutter-output', data: stdout, stream: 'stdout' });
      }
      if (stderr) {
        this.emitEvent({ type: 'flutter-output', data: stderr, stream: 'stderr' });
      }
      this.emitEvent({
        type: 'flutter-output',
        data: '✓ flutter pub get completed successfully.\n',
        stream: 'stdout',
      });
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      this.emitEvent({
        type: 'flutter-output',
        data: `flutter pub get failed: ${error.message}\n`,
        stream: 'stderr',
      });
      return false;
    }
  }

  // ─── State Management ────────────────────────────────────────────────────

  private setRunState(state: FlutterRunState): FlutterRunState {
    this.runState = state;
    this.emitEvent({ type: 'flutter-state-changed', state });
    return state;
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  public async cleanup(): Promise<void> {
    logger.info('FlutterRunService cleanup');
    if (this.runProcess && !this.runProcess.killed) {
      try {
        this.runProcess.kill('SIGTERM');
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            try {
              this.runProcess?.kill('SIGKILL');
            } catch { /* ignore */ }
            resolve();
          }, 3000);
          this.runProcess?.on('exit', () => {
            clearTimeout(timer);
            resolve();
          });
        });
      } catch { /* ignore */ }
    }
    this.runProcess = null;
  }
}

export const flutterRunService = new FlutterRunService();
