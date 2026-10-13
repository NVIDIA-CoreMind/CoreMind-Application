import React, { useState, useRef, useEffect } from 'react';
import { LogOut, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { onboardingService } from '../../features/onboarding/onboarding.service';

export const UserProfileButton: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    try {
      await logout();
    } finally {
      onboardingService.signOutAndNavigateToGoogle();
    }
  };

  const displayName = user?.name || 'Manoj';
  const displayEmail = user?.email || (isAuthenticated ? 'Signed in' : 'Guest');
  const avatarUrl = user?.avatar_url;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'M';

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={isAuthenticated ? `${displayName} (${displayEmail})` : 'User Profile'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 4px',
          borderRadius: '16px',
          backgroundColor: isOpen ? 'var(--bg-active, rgba(255, 255, 255, 0.08))' : 'transparent',
          border: '1px solid transparent',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255, 255, 255, 0.06))';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Avatar Circle */}
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--accent, #8AB4F8)',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          ) : (
            <span
              style={{
                color: '#1E1F20',
                fontSize: '11px',
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {initial}
            </span>
          )}
        </div>

        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-secondary, #9AA0A6)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {/* Antigravity Profile Popover Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '260px',
            backgroundColor: 'var(--bg-surface, #28292B)',
            border: '1px solid var(--border-color, #3C4043)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeInMenu 0.15s ease-out',
          }}
        >
          {/* User Header Details */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-color, #3C4043)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--accent, #8AB4F8)',
                flexShrink: 0,
              }}
            >
              {avatarUrl && !imgError ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <span style={{ color: '#1E1F20', fontSize: '16px', fontWeight: 600 }}>
                  {initial}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #E8EAED)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted, #70757A)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: '1px',
                }}
              >
                {displayEmail}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px',
                  fontSize: '10px',
                  color: 'var(--accent, #8AB4F8)',
                  fontWeight: 500,
                }}
              >
                <CheckCircle2 size={11} />
                <span>Google Connected</span>
              </div>
            </div>
          </div>

          {/* Menu Actions */}
          <div style={{ padding: '6px' }}>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary, #E8EAED)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(242, 139, 130, 0.12)';
                e.currentTarget.style.color = 'var(--error, #F28B82)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-primary, #E8EAED)';
              }}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInMenu {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
