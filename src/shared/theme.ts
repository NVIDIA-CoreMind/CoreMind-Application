/**
 * CoreMind Antigravity Design System Tokens
 * Central source of truth for unified theme colors and UI tokens.
 */

export const ANTIGRAVITY_THEME = {
  // Surfaces & Backgrounds
  bgApp: '#1E1F20',
  bgPanel: '#232426',
  bgEditor: '#1E1F20',
  bgSurface: '#28292B',
  bgCard: '#28292B',
  bgHover: '#303134',
  bgSelected: '#30343B',
  bgActive: '#30343B',
  bgRaised: '#28292B',
  bgRaisedHover: '#303134',

  // Borders & Dividers
  border: '#3C4043',
  borderSubtle: '#3C4043',

  // Typography
  textPrimary: '#E8EAED',
  textSecondary: '#9AA0A6',
  textMuted: '#70757A',
  textBody: '#E8EAED',
  textFaint: '#70757A',

  // Accents & Interactive
  accent: '#8AB4F8',
  accentHover: '#AECBFA',
  accentBg: 'rgba(138, 180, 248, 0.12)',

  // Semantic Status Colors
  success: '#81C995',
  warning: '#FDD663',
  error: '#F28B82',
} as const;

export type AntigravityTheme = typeof ANTIGRAVITY_THEME;
