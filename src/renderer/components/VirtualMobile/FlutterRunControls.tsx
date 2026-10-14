import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Square,
  Zap,
  RotateCw,
  Terminal,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useVirtualMobileStore } from '../../stores/virtualMobileStore';

export const FlutterRunControls: React.FC = () => {
  const {
    flutterState,
    isFlutterProject,
    selectedSerial,
    flutterOutput,
    flutterRun,
    flutterHotReload,
    flutterHotRestart,
    flutterStop,
    flutterPubGet,
    clearFlutterOutput,
    isLoading,
  } = useVirtualMobileStore();

  const [mode, setMode] = useState<'debug' | 'profile' | 'release'>('debug');
  const [filterText, setFilterText] = useState('');
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  const isRunning = flutterState.status === 'running';
  const isStarting = flutterState.status === 'starting';

  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [flutterOutput]);

  const filteredOutput = filterText
    ? flutterOutput.filter((item) => item.text.toLowerCase().includes(filterText.toLowerCase()))
    : flutterOutput;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        fontSize: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Flutter Status Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={14} color="var(--accent)" />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Flutter Run</span>

          {/* Project status badge */}
          {isFlutterProject ? (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={10} /> Flutter Project
            </span>
          ) : (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <AlertCircle size={10} /> No pubspec.yaml in root
            </span>
          )}
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            disabled={isRunning || isStarting}
            style={{
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '11px',
              outline: 'none',
            }}
          >
            <option value="debug">Debug</option>
            <option value="profile">Profile</option>
            <option value="release">Release</option>
          </select>
        </div>
      </div>

      {/* Control Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {!isRunning ? (
          <>
            <button
              onClick={() => void flutterRun(selectedSerial ?? undefined, mode)}
              disabled={isStarting || !selectedSerial}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '5px',
                backgroundColor: isStarting ? 'var(--bg-hover)' : 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                fontSize: '11px',
                fontWeight: 500,
                cursor: isStarting || !selectedSerial ? 'not-allowed' : 'pointer',
                opacity: !selectedSerial ? 0.5 : 1,
              }}
            >
              <Play size={12} fill="#ffffff" />
              <span>{isStarting ? 'Starting...' : 'Run Flutter'}</span>
            </button>

            <button
              onClick={() => void flutterPubGet()}
              disabled={isLoading || isStarting}
              title="Run flutter pub get"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '5px',
                backgroundColor: 'var(--bg-panel)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: isLoading ? 'wait' : 'pointer',
              }}
            >
              <span>pub get</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => void flutterHotReload()}
              title="Hot Reload (r)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '5px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Zap size={12} />
              <span>Hot Reload</span>
            </button>

            <button
              onClick={() => void flutterHotRestart()}
              title="Hot Restart (R)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '5px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <RotateCw size={12} />
              <span>Hot Restart</span>
            </button>

            <button
              onClick={() => void flutterStop()}
              title="Stop Flutter App"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '5px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Square size={12} fill="#ef4444" />
              <span>Stop</span>
            </button>
          </>
        )}

        {/* Console Filter & Clear */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="text"
            placeholder="Filter output..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '11px',
              width: '120px',
              outline: 'none',
            }}
          />
          <button
            onClick={() => clearFlutterOutput()}
            title="Clear output console"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Output Console Window */}
      <div
        style={{
          flex: 1,
          backgroundColor: 'var(--bg-app)',
          padding: '10px 14px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.6',
          color: 'var(--text-primary)',
        }}
      >
        {filteredOutput.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280',
              gap: '8px',
            }}
          >
            <Terminal size={24} />
            <span>Flutter output stream will appear here</span>
          </div>
        ) : (
          filteredOutput.map((item) => {
            const isError = item.stream === 'stderr';
            const isReloadMsg = item.text.includes('Reloaded') || item.text.includes('Restarted');
            const color = isError ? '#f87171' : isReloadMsg ? '#fbbf24' : '#e5e7eb';

            return (
              <div
                key={item.id}
                style={{
                  color,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {item.text}
              </div>
            );
          })
        )}
        <div ref={consoleBottomRef} />
      </div>
    </div>
  );
};
