import React, { useState, useRef, useEffect } from 'react';
import { LogOut, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

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
    await logout();
  };

  const displayName = user?.name || (isAuthenticated ? 'CoreMind User' : 'Guest');
  const displayEmail = user?.email || (isAuthenticated ? 'Signed in' : 'Not signed in');
  const avatarUrl = user?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={isAuthenticated ? `${displayName} (${displayEmail})` : 'User Profile'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
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
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--accent, #3B82F6)',
            boxShadow: '0 0 0 1.5px rgba(59, 130, 246, 0.4)',
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
                color: '#FFFFFF',
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
          size={11}
          style={{
            color: 'var(--text-muted, #888)',
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
            backgroundColor: 'var(--bg-surface, #1e1e1e)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeInMenu 0.15s ease-out',
          }}
        >
          {/* User Header Details */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
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
                backgroundColor: 'var(--accent, #3B82F6)',
                flexShrink: 0,
                boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
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
                <span style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600 }}>
                  {initial}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #ffffff)',
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
                  color: 'var(--text-muted, #888888)',
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
                  color: '#3B82F6',
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
                color: 'var(--text-primary, #ffffff)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                e.currentTarget.style.color = '#F87171';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-primary, #ffffff)';
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
