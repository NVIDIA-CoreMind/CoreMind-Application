import React from 'react';
import { Check } from 'lucide-react';
import { ThemePreviewCardProps } from './onboarding.types';

export const ThemePreviewCard: React.FC<ThemePreviewCardProps> = ({
  theme,
  label,
  description,
  isSelected,
  onSelect,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  // Render miniature mockup of IDE UI for each theme
  const renderMockup = () => {
    if (theme === 'system') {
      // Split mockup: half light, half dark
      return (
        <div
          style={{
            width: '100%',
            height: '84px',
            borderRadius: '6px',
            overflow: 'hidden',
            display: 'flex',
            position: 'relative',
            border: '1px solid rgba(128, 128, 128, 0.2)',
          }}
        >
          {/* Left half: Light */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRight: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              padding: '6px',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', gap: '3px', marginBottom: '2px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            </div>
            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
              <div style={{ width: '18px', backgroundColor: '#F3F4F6', borderRadius: '2px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ width: '70%', height: '3px', backgroundColor: '#3B82F6', borderRadius: '1px' }} />
                <div style={{ width: '45%', height: '3px', backgroundColor: '#8B5CF6', borderRadius: '1px' }} />
                <div style={{ width: '85%', height: '3px', backgroundColor: '#10B981', borderRadius: '1px' }} />
                <div style={{ width: '60%', height: '3px', backgroundColor: '#D1D5DB', borderRadius: '1px' }} />
              </div>
            </div>
          </div>

          {/* Right half: Dark */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#1E1E1E',
              display: 'flex',
              flexDirection: 'column',
              padding: '6px',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
              <span style={{ fontSize: '7px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                AUTO
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
              <div style={{ width: '18px', backgroundColor: '#181818', borderRadius: '2px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ width: '65%', height: '3px', backgroundColor: '#60A5FA', borderRadius: '1px' }} />
                <div style={{ width: '50%', height: '3px', backgroundColor: '#A78BFA', borderRadius: '1px' }} />
                <div style={{ width: '80%', height: '3px', backgroundColor: '#34D399', borderRadius: '1px' }} />
                <div style={{ width: '40%', height: '3px', backgroundColor: '#4B5563', borderRadius: '1px' }} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    const isLight = theme === 'light';
    const bgColor = isLight ? '#FFFFFF' : '#1E1E1E';
    const sidebarBg = isLight ? '#F3F4F6' : '#181818';
    const borderColor = isLight ? '#E5E7EB' : '#2A2A2A';
    const textCode1 = isLight ? '#2563EB' : '#60A5FA';
    const textCode2 = isLight ? '#7C3AED' : '#C084FC';
    const textCode3 = isLight ? '#059669' : '#34D399';
    const textMuted = isLight ? '#9CA3AF' : '#4B5563';

    return (
      <div
        style={{
          width: '100%',
          height: '84px',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          padding: '6px',
          gap: '4px',
        }}
      >
        {/* Mock window title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '8px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          <div
            style={{
              marginLeft: 'auto',
              width: '32px',
              height: '3px',
              backgroundColor: borderColor,
              borderRadius: '1px',
            }}
          />
        </div>

        {/* Mock Workspace columns */}
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          <div
            style={{
              width: '28px',
              height: '100%',
              backgroundColor: sidebarBg,
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              padding: '3px',
              gap: '3px',
            }}
          >
            <div style={{ width: '12px', height: '2px', backgroundColor: textMuted, borderRadius: '1px' }} />
            <div style={{ width: '18px', height: '2px', backgroundColor: textMuted, borderRadius: '1px' }} />
            <div style={{ width: '14px', height: '2px', backgroundColor: textMuted, borderRadius: '1px' }} />
          </div>

          <div
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              paddingTop: '2px',
            }}
          >
            <div style={{ width: '75%', height: '3px', backgroundColor: textCode1, borderRadius: '1px' }} />
            <div style={{ width: '50%', height: '3px', backgroundColor: textCode2, borderRadius: '1px' }} />
            <div style={{ width: '85%', height: '3px', backgroundColor: textCode3, borderRadius: '1px' }} />
            <div style={{ width: '60%', height: '3px', backgroundColor: textMuted, borderRadius: '1px' }} />
            <div style={{ width: '40%', height: '3px', backgroundColor: textCode1, borderRadius: '1px' }} />
          </div>
        </div>

        {/* Mock status bar */}
        <div
          style={{
            height: '4px',
            width: '100%',
            backgroundColor: isLight ? '#059669' : '#10B981',
            borderRadius: '1px',
            opacity: 0.8,
          }}
        />
      </div>
    );
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
        border: isSelected
          ? '2px solid var(--accent, #10B981)'
          : '1px solid var(--border-color, rgba(128, 128, 128, 0.2))',
        backgroundColor: isSelected
          ? 'var(--accent-bg, rgba(16, 185, 129, 0.08))'
          : 'var(--bg-card, rgba(255, 255, 255, 0.03))',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        boxShadow: isSelected
          ? '0 0 0 1px var(--accent, #10B981), 0 4px 14px rgba(0, 0, 0, 0.15)'
          : '0 2px 6px rgba(0, 0, 0, 0.04)',
        outline: 'none',
      }}
    >
      {/* Selected check badge */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent, #10B981)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 2,
          }}
        >
          <Check size={11} strokeWidth={3} />
        </div>
      )}

      {/* Miniature preview */}
      <div style={{ marginBottom: '10px' }}>{renderMockup()}</div>

      {/* Label and description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: 1.3,
          }}
        >
          {description}
        </span>
      </div>
    </div>
  );
};
