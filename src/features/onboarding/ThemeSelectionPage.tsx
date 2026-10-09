import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ThemePreviewCard } from './ThemePreviewCard';
import { ThemeChoice, ThemeSelectionPageProps } from './onboarding.types';

export const ThemeSelectionPage: React.FC<ThemeSelectionPageProps> = ({
  selectedTheme,
  onSelectTheme,
  onBack,
  onContinue,
}) => {
  const themeOptions: Array<{
    theme: ThemeChoice;
    label: string;
    description: string;
  }> = [
    {
      theme: 'dark',
      label: 'Dark',
      description: 'Comfortable low-light environment with dark surfaces.',
    },
    {
      theme: 'light',
      label: 'Light',
      description: 'Clean, bright editor appearance with light surfaces.',
    },
    {
      theme: 'system',
      label: 'System',
      description: 'Follow operating system appearance automatically.',
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
        maxWidth: '520px',
        margin: '0 auto',
      }}
    >
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
        Make CoreMind Yours
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
        Choose the appearance that feels right for your workspace.
      </p>

      {/* Theme Cards Grid */}
      <div
        role="radiogroup"
        aria-label="CoreMind Theme Options"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          width: '100%',
          marginBottom: '36px',
        }}
      >
        {themeOptions.map((opt) => (
          <ThemePreviewCard
            key={opt.theme}
            theme={opt.theme}
            label={opt.label}
            description={opt.description}
            isSelected={selectedTheme === opt.theme}
            onSelect={() => onSelectTheme(opt.theme)}
          />
        ))}
      </div>

      {/* Navigation Buttons: Back and Continue */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '12px',
        }}
      >
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to welcome page"
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
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover, #262626)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
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

        {/* Primary Continue Button */}
        <button
          type="button"
          onClick={onContinue}
          aria-label="Continue to Google sign-in"
          style={{
            height: '42px',
            padding: '0 24px',
            borderRadius: '8px',
            backgroundColor: 'var(--accent, #3B82F6)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
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
          <span>Continue</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
