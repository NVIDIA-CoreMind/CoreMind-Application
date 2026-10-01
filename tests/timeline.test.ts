import { describe, it, expect } from 'vitest';
import { buildTimeline, formatDuration } from '../src/renderer/agent/timeline';

const log = (id: string, type: string, details?: any) => ({ id, timestamp: 0, type, summary: '', details });

describe('buildTimeline', () => {
  it('pairs tool start/completion and classifies actions', () => {
    const items = buildTimeline(
      [
        log('1', 'tool.started', { tool: 'read_file', args: { path: 'a.py' } }),
        log('2', 'tool.completed', { tool: 'read_file', success: true }),
        log('3', 'tool.started', { tool: 'write_file', args: { path: 'b/main.py' } }),
        log('4', 'tool.completed', { tool: 'write_file', success: false }),
        log('5', 'command.started', { command: 'pytest' }),
        log('6', 'command.completed', { exit_code: 0 }),
      ],
      true
    );
    expect(items.map((i) => [i.verb, i.target, i.state])).toEqual([
      ['Analyzed', 'a.py', 'done'],
      ['Created', 'b/main.py', 'failed'],
      ['Ran', 'pytest', 'done'],
    ]);
  });
  it('settles running rows when the run is over', () => {
    const items = buildTimeline([log('1', 'tool.started', { tool: 'edit_file', args: { path: 'x.ts' } })], false);
    expect(items[0].state).toBe('done');
  });
  it('formats durations', () => {
    expect(formatDuration(12000)).toBe('12s');
    expect(formatDuration(75000)).toBe('1m 15s');
  });
});
