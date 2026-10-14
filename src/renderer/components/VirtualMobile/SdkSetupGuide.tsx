import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Terminal,
  RefreshCw,
  Cpu,
  ExternalLink,
} from 'lucide-react';
import { useVirtualMobileStore } from '../../stores/virtualMobileStore';

export const SdkSetupGuide: React.FC = () => {
  const { sdkStatus, flutterSdkStatus, refresh, isLoading, openAndroidStudio } = useVirtualMobileStore();

  const isAndroidFound = sdkStatus?.found ?? false;
  const isFlutterFound = flutterSdkStatus?.found ?? false;
  const isStudioFound = sdkStatus?.androidStudioInstalled ?? false;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        padding: '16px',
        overflowY: 'auto',
        fontSize: '12px',
        gap: '16px',
      }}
    >
      {/* Title & Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={16} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
            Mobile SDK Diagnostics
          </span>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={11} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Re-scan</span>
        </button>
      </div>

      {/* Android Studio Status Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Android Studio</span>
          {isStudioFound ? (
            <span
              style={{
                fontSize: '10.5px',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={12} /> Installed
            </span>
          ) : (
            <span
              style={{
                fontSize: '10.5px',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <XCircle size={12} /> Not Found in Applications
            </span>
          )}
        </div>

        {isStudioFound ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {sdkStatus?.androidStudioPath ?? '/Applications/Android Studio.app'}
            </span>
            <button
              onClick={() => void openAndroidStudio()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '10.5px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <span>Open Device Manager</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Android Studio provides the official Android emulator and Device Manager to create virtual devices.
            </span>
            <button
              onClick={() => {
                void window.coreMindAPI?.openExternalUrl('https://developer.android.com/studio');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                alignSelf: 'flex-start',
                padding: '5px 10px',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={12} />
              <span>Install Android Studio</span>
            </button>
          </div>
        )}
      </div>

      {/* Android SDK Status Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Android SDK</span>
          {isAndroidFound ? (
            <span
              style={{
                fontSize: '10.5px',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={12} /> Detected
            </span>
          ) : (
            <span
              style={{
                fontSize: '10.5px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <XCircle size={12} /> Not Found
            </span>
          )}
        </div>

        {isAndroidFound && sdkStatus?.paths && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
            <div style={{ color: 'var(--text-muted)' }}>
              SDK Root: <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{sdkStatus.paths.sdkRoot}</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              ADB: <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{sdkStatus.paths.adb}</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              Emulator: <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{sdkStatus.paths.emulator}</span>
            </div>
          </div>
        )}

        {!isAndroidFound && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              padding: '8px 10px',
              color: '#f87171',
              fontSize: '11px',
            }}
          >
            {sdkStatus?.error || 'Android SDK was not found in standard macOS locations or ANDROID_HOME.'}
          </div>
        )}
      </div>

      {/* Flutter SDK Status Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Flutter SDK</span>
          {isFlutterFound ? (
            <span
              style={{
                fontSize: '10.5px',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={12} /> Detected
            </span>
          ) : (
            <span
              style={{
                fontSize: '10.5px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <XCircle size={12} /> Not Found
            </span>
          )}
        </div>

        {isFlutterFound && flutterSdkStatus && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
            {flutterSdkStatus.version && (
              <div style={{ color: 'var(--text-muted)' }}>
                Version: <span style={{ color: 'var(--text-primary)' }}>{flutterSdkStatus.version}</span>
              </div>
            )}
            {flutterSdkStatus.path && (
              <div style={{ color: 'var(--text-muted)' }}>
                Binary: <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{flutterSdkStatus.path}</span>
              </div>
            )}
          </div>
        )}

        {!isFlutterFound && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              padding: '8px 10px',
              color: '#f87171',
              fontSize: '11px',
            }}
          >
            {flutterSdkStatus?.error || 'Flutter executable was not found in PATH or standard directories.'}
          </div>
        )}
      </div>

      {/* Setup Guide / Instructions */}
      {(!isAndroidFound || !isFlutterFound) && (
        <div
          style={{
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={14} color="var(--accent)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>macOS Quick Setup</span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {!isAndroidFound && (
              <p style={{ margin: '4px 0' }}>
                1. Install Android Studio or command-line tools:
                <code
                  style={{
                    display: 'block',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    margin: '4px 0',
                    color: '#93c5fd',
                  }}
                >
                  brew install --cask android-studio
                </code>
                2. In your <code>~/.zshrc</code>, add:
                <code
                  style={{
                    display: 'block',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    margin: '4px 0',
                    color: '#93c5fd',
                  }}
                >
                  export ANDROID_HOME=$HOME/Library/Android/sdk{'\n'}
                  export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
                </code>
              </p>
            )}

            {!isFlutterFound && (
              <p style={{ margin: '8px 0 4px 0' }}>
                3. Install Flutter SDK:
                <code
                  style={{
                    display: 'block',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    margin: '4px 0',
                    color: '#93c5fd',
                  }}
                >
                  brew install --cask flutter
                </code>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
