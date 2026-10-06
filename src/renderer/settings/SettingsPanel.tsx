import React, { useEffect } from 'react';
import {
  Monitor,
  Code,
} from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { useBackendStore } from '../stores/backendStore';
import { isMacClient, isWindowsClient } from '../../shared/utils/shortcuts';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings } = useEditorStore();
  const {
    serviceInfo,
    safeSettings,
    fetchSettings,
  } = useBackendStore();

  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : isWindowsClient();
  const platformLabel = isMac ? 'macOS (Apple Silicon arm64)' : isWindows ? 'Windows (x64)' : 'Linux';

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '35px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Settings
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* 1. Editor Settings */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-primary)' }}>
            <Code size={15} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Editor</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
            {/* Font Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Font Size</span>
              <select
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                style={{ width: '80px' }}
              >
                <option value={12}>12 px</option>
                <option value={13}>13 px</option>
                <option value={14}>14 px</option>
                <option value={15}>15 px</option>
                <option value={16}>16 px</option>
                <option value={18}>18 px</option>
              </select>
            </div>

            {/* Tab Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tab Size</span>
              <select
                value={settings.tabSize}
                onChange={(e) => updateSettings({ tabSize: Number(e.target.value) })}
                style={{ width: '80px' }}
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
            </div>

            {/* Minimap */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Minimap</span>
              <input
                type="checkbox"
                checked={settings.minimap}
                onChange={(e) => updateSettings({ minimap: e.target.checked })}
                style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Word Wrap */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Word Wrap</span>
              <select
                value={settings.wordWrap}
                onChange={(e) => updateSettings({ wordWrap: e.target.value as 'on' | 'off' })}
                style={{ width: '80px' }}
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Appearance & System */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-primary)' }}>
            <Monitor size={15} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>System & Runtime</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '11px',
              backgroundColor: 'var(--bg-panel)',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Version:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>0.1.0</span>
            </div>
            {serviceInfo && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Backend Service:</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                  {serviceInfo.service} v{serviceInfo.version}
                </span>
              </div>
            )}
            {safeSettings && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Backend AI Model:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {safeSettings.model}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Max Steps / Timeout:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {safeSettings.max_agent_steps} steps ({safeSettings.command_timeout_ms / 1000}s)
                  </span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Platform:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{platformLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
