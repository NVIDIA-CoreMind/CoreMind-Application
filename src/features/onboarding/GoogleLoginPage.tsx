import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, AlertCircle, HelpCircle, X, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
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
  const [isWaitingChrome, setIsWaitingChrome] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const authStateRef = useRef<string | undefined>(undefined);

  const cleanupPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupPolling();
    };
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Attempt opening in Google Chrome
      const chromeResult = await featureAuthService.openInGoogleChrome();

      if (chromeResult.success) {
        authStateRef.current = chromeResult.state;
        setIsWaitingChrome(true);
        setIsLoading(false);

        // Start polling for OAuth completion from backend
        cleanupPolling();
        pollTimerRef.current = setInterval(async () => {
          try {
            const authed = await featureAuthService.checkPendingSession(authStateRef.current);
            if (authed) {
              cleanupPolling();
              onSuccess();
            }
          } catch {
            // keep polling silently
          }
        }, 1500);
        return;
      }

      // Fallback: standard desktop oauth window if Chrome could not be opened
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

  const handleManualCheck = async () => {
    setIsCheckingSession(true);
    try {
      const authed = await featureAuthService.checkPendingSession(authStateRef.current);
      if (authed) {
        cleanupPolling();
        onSuccess();
      } else {
        setErrorMessage('Authentication not yet detected. Please ensure you finished logging in in Chrome.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to verify session.');
    } finally {
      setIsCheckingSession(false);
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
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
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
          maxWidth: '380px',
        }}
      >
        {isWaitingChrome
          ? 'Google Chrome opened. Complete sign-in in your browser.'
          : 'Sign in to continue to your AI-powered workspace.'}
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

      {/* Waiting Chrome State */}
      {isWaitingChrome ? (
        <div
          style={{
            width: '100%',
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface, #1e1e1e)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#3B82F6',
                boxShadow: '0 0 10px #3B82F6',
                animation: 'coremind-pulse 1.5s infinite ease-in-out',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Waiting for sign-in in Google Chrome...
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Once you sign in to Google in Chrome, CoreMind IDE will automatically connect and continue.
          </p>

          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isCheckingSession}
              style={{
                flex: 1,
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent, #3B82F6)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isCheckingSession ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              {isCheckingSession ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>Check Status</span>
            </button>

            <button
              type="button"
              onClick={handleSignIn}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ExternalLink size={14} />
              <span>Re-open Chrome</span>
            </button>
          </div>
        </div>
      ) : (
        /* Primary Authentication Button */
        <div style={{ width: '100%', marginBottom: '20px' }}>
          <GoogleSignInButton
            onClick={handleSignIn}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      )}

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
          onClick={() => {
            cleanupPolling();
            onBack();
          }}
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
            e.currentTarget.style.outline = '2px solid var(--accent, #3B82F6)';
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
                <HelpCircle size={18} color="var(--accent, #3B82F6)" />
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
              CoreMind IDE connects with Google OAuth to verify developer credentials:
            </p>

            <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '18px', marginBottom: '18px' }}>
              <li>Google Chrome opens the official Google Sign-In consent portal.</li>
              <li>The local CoreMind backend service is active at 127.0.0.1:43110.</li>
              <li>You can also click &ldquo;Use Dev Bypass&rdquo; to jump directly into the workspace.</li>
            </ul>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {onDevBypass && (
                <button
                  type="button"
                  onClick={() => {
                    cleanupPolling();
                    setShowHelpModal(false);
                    onDevBypass();
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color, #444)',
                    color: 'var(--accent, #3B82F6)',
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
                  backgroundColor: 'var(--accent, #3B82F6)',
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

      <style>{`
        @keyframes coremind-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
};
