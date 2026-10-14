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
      bgMain: '#171717',
      bgHeader: '#171717',
      bgPanel: '#1f1f1f',
      bgCard: '#262626',
      bgTerminal: '#121212',
      bgHover: '#2b2b2b',
      bgActiveTab: '#262626',
      border: '#303030',
      borderSubtle: '#262626',
      textPrimary: '#f4f4f5',
      textSecondary: '#a1a1aa',
      textMuted: '#71717a',
      iconPrimary: '#c4c6c9',
      accentRunning: '#38bdf8',
      accentSuccess: '#81c995',
      accentError: '#f28b82',
    };
  }

  // Refined neutral light theme tokens
  return {
    bgMain: '#FFFFFF',
    bgHeader: '#F8FAFC',
    bgPanel: '#FFFFFF',
    bgCard: '#F1F5F9',
    bgTerminal: '#F8FAFC',
    bgHover: '#E2E8F0',
    bgActiveTab: '#E2E5E9',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    iconPrimary: '#475569',
    accentRunning: '#2563EB',
    accentSuccess: '#16A34A',
    accentError: '#DC2626',
  };
}
