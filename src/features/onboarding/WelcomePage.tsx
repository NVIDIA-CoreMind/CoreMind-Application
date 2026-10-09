import React from 'react';
import { Sparkles, Terminal, Zap, ArrowRight } from 'lucide-react';
import coreMindLogo from '@/assets/icon.png';
import { WelcomePageProps } from './onboarding.types';

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onGetStarted,
  version = 'v0.1.0',
}) => {
  const highlights = [
    {
      title: 'AI-Powered Development',
      description: 'Generate code, understand projects, and solve programming problems.',
      icon: Sparkles,
      color: '#3B82F6',
    },
    {
      title: 'Intelligent Coding Workspace',
      description: 'Work with your code, files, and integrated terminal in one place.',
      icon: Terminal,
      color: '#60A5FA',
    },
    {
      title: 'Developer Productivity',
      description: 'Build, test, debug, and improve applications with AI assistance.',
      icon: Zap,
      color: '#8B5CF6',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      {/* Top Center CoreMind Logo */}
      <div
        style={{
          width: '72px',
          height: '72px',
          marginBottom: '20px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '20px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 70%)',
            filter: 'blur(8px)',
            zIndex: 0,
          }}
        />
        <img
          src={coreMindLogo}
          alt="CoreMind Logo"
          style={{
            width: '64px',
            height: '64px',
            objectFit: 'contain',
            position: 'relative',
            zIndex: 1,
            filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))',
          }}
        />
      </div>

      {/* Heading */}
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.025em',
          marginBottom: '8px',
          lineHeight: 1.25,
        }}
      >
        Welcome to CoreMind IDE
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          marginBottom: '28px',
          maxWidth: '420px',
        }}
      >
        Your intelligent workspace for building, debugging, and shipping software.
      </p>

      {/* Capability Highlights */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          textAlign: 'left',
          marginBottom: '32px',
        }}
      >
        {highlights.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-card, rgba(255, 255, 255, 0.02))',
                border: '1px solid var(--border-color, rgba(128, 128, 128, 0.15))',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface, #202020)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                  border: '1px solid var(--border-color, rgba(128, 128, 128, 0.2))',
                }}
              >
                <IconComponent size={16} color={item.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Action Button */}
      <div style={{ width: '100%', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={onGetStarted}
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '8px',
            backgroundColor: 'var(--accent, #3B82F6)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover, #60A5FA)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent, #3B82F6)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.25)';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--accent, #3B82F6)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <span>Get Started</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Version Label at bottom */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-muted, #666666)',
          letterSpacing: '0.2px',
        }}
      >
        CoreMind IDE {version}
      </div>
    </div>
  );
};
