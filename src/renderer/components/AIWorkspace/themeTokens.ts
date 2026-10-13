/**
 * Antigravity-Inspired Neutral Theme Tokens for CoreMind Agent UI
 * Provides layered charcoal surfaces, subtle borders, and balanced text hierarchy.
 */

export interface AIThemeTokens {
  bgMain: string;       // Main background (#1E1F20)
  bgHeader: string;     // Header background (#202124)
  bgPanel: string;      // Panel background (#252628)
  bgCard: string;       // Nested card surface (#2B2C2F)
  bgTerminal: string;   // Terminal console surface (#1A1B1C or #1E1F20)
  bgHover: string;      // Hover background (#323438)
  bgActiveTab: string;  // Active tab background (#37393D)
  border: string;       // Primary border (#3A3C40)
  borderSubtle: string; // Inner/subtle divider (#303236)
  textPrimary: string;  // Primary text (#E6E6E6)
  textSecondary: string;// Secondary text (#A6A8AB)
  textMuted: string;    // Muted text (#777B80)
  iconPrimary: string;  // Primary icons (#C4C6C9)
  accentRunning: string;// Active execution pulse / spinner
  accentSuccess: string;// Successful state / check
  accentError: string;  // Error / failure state
}

export function getAITheme(isDark: boolean): AIThemeTokens {
  if (isDark) {
    return {
      bgMain: '#1E1F20',
      bgHeader: '#202124',
      bgPanel: '#252628',
      bgCard: '#2B2C2F',
      bgTerminal: '#1A1B1C',
      bgHover: '#323438',
      bgActiveTab: '#37393D',
      border: '#3A3C40',
      borderSubtle: '#303236',
      textPrimary: '#E6E6E6',
      textSecondary: '#A6A8AB',
      textMuted: '#777B80',
      iconPrimary: '#C4C6C9',
      accentRunning: '#8AB4F8',
      accentSuccess: '#81C995',
      accentError: '#F28B82',
    };
  }

  // Refined neutral light theme tokens
  return {
    bgMain: '#F8F9FA',
    bgHeader: '#F1F3F4',
    bgPanel: '#FFFFFF',
    bgCard: '#F4F5F7',
    bgTerminal: '#F8FAFC',
    bgHover: '#E8EAED',
    bgActiveTab: '#E2E5E9',
    border: '#E0E2E6',
    borderSubtle: '#ECEEF0',
    textPrimary: '#1F2328',
    textSecondary: '#57606A',
    textMuted: '#8C929A',
    iconPrimary: '#494D52',
    accentRunning: '#2563EB',
    accentSuccess: '#16A34A',
    accentError: '#DC2626',
  };
}
