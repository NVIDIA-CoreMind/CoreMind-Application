import { ReactNode } from 'react';
import { ThemeMode } from '@/stores/themeStore';

export type OnboardingStep = 1 | 2 | 3;

export type ThemeChoice = ThemeMode; // 'dark' | 'light' | 'system'

export interface CapabilityHighlight {
  title: string;
  description: string;
  icon: string;
}

export interface OnboardingWindowProps {
  onComplete?: () => void;
  isDevelopment?: boolean;
}

export interface OnboardingLayoutProps {
  currentStep: OnboardingStep;
  totalSteps?: number;
  onStepChange?: (step: OnboardingStep) => void;
  children: ReactNode;
  showDevBypass?: boolean;
  onDevBypass?: () => void;
}

export interface WelcomePageProps {
  onGetStarted: () => void;
  version?: string;
  onDevBypass?: () => void;
}

export interface ThemeSelectionPageProps {
  selectedTheme: ThemeChoice;
  onSelectTheme: (theme: ThemeChoice) => void;
  onBack: () => void;
  onContinue: () => void;
}

export interface GoogleLoginPageProps {
  onBack: () => void;
  onSuccess: () => void;
  onDevBypass?: () => void;
}

export interface ThemePreviewCardProps {
  theme: ThemeChoice;
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

export interface GoogleSignInButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  totalSteps?: number;
  onStepClick?: (step: OnboardingStep) => void;
}
