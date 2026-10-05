import React, { useEffect } from 'react';
import { isMacClient } from '../../shared/utils/shortcuts';
import coreMindLogo from '../assets/icon.png';

export const TitleBar: React.FC = () => {
  const isMac = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isMac : isMacClient();
  const isWindows = window.coreMindAPI?.platform ? window.coreMindAPI.platform.isWindows : !isMac;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'CoreMind';
    }
  }, []);

  return (
    <div
      className="app-drag"
      style={{
        position: 'relative',
        height: 'var(--titlebar-height, 35px)',
        backgroundColor: 'var(--bg-app)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: isMac ? '78px' : '12px',
        paddingRight: isWindows ? '142px' : '12px',
        zIndex: 50,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Left Area (Mac traffic light clearance spacer) */}
      <div
        className="app-no-drag"
        style={{
          width: '1px',
          height: '100%',
          visibility: 'hidden',
        }}
      />

      {/* Center: Absolute Visual Center of the entire Window Title Bar */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          userSelect: 'none',
          zIndex: 1,
        }}
      >
        <img
          src={coreMindLogo}
          alt="CoreMind"
          style={{
            width: '16px',
            height: '16px',
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '12px',
            letterSpacing: '0.3px',
            color: 'var(--text-primary)',
          }}
        >
          CoreMind
        </span>
      </div>

      {/* Right Area (Windows TitleBar Overlay Controls clearance spacer) */}
      <div
        className="app-no-drag"
        style={{
          width: '1px',
          height: '100%',
          visibility: 'hidden',
        }}
      />
    </div>
  );
};
