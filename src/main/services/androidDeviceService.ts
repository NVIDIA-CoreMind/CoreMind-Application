/**
 * AndroidDeviceService — Main-process service for Android SDK discovery,
 * ADB device management, AVD lifecycle, log streaming, and screenshots.
 *
 * Security: Uses execFile with explicit arguments. Never concatenates
 * user input into shell commands. Validates all paths before use.
 */

import { execFile, ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { logger } from './logger';
import type {
  AndroidDevice,
  AvdDefinition,
  SdkPaths,
  SdkStatus,
  EmulatorState,
  DeviceLogEntry,
  ScreenshotResult,
  LogLevel,
} from '../../shared/types/virtualMobile';

// ─── Timeouts ────────────────────────────────────────────────────────────────

const ADB_TIMEOUT_MS = 15_000;
const EMULATOR_START_TIMEOUT_MS = 120_000;
const SCREENSHOT_TIMEOUT_MS = 10_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

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
        timeout: options.timeout ?? ADB_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
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

// ─── Service ─────────────────────────────────────────────────────────────────

export class AndroidDeviceService {
  private sdkPaths: SdkPaths | null = null;
  private emulatorProcess: ChildProcess | null = null;
  private logcatProcess: ChildProcess | null = null;
  private deviceDimensions: Map<string, { width: number; height: number }> = new Map();
  private screenStreamInterval: ReturnType<typeof setInterval> | null = null;
  private isCapturingFrame = false;
  private emulatorState: EmulatorState = {
    status: 'idle',
    avdName: null,
    serial: null,
    error: null,
    pid: null,
  };

  private onEventCallback: ((event: import('../../shared/types/virtualMobile').VirtualMobileEvent) => void) | null = null;

  public setEventCallback(cb: (event: import('../../shared/types/virtualMobile').VirtualMobileEvent) => void): void {
    this.onEventCallback = cb;
  }

  private emitEvent(event: import('../../shared/types/virtualMobile').VirtualMobileEvent): void {
    this.onEventCallback?.(event);
  }

  // ─── SDK Discovery ───────────────────────────────────────────────────────

  public async discoverSdk(): Promise<SdkStatus> {
    logger.info('Discovering Android SDK...');

    // Priority order: ANDROID_HOME, ANDROID_SDK_ROOT, common macOS paths
    const candidates: Array<{ path: string; source: SdkStatus['source'] }> = [];

    if (process.env.ANDROID_HOME) {
      candidates.push({ path: process.env.ANDROID_HOME, source: 'ANDROID_HOME' });
    }
    if (process.env.ANDROID_SDK_ROOT) {
      candidates.push({ path: process.env.ANDROID_SDK_ROOT, source: 'ANDROID_SDK_ROOT' });
    }

    // Standard macOS Android SDK locations
    const home = os.homedir();
    candidates.push(
      { path: path.join(home, 'Library', 'Android', 'sdk'), source: 'default_path' },
      { path: path.join(home, 'Android', 'Sdk'), source: 'default_path' },
      { path: '/usr/local/share/android-sdk', source: 'default_path' },
    );

    // Detect Android Studio
    const studioCandidatePaths = [
      '/Applications/Android Studio.app',
      path.join(home, 'Applications', 'Android Studio.app'),
    ];
    let studioInstalled = false;
    let studioPath: string | undefined;
    for (const p of studioCandidatePaths) {
      if (fs.existsSync(p)) {
        studioInstalled = true;
        studioPath = p;
        break;
      }
    }

    for (const candidate of candidates) {
      const result = this.validateSdkPath(candidate.path, candidate.source);
      if (result.found) {
        logger.info('Android SDK found', { path: candidate.path, source: candidate.source });
        this.sdkPaths = result.paths!;
        return {
          ...result,
          androidStudioInstalled: studioInstalled,
          androidStudioPath: studioPath,
        };
      }
    }

    const status: SdkStatus = {
      found: false,
      error: 'Android SDK not found. Set ANDROID_HOME or install Android SDK via Android Studio.',
      androidStudioInstalled: studioInstalled,
      androidStudioPath: studioPath,
    };
    logger.warn('Android SDK not found');
    return status;
  }

  private validateSdkPath(sdkRoot: string, source: SdkStatus['source']): SdkStatus {
    if (!fs.existsSync(sdkRoot)) {
      return { found: false, error: `SDK path does not exist: ${sdkRoot}` };
    }

    // Check for platform-tools/adb
    const adbPath = path.join(sdkRoot, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
    if (!fs.existsSync(adbPath) || !isExecutable(adbPath)) {
      return { found: false, error: `adb not found or not executable at: ${adbPath}` };
    }

    // Check for emulator
    const emulatorPath = path.join(sdkRoot, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
    if (!fs.existsSync(emulatorPath) || !isExecutable(emulatorPath)) {
      return { found: false, error: `emulator not found or not executable at: ${emulatorPath}` };
    }

    // Optional avdmanager
    const avdmanagerPath = path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'avdmanager');
    const hasAvdmanager = fs.existsSync(avdmanagerPath) && isExecutable(avdmanagerPath);

    const paths: SdkPaths = {
      sdkRoot,
      adb: adbPath,
      emulator: emulatorPath,
      avdmanager: hasAvdmanager ? avdmanagerPath : undefined,
    };

    return { found: true, paths, source };
  }

  public getSdkPaths(): SdkPaths | null {
    return this.sdkPaths;
  }

  // ─── ADB Operations ─────────────────────────────────────────────────────

  private getSdkEnv(): NodeJS.ProcessEnv {
    if (!this.sdkPaths) return { ...process.env };
    return {
      ...process.env,
      ANDROID_HOME: this.sdkPaths.sdkRoot,
      ANDROID_SDK_ROOT: this.sdkPaths.sdkRoot,
      PATH: `${path.dirname(this.sdkPaths.adb)}:${path.dirname(this.sdkPaths.emulator)}:${process.env.PATH ?? ''}`,
    };
  }

  public async listDevices(): Promise<AndroidDevice[]> {
    if (!this.sdkPaths) {
      logger.warn('Cannot list devices: SDK not discovered');
      return [];
    }

    try {
      const { stdout } = await execFileAsync(this.sdkPaths.adb, ['devices', '-l'], {
        env: this.getSdkEnv(),
      });

      const devices: AndroidDevice[] = [];
      const lines = stdout.split('\n').slice(1); // Skip header

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('*')) continue;

        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) continue;

        const serial = parts[0];
        const stateStr = parts[1] as AndroidDevice['state'];

        // Parse optional properties
        const props: Record<string, string> = {};
        for (const part of parts.slice(2)) {
          const [key, val] = part.split(':');
          if (key && val) props[key] = val;
        }

        const isEmulator = serial.startsWith('emulator-');
        const device: AndroidDevice = {
          serial,
          name: props['model']?.replace(/_/g, ' ') || props['device'] || serial,
          type: isEmulator ? 'emulator' : (props['transport_id'] ? 'usb' : 'usb'),
          state: stateStr || 'unknown',
          isOnline: stateStr === 'device',
          avdName: isEmulator ? await this.getAvdNameForEmulator(serial) : undefined,
        };

        devices.push(device);
      }

      return devices;
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to list devices', { message: error.message });
      return [];
    }
  }

  private async getAvdNameForEmulator(serial: string): Promise<string | undefined> {
    if (!this.sdkPaths) return undefined;
    try {
      const { stdout } = await execFileAsync(this.sdkPaths.adb, ['-s', serial, 'emu', 'avd', 'name'], {
        timeout: 5_000,
        env: this.getSdkEnv(),
      });
      const name = stdout.split('\n')[0]?.trim();
      return name || undefined;
    } catch {
      return undefined;
    }
  }

  // ─── AVD Management ──────────────────────────────────────────────────────

  public async listAvds(): Promise<AvdDefinition[]> {
    if (!this.sdkPaths) {
      logger.warn('Cannot list AVDs: SDK not discovered');
      return [];
    }

    try {
      const { stdout } = await execFileAsync(this.sdkPaths.emulator, ['-list-avds'], {
        env: this.getSdkEnv(),
      });

      const avds: AvdDefinition[] = [];
      for (const line of stdout.split('\n')) {
        const name = line.trim();
        if (name && !name.startsWith('INFO') && !name.startsWith('WARNING')) {
          const avd: AvdDefinition = { name };

          // Try to read the AVD config.ini for extra metadata
          const avdDir = path.join(os.homedir(), '.android', 'avd', `${name}.avd`);
          const configPath = path.join(avdDir, 'config.ini');
          if (fs.existsSync(configPath)) {
            try {
              const config = fs.readFileSync(configPath, 'utf8');
              const lines = config.split('\n');
              for (const cfgLine of lines) {
                const [key, val] = cfgLine.split('=').map((s) => s.trim());
                if (key === 'hw.device.name') avd.device = val;
                if (key === 'image.sysdir.1') {
                  const apiMatch = val?.match(/android-(\d+)/);
                  if (apiMatch) avd.apiLevel = parseInt(apiMatch[1], 10);
                }
                if (key === 'abi.type') avd.abi = val;
              }
            } catch {
              // Config read failure is non-fatal
            }
          }

          avds.push(avd);
        }
      }

      return avds;
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to list AVDs', { message: error.message });
      return [];
    }
  }

  // ─── Emulator Lifecycle ──────────────────────────────────────────────────

  public getEmulatorState(): EmulatorState {
    return { ...this.emulatorState };
  }

  public async startEmulator(avdName: string): Promise<EmulatorState> {
    if (!this.sdkPaths) {
      return this.setEmulatorState({
        status: 'error',
        avdName,
        serial: null,
        error: 'Android SDK not configured. Run SDK discovery first.',
        pid: null,
      });
    }

    if (this.emulatorState.status === 'running' || this.emulatorState.status === 'starting') {
      return this.setEmulatorState({
        ...this.emulatorState,
        error: `Emulator already ${this.emulatorState.status}. Stop it first.`,
      });
    }

    // Validate AVD name (alphanumeric, underscores, hyphens, dots only)
    if (!/^[\w.\-]+$/.test(avdName)) {
      return this.setEmulatorState({
        status: 'error',
        avdName,
        serial: null,
        error: 'Invalid AVD name.',
        pid: null,
      });
    }

    // Verify AVD exists
    const avds = await this.listAvds();
    if (!avds.some((a) => a.name === avdName)) {
      return this.setEmulatorState({
        status: 'error',
        avdName,
        serial: null,
        error: `AVD "${avdName}" not found. Create one in Android Studio first.`,
        pid: null,
      });
    }

    this.setEmulatorState({
      status: 'starting',
      avdName,
      serial: null,
      error: null,
      pid: null,
    });

    try {
      logger.info('Starting Android emulator', { avdName });

      const emulatorProcess = spawn(this.sdkPaths.emulator, ['-avd', avdName, '-no-snapshot-load'], {
        env: this.getSdkEnv(),
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.emulatorProcess = emulatorProcess;

      emulatorProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        logger.info('[Emulator stdout]', { text: text.trim() });
      });

      emulatorProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        logger.warn('[Emulator stderr]', { text: text.trim() });
      });

      emulatorProcess.on('error', (err) => {
        logger.error('Emulator process error', { message: err.message });
        this.setEmulatorState({
          status: 'error',
          avdName,
          serial: null,
          error: `Emulator failed to start: ${err.message}`,
          pid: null,
        });
        this.emulatorProcess = null;
      });

      emulatorProcess.on('exit', (code, signal) => {
        logger.info('Emulator process exited', { code, signal });
        if (this.emulatorState.status !== 'stopping') {
          this.setEmulatorState({
            status: 'idle',
            avdName: null,
            serial: null,
            error: code !== 0 ? `Emulator exited with code ${code}` : null,
            pid: null,
          });
        } else {
          this.setEmulatorState({
            status: 'idle',
            avdName: null,
            serial: null,
            error: null,
            pid: null,
          });
        }
        this.emulatorProcess = null;
      });

      // Wait for the emulator to appear in `adb devices`
      const serial = await this.waitForEmulatorBoot(avdName);

      if (serial) {
        this.setEmulatorState({
          status: 'running',
          avdName,
          serial,
          error: null,
          pid: emulatorProcess.pid ?? null,
        });
      } else if ((this.emulatorState.status as string) === 'starting') {
        // Boot timeout but process still running — emulator is alive but slow
        this.setEmulatorState({
          status: 'running',
          avdName,
          serial: null,
          error: 'Emulator started but boot verification timed out. It may still be booting.',
          pid: emulatorProcess.pid ?? null,
        });
      }

      return this.getEmulatorState();
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to start emulator', { message: error.message });
      return this.setEmulatorState({
        status: 'error',
        avdName,
        serial: null,
        error: error.message,
        pid: null,
      });
    }
  }

  private async waitForEmulatorBoot(avdName: string): Promise<string | null> {
    const startTime = Date.now();
    const pollInterval = 3_000;

    while (Date.now() - startTime < EMULATOR_START_TIMEOUT_MS) {
      if (this.emulatorState.status !== 'starting') break;

      await new Promise((r) => setTimeout(r, pollInterval));

      try {
        const devices = await this.listDevices();
        const emulatorDevice = devices.find(
          (d) => d.type === 'emulator' && d.isOnline && (d.avdName === avdName || !d.avdName)
        );
        if (emulatorDevice) {
          // Verify boot completion
          try {
            const { stdout } = await execFileAsync(
              this.sdkPaths!.adb,
              ['-s', emulatorDevice.serial, 'shell', 'getprop', 'sys.boot_completed'],
              { timeout: 5_000, env: this.getSdkEnv() }
            );
            if (stdout.trim() === '1') {
              return emulatorDevice.serial;
            }
          } catch {
            // Not ready yet
          }
        }
      } catch {
        // ADB failure during poll
      }
    }

    return null;
  }

  public async stopEmulator(): Promise<EmulatorState> {
    if (this.emulatorState.status !== 'running' && this.emulatorState.status !== 'starting') {
      return this.emulatorState;
    }

    this.setEmulatorState({ ...this.emulatorState, status: 'stopping' });

    // Stop logcat
    this.stopLogStream();

    // Try graceful shutdown via ADB
    if (this.emulatorState.serial && this.sdkPaths) {
      try {
        await execFileAsync(this.sdkPaths.adb, ['-s', this.emulatorState.serial, 'emu', 'kill'], {
          timeout: 10_000,
          env: this.getSdkEnv(),
        });
      } catch {
        // Fall through to process kill
      }
    }

    // Kill process if still alive
    if (this.emulatorProcess && !this.emulatorProcess.killed) {
      try {
        this.emulatorProcess.kill('SIGTERM');
        setTimeout(() => {
          if (this.emulatorProcess && !this.emulatorProcess.killed) {
            this.emulatorProcess.kill('SIGKILL');
          }
        }, 5_000);
      } catch {
        // Process may already be dead
      }
    }

    return this.setEmulatorState({
      status: 'idle',
      avdName: null,
      serial: null,
      error: null,
      pid: null,
    });
  }

  // ─── Device Logs ─────────────────────────────────────────────────────────

  public startLogStream(serial: string): void {
    if (!this.sdkPaths) return;
    this.stopLogStream();

    logger.info('Starting logcat stream', { serial });

    this.logcatProcess = spawn(
      this.sdkPaths.adb,
      ['-s', serial, 'logcat', '-v', 'threadtime', '*:V'],
      { env: this.getSdkEnv(), stdio: ['ignore', 'pipe', 'pipe'] }
    );

    this.logcatProcess.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const entry = this.parseLogcatLine(line);
        if (entry) {
          this.emitEvent({ type: 'device-log', entry });
        }
      }
    });

    this.logcatProcess.on('exit', () => {
      logger.info('Logcat process exited');
      this.logcatProcess = null;
    });
  }

  public stopLogStream(): void {
    if (this.logcatProcess) {
      try {
        this.logcatProcess.kill('SIGTERM');
      } catch {
        // ignore
      }
      this.logcatProcess = null;
    }
  }

  private parseLogcatLine(line: string): DeviceLogEntry | null {
    // Format: MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: MESSAGE
    const match = line.match(/^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+\d+\s+([VDIWEFS])\s+(.+?):\s*(.*)$/);
    if (!match) return null;

    const levelMap: Record<string, LogLevel> = {
      V: 'verbose',
      D: 'debug',
      I: 'info',
      W: 'warning',
      E: 'error',
      F: 'fatal',
      S: 'silent',
    };

    return {
      timestamp: Date.now(),
      level: levelMap[match[3]] ?? 'info',
      tag: match[4].trim(),
      message: match[5],
      pid: parseInt(match[2], 10),
    };
  }

  // ─── Screenshots ─────────────────────────────────────────────────────────

  public async takeScreenshot(serial: string): Promise<ScreenshotResult | null> {
    if (!this.sdkPaths) return null;

    // Fast path: exec-out screencap -p (in-memory buffer, zero disk I/O, ~100ms)
    try {
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        execFile(
          this.sdkPaths!.adb,
          ['-s', serial, 'exec-out', 'screencap', '-p'],
          {
            encoding: 'buffer',
            maxBuffer: 20 * 1024 * 1024,
            timeout: SCREENSHOT_TIMEOUT_MS,
            env: this.getSdkEnv(),
          },
          (err, stdout) => {
            if (err) reject(err);
            else resolve(stdout as unknown as Buffer);
          }
        );
      });

      if (buffer && buffer.length > 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return {
          data: buffer.toString('base64'),
          width,
          height,
          timestamp: Date.now(),
        };
      }
    } catch {
      // Fall through to fallback file capture below
    }

    try {
      // Fallback: capture on device and pull
      await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'screencap', '-p', '/sdcard/coremind_screenshot.png'],
        { timeout: SCREENSHOT_TIMEOUT_MS, env: this.getSdkEnv() }
      );

      const tempPath = path.join(os.tmpdir(), `coremind_screenshot_${Date.now()}.png`);
      await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'pull', '/sdcard/coremind_screenshot.png', tempPath],
        { timeout: SCREENSHOT_TIMEOUT_MS, env: this.getSdkEnv() }
      );

      void execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'rm', '/sdcard/coremind_screenshot.png'],
        { env: this.getSdkEnv() }
      ).catch(() => {});

      const data = fs.readFileSync(tempPath);
      const base64 = data.toString('base64');
      try {
        fs.unlinkSync(tempPath);
      } catch {}

      let width = 0;
      let height = 0;
      if (data.length > 24) {
        width = data.readUInt32BE(16);
        height = data.readUInt32BE(20);
      }

      return {
        data: base64,
        width,
        height,
        timestamp: Date.now(),
      };
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Failed to take screenshot', { serial, message: error.message });
      return null;
    }
  }

  // ─── Real-time Screen Streaming ──────────────────────────────────────────

  public startScreenStream(serial: string, intervalMs: number = 350): void {
    this.stopScreenStream();
    this.screenStreamInterval = setInterval(async () => {
      if (this.isCapturingFrame) return;
      this.isCapturingFrame = true;
      try {
        const screenshot = await this.takeScreenshot(serial);
        if (screenshot) {
          this.emitEvent({ type: 'screenshot-ready', screenshot });
        }
      } catch {
        // best effort
      } finally {
        this.isCapturingFrame = false;
      }
    }, intervalMs);
  }

  public stopScreenStream(): void {
    if (this.screenStreamInterval) {
      clearInterval(this.screenStreamInterval);
      this.screenStreamInterval = null;
    }
  }

  private async captureAndEmit(serial: string): Promise<void> {
    try {
      const screenshot = await this.takeScreenshot(serial);
      if (screenshot) {
        this.emitEvent({ type: 'screenshot-ready', screenshot });
      }
    } catch {
      // best effort
    }
  }

  // ─── Interactive Live Input ──────────────────────────────────────────────

  public async getDeviceDimensions(serial: string): Promise<{ width: number; height: number }> {
    const cached = this.deviceDimensions.get(serial);
    if (cached) return cached;
    if (!this.sdkPaths) return { width: 1080, height: 2400 };

    try {
      const { stdout } = await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'wm', 'size'],
        { timeout: 5_000, env: this.getSdkEnv() }
      );
      const match = stdout.match(/size:\s*(\d+)x(\d+)/i);
      if (match) {
        const dims = { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
        this.deviceDimensions.set(serial, dims);
        return dims;
      }
    } catch {}
    return { width: 1080, height: 2400 };
  }

  public async sendTap(serial: string, xPercent: number, yPercent: number): Promise<boolean> {
    if (!this.sdkPaths) return false;
    const dims = await this.getDeviceDimensions(serial);
    const x = Math.max(0, Math.min(dims.width, Math.round(xPercent * dims.width)));
    const y = Math.max(0, Math.min(dims.height, Math.round(yPercent * dims.height)));

    try {
      await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'input', 'tap', String(x), String(y)],
        { timeout: 5_000, env: this.getSdkEnv() }
      );
      void this.captureAndEmit(serial);
      return true;
    } catch (err: unknown) {
      logger.error('Failed to send tap', { serial, x, y, message: (err as Error).message });
      return false;
    }
  }

  public async sendSwipe(
    serial: string,
    x1Percent: number,
    y1Percent: number,
    x2Percent: number,
    y2Percent: number,
    durationMs: number = 300
  ): Promise<boolean> {
    if (!this.sdkPaths) return false;
    const dims = await this.getDeviceDimensions(serial);
    const x1 = Math.max(0, Math.min(dims.width, Math.round(x1Percent * dims.width)));
    const y1 = Math.max(0, Math.min(dims.height, Math.round(y1Percent * dims.height)));
    const x2 = Math.max(0, Math.min(dims.width, Math.round(x2Percent * dims.width)));
    const y2 = Math.max(0, Math.min(dims.height, Math.round(y2Percent * dims.height)));

    try {
      await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'input', 'swipe', String(x1), String(y1), String(x2), String(y2), String(durationMs)],
        { timeout: 8_000, env: this.getSdkEnv() }
      );
      void this.captureAndEmit(serial);
      return true;
    } catch (err: unknown) {
      logger.error('Failed to send swipe', { serial, message: (err as Error).message });
      return false;
    }
  }

  public async sendKeyEvent(serial: string, key: number | string): Promise<boolean> {
    if (!this.sdkPaths) return false;
    try {
      await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'input', 'keyevent', String(key)],
        { timeout: 5_000, env: this.getSdkEnv() }
      );
      void this.captureAndEmit(serial);
      return true;
    } catch (err: unknown) {
      logger.error('Failed to send keyevent', { serial, key, message: (err as Error).message });
      return false;
    }
  }

  public async sendText(serial: string, text: string): Promise<boolean> {
    if (!this.sdkPaths) return false;
    const escaped = text.replace(/ /g, '%s').replace(/["'\\$`]/g, '');
    try {
      await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'input', 'text', escaped],
        { timeout: 5_000, env: this.getSdkEnv() }
      );
      void this.captureAndEmit(serial);
      return true;
    } catch (err: unknown) {
      logger.error('Failed to send text', { serial, text, message: (err as Error).message });
      return false;
    }
  }

  public async setOrientation(serial: string, orientation: 'portrait' | 'landscape'): Promise<boolean> {
    if (!this.sdkPaths) return false;
    const rotation = orientation === 'landscape' ? 1 : 0;
    try {
      await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0'],
        { timeout: 5_000, env: this.getSdkEnv() }
      );
      await execFileAsync(
        this.sdkPaths.adb,
        ['-s', serial, 'shell', 'settings', 'put', 'system', 'user_rotation', String(rotation)],
        { timeout: 5_000, env: this.getSdkEnv() }
      );
      this.deviceDimensions.delete(serial);
      void this.captureAndEmit(serial);
      return true;
    } catch (err: unknown) {
      logger.error('Failed to set orientation', { serial, orientation, message: (err as Error).message });
      return false;
    }
  }

  public async openAndroidStudio(): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        await execFileAsync('open', ['-a', 'Android Studio'], { timeout: 10_000 });
        return true;
      }
      return false;
    } catch (err: unknown) {
      logger.error('Failed to open Android Studio', { message: (err as Error).message });
      return false;
    }
  }

  // ─── State Management ────────────────────────────────────────────────────

  private setEmulatorState(state: EmulatorState): EmulatorState {
    this.emulatorState = state;
    this.emitEvent({ type: 'emulator-state-changed', state });
    return state;
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  public async cleanup(): Promise<void> {
    logger.info('AndroidDeviceService cleanup');
    this.stopLogStream();
    this.stopScreenStream();

    if (this.emulatorState.status === 'running' || this.emulatorState.status === 'starting') {
      await this.stopEmulator();
    }

    if (this.emulatorProcess && !this.emulatorProcess.killed) {
      try {
        this.emulatorProcess.kill('SIGKILL');
      } catch { /* ignore */ }
    }
  }
}

export const androidDeviceService = new AndroidDeviceService();
