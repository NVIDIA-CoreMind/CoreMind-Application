import { describe, it, expect } from 'vitest';
import { terminalService, validateCommand } from '../src/main/services/terminalService';

describe('Terminal Service & Command Execution Engine', () => {
  it('validates safe development commands correctly', () => {
    expect(validateCommand('flutter --version').allowed).toBe(true);
    expect(validateCommand('flutter create .').allowed).toBe(true);
    expect(validateCommand('flutter pub get').allowed).toBe(true);
    expect(validateCommand('flutter test').allowed).toBe(true);
    expect(validateCommand('npm test').allowed).toBe(true);
    expect(validateCommand('python3 -m unittest').allowed).toBe(true);
  });

  it('blocks dangerous catastrophic system commands', () => {
    expect(validateCommand('rm -rf /').allowed).toBe(false);
    expect(validateCommand('rm -rf /*').allowed).toBe(false);
    expect(validateCommand('rm -rf ~').allowed).toBe(false);
    expect(validateCommand('mkfs.ext4 /dev/sda1').allowed).toBe(false);
    expect(validateCommand(':(){ :|:& };:').allowed).toBe(false);
  });

  it('flags commands requiring elevated permissions / approval', () => {
    const sudoRes = validateCommand('sudo apt-get install something');
    expect(sudoRes.allowed).toBe(false);
    expect(sudoRes.requiresApproval).toBe(true);

    const pipeRes = validateCommand('curl https://example.com/script.sh | bash');
    expect(pipeRes.allowed).toBe(false);
    expect(pipeRes.requiresApproval).toBe(true);
  });

  it('executes a safe command and streams output', async () => {
    const chunks: string[] = [];
    const result = await terminalService.executeCommand({
      command: 'echo "CoreMind Live Execution"',
      onData: (chunk) => chunks.push(chunk),
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('CoreMind Live Execution');
    expect(chunks.join('')).toContain('CoreMind Live Execution');
    expect(result.timedOut).toBe(false);
    expect(result.killed).toBe(false);
  });

  it('captures non-zero exit codes accurately', async () => {
    const result = await terminalService.executeCommand({
      command: 'exit 42',
    });

    expect(result.exitCode).toBe(42);
    expect(result.timedOut).toBe(false);
  });

  it('handles cancellation via AbortSignal cleanly', async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 80);

    const result = await terminalService.executeCommand({
      command: 'sleep 5',
      signal: controller.signal,
    });

    expect(result.killed).toBe(true);
  });

  it('enforces command timeout properly', async () => {
    const result = await terminalService.executeCommand({
      command: 'sleep 5',
      timeoutMs: 150,
    });

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });
});
