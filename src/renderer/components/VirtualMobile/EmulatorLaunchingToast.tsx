import React, { useState, useEffect } from 'react';
import { Loader2, X, Smartphone, ArrowRight } from 'lucide-react';
import { useVirtualMobileStore } from '../../stores/virtualMobileStore';
import { useUiStore } from '../../stores/uiStore';

export const EmulatorLaunchingToast: React.FC = () => {
  const { emulatorState } = useVirtualMobileStore();
  const { setActiveSidebarTab } = useUiStore();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed whenever a new emulator starts
  useEffect(() => {
    if (emulatorState.status === 'starting') {
      setDismissed(false);
    }
  }, [emulatorState.status, emulatorState.avdName]);

  if (emulatorState.status !== 'starting' || dismissed) {
    return null;
  }

  const avdDisplayName = emulatorState.avdName
    ? emulatorState.avdName.replace(/_/g, ' ')
    : 'Android Emulator';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '16px',
        zIndex: 2000,
        width: '320px',
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.12)',
        overflow: 'hidden',
        animation: 'slideInFromTop 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'var(--accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Loader2
            size={18}
            color="var(--accent)"
            style={{ animation: 'spin 1s linear infinite' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Opening {avdDisplayName}...</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '2px',
              lineHeight: 1.3,
            }}
          >
            Booting emulator in background. Screen will mirror once online.
          </div>

          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActiveSidebarTab('virtual-mobile')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                fontSize: '10.5px',
                fontWeight: 500,
                color: 'var(--accent)',
                backgroundColor: 'var(--accent-bg)',
                border: '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Smartphone size={10} />
              <span>View Screen</span>
              <ArrowRight size={10} />
            </button>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
          }}
          title="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Indeterminate linear loading bar */}
      <div
        style={{
          height: '2px',
          width: '100%',
          backgroundColor: 'var(--bg-panel)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: 'var(--accent)',
            position: 'absolute',
            animation: 'indeterminate 1.4s infinite ease-in-out',
          }}
        />
      </div>
    </div>
  );
};
