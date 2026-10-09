import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { executionEngine, ExecutionEngine } from '../src/main/services/executionEngine';
import { AgentStreamEvent } from '../src/shared/types/ipc';

describe('Autonomous Execution Engine', () => {
  let tempWorkspace: string;

  beforeEach(async () => {
    tempWorkspace = await fs.mkdtemp(path.join(process.cwd(), '.coremind-exec-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempWorkspace, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('immediately produces short natural-language explanation without planning screen', () => {
    const engine = new ExecutionEngine();
    const flutterExplanation = engine.getInitialExplanation(
      'Create a Flutter login page with validation, run the tests, and fix any errors.'
    );

    expect(flutterExplanation).toBe(
      "I'll check your Flutter environment, set up the project if needed, implement the login page with validation, and run the tests."
    );
    // Verifies it does not output a planning checklist or approval screen
    expect(flutterExplanation.toLowerCase()).not.toContain('plan:');
    expect(flutterExplanation.toLowerCase()).not.toContain('checklist');
    expect(flutterExplanation.toLowerCase()).not.toContain('step 1 of');
  });

  it('runs complete autonomous execution loop: inspect -> setup -> generate -> create files -> summary', async () => {
    const events: AgentStreamEvent[] = [];

    const summary = await executionEngine.runTask(
      {
        prompt: 'Create a Flutter login page with validation, run the tests, and fix any errors.',
        workspacePath: tempWorkspace,
      },
      {
        onEvent: (ev) => events.push(ev),
      }
    );

    // Verify explanation was emitted first
    const explanationEvent = events.find((e) => e.type === 'explanation');
    expect(explanationEvent).toBeDefined();
    if (explanationEvent?.type === 'explanation') {
      expect(explanationEvent.text).toContain("I'll check your Flutter environment");
    }

    // Verify status events streamed
    const statusEvents = events.filter((e) => e.type === 'status');
    expect(statusEvents.length).toBeGreaterThan(0);

    // Verify actual files were created on disk in workspace
    const loginScreenPath = path.join(tempWorkspace, 'lib/screens/login_screen.dart');
    const mainDartPath = path.join(tempWorkspace, 'lib/main.dart');
    const testPath = path.join(tempWorkspace, 'test/login_screen_test.dart');

    const loginContent = await fs.readFile(loginScreenPath, 'utf-8');
    expect(loginContent).toContain('class LoginScreen extends StatefulWidget');
    expect(loginContent).toContain('emailRegex');
    expect(loginContent).toContain('_validateEmail');
    expect(loginContent).toContain('_validatePassword');
    expect(loginContent).toContain('Password must be at least 6 characters');

    const mainContent = await fs.readFile(mainDartPath, 'utf-8');
    expect(mainContent).toContain('void main()');
    expect(mainContent).toContain('MaterialApp');

    const testContent = await fs.readFile(testPath, 'utf-8');
    expect(testContent).toContain('testWidgets');
    expect(testContent).toContain('renders email and password fields');

    // Verify file_change events were emitted in real-time
    const fileChangeEvents = events.filter((e) => e.type === 'file_change');
    expect(fileChangeEvents.length).toBeGreaterThanOrEqual(3);

    // Verify final summary
    expect(summary.filesChanged.length).toBeGreaterThanOrEqual(3);
    expect(summary.implemented).toContain('Flutter login page');
    expect(summary.commandsExecuted).toBeDefined();
  });

  it('detects existing projects and avoids unnecessary project recreation', async () => {
    // Pre-create existing pubspec.yaml with custom configuration
    await fs.writeFile(
      path.join(tempWorkspace, 'pubspec.yaml'),
      'name: existing_project\nversion: 2.0.0\n',
      'utf-8'
    );

    const events: AgentStreamEvent[] = [];
    await executionEngine.runTask(
      {
        prompt: 'Create a Flutter login page with validation, run the tests, and fix any errors.',
        workspacePath: tempWorkspace,
      },
      {
        onEvent: (ev) => events.push(ev),
      }
    );

    // Verify pubspec was preserved and existing project was detected
    const currentPubspec = await fs.readFile(path.join(tempWorkspace, 'pubspec.yaml'), 'utf-8');
    expect(currentPubspec).toContain('existing_project');

    const statusTexts = events
      .filter((e) => e.type === 'status')
      .map((e) => (e as any).text);
    expect(
      statusTexts.some((text: string) => text.includes('Existing Flutter project detected'))
    ).toBe(true);
  });

  it('handles cancellation gracefully via AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      executionEngine.runTask(
        {
          prompt: 'Create a Flutter login page with validation',
          workspacePath: tempWorkspace,
        },
        {
          signal: controller.signal,
        }
      )
    ).rejects.toThrow();
  });
});
