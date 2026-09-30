import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Code,
  Server,
  Sparkles,
  User as UserIcon,
  Check,
  AlertCircle,
  RefreshCw,
  LogOut,
  LogIn,
  Key,
} from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import { useBackendStore } from '../stores/backendStore';
import { useAuthStore } from '../stores/authStore';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings } = useEditorStore();
  const {
    httpUrl,
    wsUrl,
    isHealthy,
    wsStatus,
    serviceInfo,
    aiTestResult,
    isTestingAi,
    aiUsage,
    safeSettings,
    setHttpUrl,
    setWsUrl,
    reconnect,
    testAiConnection,
    fetchAiUsage,
    fetchSettings,
  } = useBackendStore();

  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    error: authError,
    loginWithGoogle,
    logout,
    setAuthTokens,
  } = useAuthStore();

  const [inputHttpUrl, setInputHttpUrl] = useState(httpUrl);
  const [inputWsUrl, setInputWsUrl] = useState(wsUrl);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showManualToken, setShowManualToken] = useState(false);

  useEffect(() => {
    setInputHttpUrl(httpUrl);
    setInputWsUrl(wsUrl);
  }, [httpUrl, wsUrl]);

  useEffect(() => {
    fetchAiUsage();
    fetchSettings();
  }, [fetchAiUsage, fetchSettings]);

  const handleSaveEndpoints = (e: React.FormEvent) => {
    e.preventDefault();
    setHttpUrl(inputHttpUrl);
    setWsUrl(inputWsUrl);
  };

  const isConnected = isHealthy && wsStatus === 'connected';

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
        Settings & AI Backend
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
        {/* 1. CoreMind Backend Connection */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Server size={15} color="var(--accent)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>CoreMind AI Backend</span>
            </div>
            <span
              style={{
                fontSize: '10.5px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isConnected ? '#10B981' : '#EF4444',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#10B981' : '#EF4444',
                }}
              />
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>

          <form
            onSubmit={handleSaveEndpoints}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: 'var(--bg-panel)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                HTTP API Base URL
              </label>
              <input
                type="text"
                value={inputHttpUrl}
                onChange={(e) => setInputHttpUrl(e.target.value)}
                placeholder="http://localhost:43110"
                style={{ width: '100%', fontSize: '12px', height: '28px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                WebSocket Event Stream URL
              </label>
              <input
                type="text"
                value={inputWsUrl}
                onChange={(e) => setInputWsUrl(e.target.value)}
                placeholder="ws://localhost:43110/ws"
                style={{ width: '100%', fontSize: '12px', height: '28px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
              <button
                type="submit"
                style={{
                  padding: '5px 12px',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  borderRadius: '5px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save & Connect
              </button>

              <button
                type="button"
                onClick={reconnect}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '5px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={11} />
                <span>Reconnect</span>
              </button>
            </div>
          </form>
        </div>

        {/* 2. Authentication & User Profile */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-primary)' }}>
            <UserIcon size={15} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Google Account & Auth</span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-panel)',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      style={{ width: '36px', height: '36px', borderRadius: '50%' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                      }}
                    >
                      {(user.name || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    Role: <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{user.role}</span>
                  </span>
                  <button
                    onClick={logout}
                    disabled={isAuthLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '5px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    <LogOut size={12} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
                  Sign in with Google to sync your AI developer identity, agent sessions, and cloud telemetry.
                </p>

                {authError && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertCircle size={12} />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  onClick={loginWithGoogle}
                  disabled={isAuthLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: isAuthLoading ? 'default' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  <LogIn size={14} color="#4285F4" />
                  <span>{isAuthLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
                </button>

                <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowManualToken(!showManualToken)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Key size={11} />
                    <span>{showManualToken ? 'Hide Manual Token' : 'Or paste token manually'}</span>
                  </button>
                </div>

                {showManualToken && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!manualTokenInput.trim()) return;
                      setAuthTokens({
                        access_token: manualTokenInput.trim(),
                        refresh_token: manualTokenInput.trim(),
                        token_type: 'bearer',
                        expires_in: 604800,
                        user: {
                          id: 'usr_manual',
                          email: 'developer@coremind.ai',
                          name: 'CoreMind Developer',
                          provider: 'manual',
                          role: 'user',
                          created_at: new Date().toISOString(),
                        },
                      });
                      setManualTokenInput('');
                      setShowManualToken(false);
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}
                  >
                    <input
                      type="password"
                      placeholder="Paste JWT access_token..."
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      style={{ fontSize: '11px', height: '26px' }}
                    />
                    <button
                      type="submit"
                      disabled={!manualTokenInput.trim()}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Set Token
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. AI Provider Diagnostics & Usage */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-primary)' }}>
            <Sparkles size={15} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>AI Provider Diagnostics</span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-panel)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Provider Connection Test:
              </span>
              <button
                onClick={testAiConnection}
                disabled={isTestingAi}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '5px',
                  fontSize: '11px',
                  cursor: isTestingAi ? 'default' : 'pointer',
                }}
              >
                <Sparkles size={12} />
                <span>{isTestingAi ? 'Testing...' : 'Test AI Backend'}</span>
              </button>
            </div>

            {aiTestResult && (
              <div
                style={{
                  fontSize: '11px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  padding: '8px 10px',
                  borderRadius: '5px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#e5e7eb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontWeight: 600 }}>
                  <Check size={12} />
                  <span>AI Connected ({aiTestResult.provider})</span>
                </div>
                <div style={{ color: '#9ca3af', marginTop: '2px', fontSize: '10px' }}>
                  Model: {aiTestResult.model}
                </div>
                <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#d1d5db' }}>
                  "{aiTestResult.response}"
                </div>
              </div>
            )}

            {aiUsage && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Total Tokens: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{aiUsage.usage.total_tokens}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Requests: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{aiUsage.usage.request_count}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Editor Settings */}
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

        {/* 5. Appearance & System */}
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
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>macOS (Apple Silicon arm64)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
