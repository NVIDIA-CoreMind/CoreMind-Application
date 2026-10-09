import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, HelpCircle, X } from 'lucide-react';
import coreMindLogo from '@/assets/icon.png';
import { GoogleSignInButton } from './GoogleSignInButton';
import { GoogleLoginPageProps } from './onboarding.types';
import { featureAuthService } from '../auth/auth.service';

export const GoogleLoginPage: React.FC<GoogleLoginPageProps> = ({
  onBack,
  onSuccess,
  onDevBypass,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await featureAuthService.signInWithGoogle();
      if (result.success) {
        onSuccess();
      } else if (result.error) {
        setErrorMessage(result.error);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Authentication could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowHelpModal(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto',
        position: 'relative',
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
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
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
          marginBottom: '32px',
          maxWidth: '380px',
        }}
      >
        Sign in to continue to your AI-powered workspace.
      </p>

      {/* Error Message Alert */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#F87171',
            fontSize: '12px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '20px',
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1 }}>{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#F87171',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Primary Authentication Button */}
      <div style={{ width: '100%', marginBottom: '20px' }}>
        <GoogleSignInButton
          onClick={handleSignIn}
          isLoading={isLoading}
          disabled={isLoading}
        />
      </div>

      {/* Additional Help Link */}
      <div style={{ marginBottom: '32px' }}>
        <button
          type="button"
          onClick={handleHelpClick}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            cursor: 'pointer',
            padding: '4px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Having trouble? Get help
        </button>
      </div>

      {/* Navigation: Back Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          aria-label="Back to theme selection"
          style={{
            height: '42px',
            padding: '0 16px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color, rgba(128, 128, 128, 0.25))',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'all 0.15s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = 'var(--bg-hover, #262626)';
          }}
          onMouseLeave={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--accent, #10B981)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>
      </div>

      {/* Support / Help Dialog Modal */}
      {showHelpModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface, #202020)',
              border: '1px solid var(--border-color, #333333)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'left',
              boxShadow: '0 16px 32px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} color="var(--accent, #10B981)" />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Authentication Assistance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                aria-label="Close dialog"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              CoreMind IDE connects with Google OAuth to verify developer credentials. Ensure that:
            </p>

            <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '18px', marginBottom: '18px' }}>
              <li>The local or remote CoreMind service is running (default port: 43110).</li>
              <li>Your device has internet connectivity to reach Google authentication servers.</li>
              <li>No browser firewall or proxy is blocking the desktop authorization callback.</li>
            </ul>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {onDevBypass && (
                <button
                  type="button"
                  onClick={() => {
                    setShowHelpModal(false);
                    onDevBypass();
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color, #444)',
                    color: 'var(--accent, #10B981)',
                    cursor: 'pointer',
                  }}
                >
                  Use Dev Bypass
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent, #10B981)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
