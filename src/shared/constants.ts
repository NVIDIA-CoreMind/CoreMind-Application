import { AppSettings } from './types/settings';

export const APP_NAME = 'CoreMind';
export const APP_SUBTITLE = 'AI-Native Development Environment';
export const APP_ID = 'com.coremind.ide';

export const UI_DIMENSIONS = {
  MIN_SIDEBAR_WIDTH: 200,
  MAX_SIDEBAR_WIDTH: 520,
  DEFAULT_SIDEBAR_WIDTH: 280,

  MIN_RIGHT_PANEL_WIDTH: 220,
  MAX_RIGHT_PANEL_WIDTH: 520,
  DEFAULT_RIGHT_PANEL_WIDTH: 300,

  MIN_TERMINAL_HEIGHT: 120,
  MAX_TERMINAL_HEIGHT: 600,
  DEFAULT_TERMINAL_HEIGHT: 240,

  MIN_WINDOW_WIDTH: 1100,
  MIN_WINDOW_HEIGHT: 700,
};

export const DEFAULT_SETTINGS: AppSettings = {
  editor: {
    fontSize: 14,
    tabSize: 2,
    minimap: true,
    wordWrap: 'on',
    lineNumbers: 'on',
  },
  appearance: {
    theme: 'coremind-dark',
    uiScale: 1,
  },
  application: {
    version: '0.1.0',
    platform: 'macOS',
    arch: 'arm64',
  },
};
