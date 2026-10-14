import React, { useEffect } from 'react';
import {
  Smartphone,
  Layers,
  FileText,
  Settings,
} from 'lucide-react';
import { useVirtualMobileStore } from '../../stores/virtualMobileStore';
import { DeviceToolbar } from './DeviceToolbar';
import { DeviceScreenPreview } from './DeviceScreenPreview';
import { FlutterRunControls } from './FlutterRunControls';
import { DeviceLogsViewer } from './DeviceLogsViewer';
import { SdkSetupGuide } from './SdkSetupGuide';

export const VirtualMobilePanel: React.FC = () => {
  const { init, activeTab, setActiveTab, isFlutterProject, devices } = useVirtualMobileStore();

  useEffect(() => {
    void init();
  }, [init]);

  const tabs: Array<{ id: typeof activeTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'preview', label: 'Preview', icon: <Smartphone size={13} />, badge: devices.length > 0 ? devices.length : undefined },
    { id: 'flutter', label: 'Flutter', icon: <Layers size={13} />, badge: isFlutterProject ? 'Active' : undefined },
    { id: 'logs', label: 'Logcat', icon: <FileText size={13} /> },
    { id: 'setup', label: 'Setup', icon: <Settings size={13} /> },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-panel)',
        overflow: 'hidden',
        color: 'var(--text-primary)',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={15} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Virtual Mobile Device
          </span>
        </div>
      </div>

      {/* Device Toolbar (only shown in Preview mode or always at top) */}
      <DeviceToolbar />

      {/* Sub Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '4px 8px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: isActive ? 'var(--bg-panel)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'preview' && <DeviceScreenPreview />}
        {activeTab === 'flutter' && <FlutterRunControls />}
        {activeTab === 'logs' && <DeviceLogsViewer />}
        {activeTab === 'setup' && <SdkSetupGuide />}
      </div>
    </div>
  );
};
