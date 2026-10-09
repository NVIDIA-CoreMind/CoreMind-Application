import React, { useState } from 'react';
import { OnboardingLayout } from './OnboardingLayout';
import { WelcomePage } from './WelcomePage';
import { ThemeSelectionPage } from './ThemeSelectionPage';
import { GoogleLoginPage } from './GoogleLoginPage';
import { OnboardingStep, ThemeChoice, OnboardingWindowProps } from './onboarding.types';
import { onboardingService } from './onboarding.service';
import { useThemeStore } from '@/stores/themeStore';
import { featureAuthService } from '../auth/auth.service';

export const OnboardingWindow: React.FC<OnboardingWindowProps> = ({
  onComplete,
  isDevelopment,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const theme = useThemeStore((s) => s.theme);

  const handleSelectTheme = (newTheme: ThemeChoice) => {
    onboardingService.saveTheme(newTheme);
  };

  const handleFinishOnboarding = () => {
    onboardingService.markOnboardingCompleted();
    onComplete?.();
  };

  const handleDevBypass = () => {
    featureAuthService.bypassDevAuth();
    onboardingService.setDevBypass(true);
    onboardingService.markOnboardingCompleted();
    onComplete?.();
  };

  const renderCurrentPage = () => {
    switch (currentStep) {
      case 1:
        return (
          <WelcomePage
            onGetStarted={() => setCurrentStep(2)}
            onDevBypass={handleDevBypass}
          />
        );
      case 2:
        return (
          <ThemeSelectionPage
            selectedTheme={theme}
            onSelectTheme={handleSelectTheme}
            onBack={() => setCurrentStep(1)}
            onContinue={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <GoogleLoginPage
            onBack={() => setCurrentStep(2)}
            onSuccess={handleFinishOnboarding}
            onDevBypass={handleDevBypass}
          />
        );
      default:
        return null;
    }
  };

  const isDev = isDevelopment !== undefined ? isDevelopment : onboardingService.isDevEnvironment();

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={3}
      onStepChange={(step) => {
        // Allow going back to previous steps via progress indicator
        if (step < currentStep) {
          setCurrentStep(step);
        }
      }}
      showDevBypass={isDev}
      onDevBypass={handleDevBypass}
    >
      {renderCurrentPage()}
    </OnboardingLayout>
  );
};
