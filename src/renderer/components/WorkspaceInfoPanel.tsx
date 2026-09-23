import React from 'react';
import { Sparkles, Cpu, Layers, ShieldCheck, X } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';

export const WorkspaceInfoPanel: React.FC = () => {
  const { toggleRightPanel } = useUiStore();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-color)',
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
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} color="var(--accent)" />
          <span>CoreMind</span>
        </div>

        <button
          onClick={toggleRightPanel}
          title="Close Panel"
          style={{ padding: '3px', color: 'var(--text-muted)' }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner Card */}
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <Cpu size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                COREMIND
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                AI-Native Development Environment
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '4px',
              padding: '6px 10px',
              borderRadius: '5px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Phase 1 — Desktop Foundation</span>
          </div>
        </div>

        {/* Phase 2 Preview */}
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--accent-hover)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px',
              }}
            >
              <Layers size={13} />
              AI Integration
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              AI capabilities will be available in Phase 2.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Planned:
            </span>

            {[
              'Code understanding & semantic index',
              'Code generation & intelligent edits',
              'Repository context analysis & RAG',
              'Automated testing & sandboxing',
              'Autonomous debugging with NVIDIA Nemotron',
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: 'var(--accent)' }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Architecture Guarantee */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '6px',
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <ShieldCheck size={16} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
              Secure IPC Architecture
            </strong>
            The renderer is isolated with strict context boundaries, ensuring all filesystem access is workspace-validated.
          </div>
        </div>
      </div>
    </div>
  );
};
