import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Search,
  Trash2,
  ArrowDownCircle,
  Filter,
} from 'lucide-react';
import { useVirtualMobileStore } from '../../stores/virtualMobileStore';
import type { LogLevel } from '../../../shared/types/virtualMobile';

export const DeviceLogsViewer: React.FC = () => {
  const { deviceLogs, clearLogs, selectedSerial } = useVirtualMobileStore();

  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deviceLogs, autoScroll]);

  const filteredLogs = deviceLogs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (tagFilter) {
      const q = tagFilter.toLowerCase();
      const matchTag = log.tag.toLowerCase().includes(q);
      const matchMsg = log.message.toLowerCase().includes(q);
      if (!matchTag && !matchMsg) return false;
    }
    return true;
  });

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error':
      case 'fatal':
        return '#ef4444';
      case 'warning':
        return '#eab308';
      case 'info':
        return '#3b82f6';
      case 'debug':
        return '#10b981';
      case 'verbose':
      default:
        return '#9ca3af';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        fontSize: '11px',
        overflow: 'hidden',
      }}
    >
      {/* Logcat Header & Filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={14} color="var(--accent)" />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Logcat</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            ({filteredLogs.length} logs)
          </span>
        </div>

        {/* Level filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
          <Filter size={11} color="var(--text-muted)" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10.5px',
              outline: 'none',
            }}
          >
            <option value="all">All Levels</option>
            <option value="verbose">Verbose</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={11} color="var(--text-muted)" style={{ position: 'absolute', left: '6px' }} />
          <input
            type="text"
            placeholder="Search logs/tags..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '2px 6px 2px 22px',
              fontSize: '10.5px',
              width: '130px',
              outline: 'none',
            }}
          />
        </div>

        {/* Auto scroll toggle */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          style={{
            background: 'transparent',
            border: 'none',
            color: autoScroll ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <ArrowDownCircle size={13} />
        </button>

        {/* Clear logs */}
        <button
          onClick={() => clearLogs()}
          title="Clear logcat buffer"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Logs Table / List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#070a10',
          fontFamily: 'monospace',
          lineHeight: '1.5',
          padding: '6px',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280',
              gap: '6px',
            }}
          >
            <FileText size={20} />
            <span>{selectedSerial ? 'Waiting for device logcat events...' : 'No active device selected.'}</span>
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            const levelColor = getLevelColor(log.level);

            return (
              <div
                key={`${log.timestamp}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                }}
              >
                {/* Time */}
                <span style={{ color: '#6b7280', flexShrink: 0, fontSize: '10px' }}>{timeStr}</span>

                {/* Level Pill */}
                <span
                  style={{
                    backgroundColor: `${levelColor}22`,
                    color: levelColor,
                    padding: '0 4px',
                    borderRadius: '3px',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  {log.level[0]}
                </span>

                {/* Tag */}
                <span
                  style={{
                    color: '#93c5fd',
                    fontWeight: 500,
                    flexShrink: 0,
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={log.tag}
                >
                  {log.tag}
                </span>

                {/* Message */}
                <span
                  style={{
                    color: levelColor === '#ef4444' ? '#fca5a5' : '#e5e7eb',
                    wordBreak: 'break-word',
                    flex: 1,
                  }}
                >
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
