import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Setup environment mocks for Node test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

(global as any).localStorage = storageMock;
(global as any).window = (global as any).window || {};

import { useAIWorkspaceStore } from '../src/renderer/services/aiWorkspaceService';
import { agentService } from '../src/renderer/services/coremind/agent';

describe('Action Approval Required - Antigravity Developer Tool UI & Security Gating', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (global as any).localStorage.clear();
    useAIWorkspaceStore.getState().clear();
  });

  afterEach(() => {
    (global as any).localStorage.clear();
  });

  it('initially has no pendingApproval and does not execute actions preemptively', () => {
    const state = useAIWorkspaceStore.getState();
    expect(state.pendingApproval).toBeNull();
  });

  it('registers a pending action approval without executing the command', () => {
    const spyApprove = vi.spyOn(agentService, 'approveAction').mockResolvedValue({ status: 'approved' });
    const spyDeny = vi.spyOn(agentService, 'denyAction').mockResolvedValue({ status: 'denied' });

    useAIWorkspaceStore.setState({
      pendingApproval: {
        approval_id: 'appr-101',
        tool: 'terminal',
        args: {
          command: 'curl -s http://localhost:3000 2>&1',
          timeout_ms: 5000,
        },
        description: 'Execute terminal with args: {"command": "curl -s http://localhost:3000 2>&1", "timeout_ms": 5000}',
      },
    });

    // Verify it is waiting for user consent, no backend execution triggered yet
    expect(spyApprove).not.toHaveBeenCalled();
    expect(spyDeny).not.toHaveBeenCalled();

    const pending = useAIWorkspaceStore.getState().pendingApproval;
    expect(pending).not.toBeNull();
    expect(pending?.approval_id).toBe('appr-101');
    expect(pending?.tool).toBe('terminal');
    expect(pending?.args.command).toBe('curl -s http://localhost:3000 2>&1');
  });

  it('triggers approval explicitly when approveAction is invoked, clearing pending state', async () => {
    const spyApprove = vi.spyOn(agentService, 'approveAction').mockResolvedValue({ status: 'approved' });

    useAIWorkspaceStore.setState({
      agentId: 'agent-xyz',
      pendingApproval: {
        approval_id: 'appr-101',
        tool: 'terminal',
        args: { command: 'git status' },
        description: 'Run git status',
      },
    });

    const result = await useAIWorkspaceStore.getState().approveAction();

    expect(result).toBe(true);
    expect(spyApprove).toHaveBeenCalledTimes(1);
    expect(spyApprove).toHaveBeenCalledWith('appr-101', 'agent-xyz');
    expect(useAIWorkspaceStore.getState().pendingApproval).toBeNull();
  });

  it('triggers denial with optional reason when denyAction is invoked, clearing pending state', async () => {
    const spyDeny = vi.spyOn(agentService, 'denyAction').mockResolvedValue({ status: 'denied' });

    useAIWorkspaceStore.setState({
      agentId: 'agent-xyz',
      pendingApproval: {
        approval_id: 'appr-102',
        tool: 'terminal',
        args: { command: 'rm -rf ./build' },
        description: 'Delete build directory',
      },
    });

    const result = await useAIWorkspaceStore.getState().denyAction('Unsafe command');

    expect(result).toBe(true);
    expect(spyDeny).toHaveBeenCalledTimes(1);
    expect(spyDeny).toHaveBeenCalledWith('appr-102', 'agent-xyz', 'Unsafe command');
    expect(useAIWorkspaceStore.getState().pendingApproval).toBeNull();
  });

  it('handles denial without reason cleanly', async () => {
    const spyDeny = vi.spyOn(agentService, 'denyAction').mockResolvedValue({ status: 'denied' });

    useAIWorkspaceStore.setState({
      agentId: 'agent-xyz',
      pendingApproval: {
        approval_id: 'appr-103',
        tool: 'terminal',
        args: { command: 'npm publish' },
        description: 'Publish package',
      },
    });

    const result = await useAIWorkspaceStore.getState().denyAction(undefined);

    expect(result).toBe(true);
    expect(spyDeny).toHaveBeenCalledWith('appr-103', 'agent-xyz', undefined);
    expect(useAIWorkspaceStore.getState().pendingApproval).toBeNull();
  });
});
