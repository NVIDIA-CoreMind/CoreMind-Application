import React from 'react';
import { OnboardingProgressProps, OnboardingStep } from './onboarding.types';

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps = 3,
  onStepClick,
}) => {
  const steps: OnboardingStep[] = [1, 2, 3];

  return (
    <nav
      role="navigation"
      aria-label="Onboarding Progress"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 0',
      }}
    >
      {steps.map((step) => {
        const isActive = step === currentStep;
        const isPast = step < currentStep;

        return (
          <button
            key={step}
            type="button"
            onClick={() => onStepClick?.(step)}
            aria-label={`Step ${step} of ${totalSteps}${isActive ? ' (current)' : ''}`}
            aria-current={isActive ? 'step' : undefined}
            disabled={!onStepClick || (!isPast && !isActive)}
            style={{
              padding: 0,
              height: '6px',
              width: isActive ? '24px' : '6px',
              borderRadius: '3px',
              backgroundColor: isActive
                ? 'var(--accent, #10B981)'
                : isPast
                ? 'var(--text-secondary, #9A9A9A)'
                : 'var(--border-color, #333333)',
              opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
              border: 'none',
              cursor: onStepClick && (isPast || isActive) ? 'pointer' : 'default',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              outline: 'none',
            }}
          />
        );
      })}
    </nav>
  );
};
