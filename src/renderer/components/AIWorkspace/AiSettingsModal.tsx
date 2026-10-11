import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Key,
  Globe,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useAIWorkspaceStore } from '../../services/aiWorkspaceService';
import { useThemeStore } from '../../stores/themeStore';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { selectedModel, setSelectedModel } = useAIWorkspaceStore();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [provider, setProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'nebius' | 'custom'>(() => {
    return (localStorage.getItem('coremind:ai-provider') as any) || 'nebius';
  });

  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('coremind:ai-api-key') || '';
  });

  const [model, setModel] = useState(() => {
    return selectedModel || localStorage.getItem('coremind:ai-model') || 'NVIDIA Nemotron 3 Ultra';
  });

  const [baseUrl, setBaseUrl] = useState(() => {
    return localStorage.getItem('coremind:ai-base-url') || 'https://api.studio.nebius.ai/v1';
  });

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Sync with current config on open
  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('coremind:ai-api-key') || '';
      const storedProv = (localStorage.getItem('coremind:ai-provider') as any) || 'nebius';
      const storedModel = selectedModel || localStorage.getItem('coremind:ai-model') || 'NVIDIA Nemotron 3 Ultra';
      const storedUrl = localStorage.getItem('coremind:ai-base-url') || (storedProv === 'nebius' ? 'https://api.studio.nebius.ai/v1' : '');

      setApiKey(storedKey);
      setProvider(storedProv);
      setModel(storedModel);
      setBaseUrl(storedUrl);
      setTestResult(null);
    }
  }, [isOpen, selectedModel]);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: 'gemini' | 'openai' | 'anthropic' | 'nebius' | 'custom') => {
    setProvider(newProvider);
    setTestResult(null);
    setModel('NVIDIA Nemotron 3 Ultra');
    if (newProvider === 'nebius') {
      setBaseUrl('https://api.studio.nebius.ai/v1');
    } else if (newProvider === 'custom') {
      setBaseUrl('http://localhost:43110');
    } else if (newProvider === 'gemini') {
      setBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai');
    } else if (newProvider === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
    } else if (newProvider === 'anthropic') {
      setBaseUrl('https://api.anthropic.com/v1');
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() && provider !== 'custom') {
      setTestResult({
        success: false,
        message: 'Please enter an API key before testing connection.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    const start = Date.now();

    try {
      // Sync config first
      await window.coreMindAPI?.setAiConfig?.({
        apiKey: apiKey.trim(),
        model,
        provider,
        baseUrl: baseUrl.trim() || undefined,
      });

      const res = await window.coreMindAPI?.sendAgentMessage?.(
        [{ id: `test-${Date.now()}`, role: 'user', content: 'Ping. Respond with single word "PONG".', timestamp: Date.now() }],
        undefined
      );

      const latency = Date.now() - start;

      if (res?.success && res.data?.message?.content && !res.data.message.content.includes('AI Provider Error:')) {
        setTestResult({
          success: true,
          message: `Connection successful! Response latency: ${latency}ms`,
          latency,
        });
      } else {
        const errMsg = res?.success ? res.data?.message?.content : res?.error?.message;
        setTestResult({
          success: false,
          message: errMsg || 'Failed to connect. Please verify your API key.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network request failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    localStorage.setItem('coremind:ai-api-key', apiKey.trim());
    localStorage.setItem('coremind:ai-provider', provider);
    localStorage.setItem('coremind:ai-model', model.trim());
    localStorage.setItem('coremind:ai-base-url', baseUrl.trim());

    setSelectedModel(model.trim());

    await window.coreMindAPI?.setAiConfig?.({
      apiKey: apiKey.trim(),
      model: model.trim(),
      provider,
      baseUrl: baseUrl.trim() || undefined,
    });

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: isDark ? '#E6E6E6' : '#1E293B',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                NVIDIA Nemotron 3 Ultra Configuration
              </h3>
              <p style={{ fontSize: '12px', color: isDark ? '#94A3B8' : '#64748B', margin: '2px 0 0' }}>
                Autonomous reasoning engine powered by NVIDIA Nemotron & CoreMind Agentic Backend.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#94A3B8' : '#64748B',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Provider Selection */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Select AI Engine / Provider
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'nebius', label: 'NVIDIA Nemotron', desc: 'Nebius AI Cloud' },
                { id: 'custom', label: 'CoreMind Backend', desc: 'Port 43110 Local' },
                { id: 'gemini', label: 'Google AI Cloud', desc: 'Gemini Cloud API' },
              ].map((p) => {
                const isSelected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id as any)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #10B981' : isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') : 'transparent',
                      color: isSelected ? (isDark ? '#FFFFFF' : '#047857') : 'inherit',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: '10.5px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Cpu size={13} color="#10B981" />
              <span>Model Identifier</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. NVIDIA Nemotron 3 Ultra, nvidia/llama-3.3-nemotron-super-49b-v1"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #CBD5E1',
                backgroundColor: isDark ? '#141414' : '#F8FAFC',
                color: isDark ? '#FFFFFF' : '#0F172A',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* API Key */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={13} color="#F59E0B" />
                <span>API Key</span>
              </label>
              {provider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '11.5px', color: '#38BDF8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <span>Get Free Key</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                style={{
                  width: '100%',
                  padding: '9px 38px 9px 12px',
                  borderRadius: '6px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #CBD5E1',
                  backgroundColor: isDark ? '#141414' : '#F8FAFC',
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#94A3B8' : '#64748B',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: isDark ? '#64748B' : '#94A3B8', margin: '4px 0 0' }}>
              Your API key is stored locally on your device and never sent to third-party tracking servers.
            </p>
          </div>

          {/* Base URL (Advanced) */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <Globe size={12} />
              <span>API Endpoint Base URL (Optional / Custom)</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
                backgroundColor: isDark ? '#141414' : '#F8FAFC',
                color: isDark ? '#94A3B8' : '#64748B',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: testResult.success
                  ? isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7'
                  : isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                border: testResult.success ? '1px solid #10B981' : '1px solid #EF4444',
                color: testResult.success ? (isDark ? '#6EE7B7' : '#15803D') : (isDark ? '#FCA5A5' : '#B91C1C'),
              }}
            >
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span style={{ flex: 1 }}>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #CBD5E1',
              backgroundColor: 'transparent',
              color: isDark ? '#FFFFFF' : '#0F172A',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: testing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {testing && <Loader2 size={13} className="spin" />}
            <span>{testing ? 'Pinging Model...' : 'Test Connection'}</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isDark ? '#94A3B8' : '#64748B',
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
              }}
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
