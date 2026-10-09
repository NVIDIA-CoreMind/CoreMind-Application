import React, { useEffect, useRef, useState } from 'react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { ActivityItem } from './ActivityItem';
import { Activity, Wrench, FileCode, Terminal, ShieldCheck } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export const ActivityTimeline: React.FC = () => {
  const { events } = useAIWorkspaceStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'tools' | 'files' | 'terminal' | 'tests'>('all');
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'tools') return e.type === 'ToolCallEvent';
    if (filter === 'files') return e.type === 'FileReadEvent' || e.type === 'FileChangedEvent' || e.type === 'DiffCreatedEvent' || e.type === 'FileExploredEvent';
    if (filter === 'terminal') return e.type === 'TerminalEvent';
    if (filter === 'tests') return e.type === 'TestEvent';
    return true;
  });

  if (events.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '32px 16px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          fontSize: '13px',
        }}
      >
        <Activity size={36} style={{ opacity: 0.35, marginBottom: '12px' }} />
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          No Live Activity Yet
        </div>
        <div style={{ maxWidth: '280px', lineHeight: 1.5 }}>
          When the AI agent begins understanding requests, exploring workspaces, running tools, editing files, or running tests, live events will stream here.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Event Filters Bar */}
      <div
        style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.15)' : '#F8FAFC',
          flexShrink: 0,
        }}
      >
        {(
          [
            { id: 'all', label: 'All', icon: <Activity size={12} /> },
            { id: 'tools', label: 'Tools', icon: <Wrench size={12} /> },
            { id: 'files', label: 'Files', icon: <FileCode size={12} /> },
            { id: 'terminal', label: 'Terminal', icon: <Terminal size={12} /> },
            { id: 'tests', label: 'Tests', icon: <ShieldCheck size={12} /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              backgroundColor:
                filter === tab.id
                  ? isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : '#FFFFFF'
                  : 'transparent',
              color: filter === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: filter === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 0 24px',
        }}
      >
        {filteredEvents.map((event) => (
          <ActivityItem key={event.id} event={event} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
