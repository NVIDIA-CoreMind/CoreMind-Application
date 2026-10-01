import type { ActivityLogItem } from '../stores/agentStore';

export type TimelineKind = 'analyze' | 'create' | 'edit' | 'delete' | 'command' | 'verify' | 'question' | 'tool';

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  verb: string;
  target?: string;
  /** Workspace file the row refers to; rows with this are clickable. */
  filePath?: string;
  state: 'running' | 'done' | 'failed';
  detail?: string;
}

const PATH_KEYS = ['path', 'file_path', 'filepath', 'file', 'filename', 'target_file', 'directory', 'dir'];

function classifyTool(tool: string): { kind: TimelineKind; verb: string } {
  if (/delete|remove/i.test(tool)) return { kind: 'delete', verb: 'Deleted' };
  if (/read|view|list|search|grep|find|glob|tree|stat|analy/i.test(tool)) return { kind: 'analyze', verb: 'Analyzed' };
  if (/edit|replace|patch|update|modify|append|insert/i.test(tool)) return { kind: 'edit', verb: 'Edited' };
  if (/write|create|mkdir|make/i.test(tool)) return { kind: 'create', verb: 'Created' };
  if (/run|shell|exec|command|terminal|bash/i.test(tool)) return { kind: 'command', verb: 'Ran' };
  return { kind: 'tool', verb: tool.replace(/_/g, ' ') };
}

function argTarget(args: Record<string, unknown> | undefined): { target?: string; filePath?: string } {
  if (!args) return {};
  for (const key of PATH_KEYS) {
    const value = args[key];
    if (typeof value === 'string' && value) return { target: value, filePath: value };
  }
  for (const key of ['command', 'query', 'pattern']) {
    const value = args[key];
    if (typeof value === 'string' && value) return { target: value };
  }
  return {};
}

// Turns the raw activity stream into compact, Antigravity-style step rows.
export function buildTimeline(logs: ActivityLogItem[], running: boolean): TimelineItem[] {
  const items: TimelineItem[] = [];
  const openTools: TimelineItem[] = [];

  for (const log of logs) {
    switch (log.type) {
      case 'tool.started': {
        const tool = String(log.details?.tool ?? 'tool');
        const { kind, verb } = classifyTool(tool);
        const item: TimelineItem = {
          id: log.id,
          kind,
          verb,
          ...argTarget(log.details?.args),
          state: 'running',
        };
        items.push(item);
        openTools.push(item);
        break;
      }
      case 'tool.completed': {
        const idx = openTools.findIndex((t) => t.state === 'running');
        const item = idx >= 0 ? openTools.splice(idx, 1)[0] : undefined;
        if (item) item.state = log.details?.success === false ? 'failed' : 'done';
        break;
      }
      case 'command.started':
        items.push({
          id: log.id,
          kind: 'command',
          verb: 'Ran',
          target: String(log.details?.command ?? ''),
          state: 'running',
        });
        break;
      case 'command.completed': {
        const last = [...items].reverse().find((i) => i.kind === 'command' && i.state === 'running');
        if (last) {
          last.state = log.details?.exit_code === 0 || log.details?.exit_code === undefined ? 'done' : 'failed';
          last.detail = `exit code ${log.details?.exit_code ?? 0}`;
        }
        break;
      }
      case 'verification.started':
        items.push({ id: log.id, kind: 'verify', verb: 'Verifying changes', state: 'running' });
        break;
      case 'verification.passed':
      case 'verification.failed': {
        const last = [...items].reverse().find((i) => i.kind === 'verify' && i.state === 'running');
        const ok = log.type === 'verification.passed';
        if (last) {
          last.state = ok ? 'done' : 'failed';
          last.verb = ok ? 'Verified changes' : 'Verification failed, fixing';
        }
        break;
      }
      case 'agent.waiting_for_user':
        items.push({ id: log.id, kind: 'question', verb: 'Waiting for your input', state: 'running' });
        break;
    }
  }

  if (!running) {
    for (const item of items) if (item.state === 'running') item.state = 'done';
  }
  return items;
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
