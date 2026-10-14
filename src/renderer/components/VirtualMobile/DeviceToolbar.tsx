import React from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Camera,
  Smartphone,
  Eye,
  EyeOff,
  Zap,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { useVirtualMobileStore } from '../../stores/virtualMobileStore';

export const DeviceToolbar: React.FC = () => {
  const {
    devices,
    avds,
    selectedSerial,
    selectedAvd,
    emulatorState,
    flutterState,
    isLoading,
    isCapturingScreenshot,
    isAutoRefreshScreenshot,
    selectDevice,
    selectAvd,
    refresh,
    startEmulator,
    stopEmulator,
    takeScreenshot,
    toggleAutoRefreshScreenshot,
    flutterHotReload,
    flutterHotRestart,
  } = useVirtualMobileStore();

  const isEmulatorRunning = emulatorState.status === 'running';
  const isEmulatorStarting = emulatorState.status === 'starting';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '12px',
      }}
    >
      {/* Device & AVD Selectors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: '220px' }}>
        <Smartphone size={14} color="var(--accent)" />

        {/* AVD / Device Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '140px' }}>
          <select
            value={selectedSerial || (selectedAvd ? `avd:${selectedAvd}` : '')}
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('avd:')) {
                const avdName = val.replace('avd:', '');
                selectAvd(avdName);
              } else {
                selectDevice(val || null);
                // Also sync AVD if device has avdName
                const dev = devices.find((d) => d.serial === val);
                if (dev?.avdName) {
                  selectAvd(dev.avdName);
                }
              }
            }}
            disabled={isLoading || isEmulatorStarting}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {devices.length === 0 && avds.length === 0 && (
              <option value="">No devices or AVDs detected</option>
            )}

            {devices.length > 0 && (
              <optgroup label="Running Devices">
                {devices.map((d) => (
                  <option key={d.serial} value={d.serial}>
                    {d.name} ({d.serial}) {d.isOnline ? '🟢' : '⚪'}
                  </option>
                ))}
              </optgroup>
            )}

            {avds.length > 0 && (
              <optgroup label="Available Emulators (AVDs)">
                {avds.map((a) => (
                  <option key={a.name} value={`avd:${a.name}`}>
                    {a.name} {a.apiLevel ? `(API ${a.apiLevel})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Refresh Devices Button */}
        <button
          onClick={() => void refresh()}
          disabled={isLoading}
          title="Refresh connected devices & AVDs"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: isLoading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '4px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Emulator Launch / Stop Button */}
        {isEmulatorRunning ? (
          <button
            onClick={() => void stopEmulator()}
            disabled={isLoading}
            title="Stop Android Emulator"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <Square size={11} fill="#ef4444" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={() => void startEmulator()}
            disabled={isLoading || isEmulatorStarting || (!selectedAvd && avds.length === 0)}
            title={isEmulatorStarting ? 'Emulator opening...' : 'Start Android Emulator'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: isEmulatorStarting ? 'var(--bg-hover)' : 'var(--accent)',
              color: isEmulatorStarting ? 'var(--accent)' : '#ffffff',
              border: isEmulatorStarting ? '1px solid var(--accent)' : 'none',
              fontSize: '11px',
              cursor: isEmulatorStarting ? 'wait' : 'pointer',
              fontWeight: 500,
              opacity: !selectedAvd && avds.length === 0 ? 0.5 : 1,
            }}
          >
            {isEmulatorStarting ? (
              <Loader2 size={11} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Play size={11} fill="#ffffff" />
            )}
            <span>{isEmulatorStarting ? 'Opening...' : 'Start'}</span>
          </button>
        )}

        {/* Hot Reload / Restart if Flutter is running */}
        {flutterState.status === 'running' && (
          <>
            <button
              onClick={() => void flutterHotReload()}
              title="Flutter Hot Reload (r)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 7px',
                borderRadius: '4px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                color: '#eab308',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              <Zap size={11} />
              <span>Reload</span>
            </button>
            <button
              onClick={() => void flutterHotRestart()}
              title="Flutter Hot Restart (R)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 7px',
                borderRadius: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              <RotateCw size={11} />
            </button>
          </>
        )}

        {/* Screenshot capture */}
        <button
          onClick={() => void takeScreenshot()}
          disabled={!selectedSerial || isCapturingScreenshot}
          title="Take device screenshot"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-panel)',
            color: selectedSerial ? 'var(--text-primary)' : 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            fontSize: '11px',
            cursor: selectedSerial ? 'pointer' : 'not-allowed',
          }}
        >
          <Camera size={12} />
        </button>

        {/* Auto Refresh Stream Toggle */}
        <button
          onClick={() => toggleAutoRefreshScreenshot()}
          disabled={!selectedSerial}
          title={isAutoRefreshScreenshot ? 'Pause preview refresh' : 'Enable live preview refresh'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 6px',
            borderRadius: '4px',
            backgroundColor: isAutoRefreshScreenshot ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-panel)',
            color: isAutoRefreshScreenshot ? '#22c55e' : 'var(--text-muted)',
            border: isAutoRefreshScreenshot ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color)',
            fontSize: '10px',
            cursor: selectedSerial ? 'pointer' : 'not-allowed',
          }}
        >
          {isAutoRefreshScreenshot ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>Live</span>
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
