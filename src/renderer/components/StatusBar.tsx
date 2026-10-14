import React from 'react';
import { GitBranch, XCircle, AlertTriangle, Settings, Radio, Smartphone, Loader2 } from 'lucide-react';
import { useTabsStore } from '../stores/tabsStore';
import { useEditorStore } from '../stores/editorStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useUiStore } from '../stores/uiStore';
import { useBackendStore } from '../stores/backendStore';
import { useAgentStore } from '../stores/agentStore';
import { useVirtualMobileStore } from '../stores/virtualMobileStore';

export const StatusBar: React.FC = () => {
  const { tabs, activeTabId } = useTabsStore();
  const { cursorPosition } = useEditorStore();
  const { rootName } = useWorkspaceStore();
  const { setActiveSidebarTab, setDevicePickerOpen } = useUiStore();
  const { isHealthy, wsStatus, httpUrl, reconnect, checkHealth } = useBackendStore();
  const { selectedModel, tokenUsage } = useAgentStore();
  const { devices, selectedSerial, emulatorState } = useVirtualMobileStore();

  const selectedDevice = devices.find((d) => d.serial === selectedSerial);
  const activeDeviceLabel = emulatorState.status === 'starting'
    ? 'Emulator: Starting...'
    : emulatorState.status === 'running'
    ? `AVD: ${emulatorState.avdName ?? 'Running'}`
    : selectedDevice
    ? selectedDevice.name
    : devices.length > 0
    ? `${devices.length} Device${devices.length > 1 ? 's' : ''}`
    : 'No Device';

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Backend connection state mapping
  const isConnected = isHealthy || wsStatus === 'connected';
  const isConnecting = !isConnected && (wsStatus === 'connecting' || wsStatus === 'reconnecting');

  const statusColor = isConnected ? 'var(--success)' : isConnecting ? 'var(--warning)' : 'var(--error)';
  const statusLabel = isConnected
    ? 'CoreMind: Connected'
    : isConnecting
    ? 'CoreMind: Connecting...'
    : 'CoreMind: Offline';

  return (
    <div
      style={{
        height: '22px',
        backgroundColor: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        zIndex: 50,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Left: Branch & Errors / Warnings & Backend Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <GitBranch size={11} color="var(--text-secondary)" />
          <span style={{ color: 'var(--text-primary)' }}>main*</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <XCircle size={11} color="var(--text-secondary)" />
            <span>0</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <AlertTriangle size={11} color="var(--text-secondary)" />
            <span>0</span>
          </span>
        </div>

        {rootName && (
          <span style={{ color: 'var(--text-muted)' }}>• {rootName}</span>
        )}

        {/* Backend Connectivity Indicator */}
        <div
          onClick={() => {
            if (!isConnected) {
              reconnect();
              checkHealth();
            } else {
              setActiveSidebarTab('settings');
            }
          }}
          title={`Backend: ${httpUrl} | WebSocket: ${wsStatus} (Click to ${isConnected ? 'view settings' : 'reconnect'})`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              display: 'inline-block',
            }}
          />
          <span style={{ color: isConnected ? 'var(--text-primary)' : statusColor, fontSize: '10.5px', fontWeight: 500 }}>
            {statusLabel}
          </span>
        </div>

        {/* Virtual Mobile Device Status Indicator */}
        <div
          onClick={() => {
            if (emulatorState.status === 'starting') {
              setActiveSidebarTab('virtual-mobile');
            } else {
              setDevicePickerOpen(true);
            }
          }}
          title={
            emulatorState.status === 'starting'
              ? `Opening ${emulatorState.avdName || 'emulator'} (Click to view screen)`
              : `Target Device: ${activeDeviceLabel} (Click to open Target & Emulator selector)`
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            padding: '1px 7px',
            borderRadius: '4px',
            backgroundColor: emulatorState.status === 'starting' ? 'var(--accent-bg)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${emulatorState.status === 'starting' ? 'var(--accent)' : 'transparent'}`,
            transition: 'all 0.2s ease',
          }}
        >
          {emulatorState.status === 'starting' ? (
            <Loader2
              size={11}
              color="var(--accent)"
              style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
            />
          ) : (
            <Smartphone size={11} color="var(--accent)" />
          )}
          <span
            style={{
              color: emulatorState.status === 'starting' ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '10.5px',
              fontWeight: emulatorState.status === 'starting' ? 600 : 400,
            }}
          >
            {emulatorState.status === 'starting'
              ? `Opening ${emulatorState.avdName ? emulatorState.avdName.replace(/_/g, ' ') : 'Emulator'}...`
              : activeDeviceLabel}
          </span>
        </div>
      </div>

      {/* Right: Language, Line/Col, Encoding, Model, Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {tokenUsage && (
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }} title={`Prompt: ${tokenUsage.prompt_tokens} | Completion: ${tokenUsage.completion_tokens}`}>
            {tokenUsage.total_tokens.toLocaleString()} tokens
          </span>
        )}

        <div
          onClick={() => setActiveSidebarTab('settings')}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
          title={`Active AI Model: ${selectedModel}`}
        >
          <Radio size={10} color="var(--accent)" />
          <span style={{ fontSize: '10.5px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedModel.split('/').pop()}
          </span>
        </div>

        {activeTab ? (
          <>
            <span>
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span style={{ textTransform: 'capitalize' }}>{activeTab.language}</span>
          </>
        ) : (
          <>
            <span>UTF-8</span>
            <span>Spaces: 2</span>
          </>
        )}
        <button
          onClick={() => setActiveSidebarTab('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#9ca3af',
            background: 'transparent',
            border: 'none',
            padding: '0',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#e5e7eb')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
        >
          <Settings size={11} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};
