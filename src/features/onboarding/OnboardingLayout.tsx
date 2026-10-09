import React from 'react';
import { Terminal } from 'lucide-react';
import { OnboardingLayoutProps } from './onboarding.types';
import { OnboardingProgress } from './OnboardingProgress';

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  currentStep,
  totalSteps = 3,
  onStepChange,
  children,
  showDevBypass = true,
  onDevBypass,
}) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-app, #1E1E1E)',
        color: 'var(--text-primary, #E6E6E6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Native macOS draggable titlebar space */}
      <div
        className="app-drag"
        style={{
          height: 'var(--titlebar-height, 38px)',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 16px',
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        {/* Developer Bypass Button in top right if enabled */}
        {showDevBypass && onDevBypass && (
          <button
            type="button"
            className="app-no-drag"
            onClick={onDevBypass}
            title="Development mode: Bypass onboarding wizard and enter CoreMind IDE directly"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: 'var(--bg-card, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border-color, rgba(128, 128, 128, 0.2))',
              color: 'var(--accent, #3B82F6)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-bg, rgba(59, 130, 246, 0.12))';
              e.currentTarget.style.borderColor = 'var(--accent, #3B82F6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-card, rgba(255, 255, 255, 0.04))';
              e.currentTarget.style.borderColor = 'var(--border-color, rgba(128, 128, 128, 0.2))';
            }}
          >
            <Terminal size={12} />
            <span>Bypass Onboarding (Dev)</span>
          </button>
        )}
      </div>

      {/* Primary Center Content Area (Upper-middle region) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          maxWidth: '580px',
          width: '100%',
          margin: '-20px auto 0 auto',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '100%',
            animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {children}
        </div>
      </div>

      {/* Bottom Footer with Progress Indicator */}
      <div
        style={{
          height: '64px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '16px',
          flexShrink: 0,
          zIndex: 40,
        }}
      >
        <OnboardingProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          onStepClick={onStepChange}
        />
      </div>

      {/* Subtle fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
