import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  FilePlus2,
  FilePen,
  HelpCircle,
  Loader2,
  ShieldCheck,
  Terminal,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { FileIcon } from '../components/FileIcon';
import { baseName } from '../services/fileIcons';
import { resolveWorkspacePath } from '../services/aiChanges';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { buildTimeline, formatDuration, TimelineItem, TimelineKind } from './timeline';

const KIND_ICON: Record<TimelineKind, React.ReactNode> = {
  analyze: <Eye size={12} />,
  create: <FilePlus2 size={12} />,
  edit: <FilePen size={12} />,
  delete: <Trash2 size={12} />,
  command: <Terminal size={12} />,
  verify: <ShieldCheck size={12} />,
  question: <HelpCircle size={12} />,
  tool: <Wrench size={12} />,
};

const STAGE_LABEL: Record<string, string> = {
  analyzing: 'Analyzing the request and project context',
  planning: 'Planning the approach',
  executing: 'Working on the plan',
  observing: 'Reviewing results',
  verifying: 'Verifying changes',
  fixing: 'Fixing issues found during verification',
};

const sectionLabel: React.CSSProperties = {
  fontSize: '10.5px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  margin: '8px 0 4px',
};

function useNow(active: boolean): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

const StepIcon: React.FC<{ item: TimelineItem }> = ({ item }) => {
  if (item.state === 'running') return <Loader2 size={12} color="#10B981" className="animate-spin" />;
  if (item.state === 'failed') return <AlertTriangle size={12} color="#EF4444" />;
  return <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{KIND_ICON[item.kind]}</span>;
};

export const AgentTimeline: React.FC = () => {
  const activityLogs = useAgentStore((s) => s.activityLogs);
  const taskGraph = useAgentStore((s) => s.taskGraph);
  const lifecycleStage = useAgentStore((s) => s.lifecycleStage);
  const isLoading = useAgentStore((s) => s.isLoading);
  const steps = useAgentStore((s) => s.steps);
  const runStartedAt = useAgentStore((s) => s.runStartedAt);
  const runEndedAt = useAgentStore((s) => s.runEndedAt);
  const openChange = useAgentStore((s) => s.openChange);
  const trackedChanges = useAgentStore((s) => s.trackedChanges);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const now = useNow(isLoading);

  const items = buildTimeline(activityLogs, isLoading);
  const tasks = taskGraph?.tasks || taskGraph?.nodes || [];
  if (!isLoading && items.length === 0 && tasks.length === 0) return null;

  // Expanded while working, collapsed to a one-line summary once finished (user can toggle either way).
  const isCollapsed = collapsed ?? !isLoading;
  const elapsed = runStartedAt ? formatDuration((runEndedAt ?? now) - runStartedAt) : '';
  const failed = lifecycleStage === 'failed';
  const title = isLoading
    ? `Thinking${elapsed ? ` for ${elapsed}` : ''}…`
    : failed
    ? `Stopped after ${elapsed}`
    : `Thought for ${elapsed}`;

  const openFile = (filePath?: string) => {
    const resolved = filePath ? resolveWorkspacePath(filePath, rootPath) : null;
    if (resolved && trackedChanges[resolved.path]) void openChange(resolved.path);
  };

  return (
    <div style={{ borderLeft: '2px solid var(--ov-8)', paddingLeft: '10px' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(!isCollapsed)}
        onKeyDown={(e) => e.key === 'Enter' && setCollapsed(!isCollapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          color: isLoading ? '#10B981' : 'var(--text-secondary)',
        }}
      >
        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        {isLoading && <Loader2 size={12} className="animate-spin" />}
        <span>{title}</span>
        {steps && isLoading && (
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            step {steps.current}/{steps.max}
          </span>
        )}
      </div>

      {!isCollapsed && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-body)' }}>
          {isLoading && (
            <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>
              {STAGE_LABEL[lifecycleStage] ?? 'Thinking'}…
            </div>
          )}

          {tasks.length > 0 && (
            <>
              <div style={sectionLabel}>
                Plan · {tasks.filter((t) => t.status === 'completed').length}/{tasks.length}
              </div>
              {tasks.map((task) => {
                const done = task.status === 'completed';
                const running = task.status === 'in_progress';
                return (
                  <div key={task.id} style={{ display: 'flex', gap: '7px', padding: '2px 0', alignItems: 'flex-start' }}>
                    <span style={{ marginTop: '3px', display: 'flex' }}>
                      {done ? (
                        <Check size={12} color="#10B981" />
                      ) : running ? (
                        <Loader2 size={12} color="#10B981" className="animate-spin" />
                      ) : task.status === 'failed' ? (
                        <AlertTriangle size={12} color="#EF4444" />
                      ) : (
                        <span style={{ width: 10, height: 10, border: '1px solid var(--text-faint)', borderRadius: '50%', margin: '1px' }} />
                      )}
                    </span>
                    <span style={{ color: done ? 'var(--text-secondary)' : running ? 'var(--text-primary)' : 'var(--text-body)' }}>{task.title}</span>
                  </div>
                );
              })}
            </>
          )}

          {items.length > 0 && <div style={sectionLabel}>Progress</div>}
          {items.map((item) => {
            const clickable = item.filePath && resolveWorkspacePath(item.filePath, rootPath) && trackedChanges[resolveWorkspacePath(item.filePath, rootPath)!.path];
            return (
              <div
                key={item.id}
                onClick={clickable ? () => openFile(item.filePath) : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '2px 0',
                  cursor: clickable ? 'pointer' : 'default',
                  minWidth: 0,
                }}
              >
                <StepIcon item={item} />
                <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{item.verb}</span>
                {item.target && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      minWidth: 0,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--ov-5)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.target}
                  >
                    {item.filePath && <FileIcon path={item.filePath} size={12} />}
                    {item.filePath ? baseName(item.target) : item.target}
                  </span>
                )}
                {item.detail && <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.detail}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
