export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  minimap: boolean;
  wordWrap: 'on' | 'off';
  lineNumbers: 'on' | 'off';
}

export interface AppearanceSettings {
  theme: string;
  uiScale: number;
}

export interface ApplicationSettings {
  version: string;
  platform: string;
  arch: string;
}

export interface AppSettings {
  editor: EditorSettings;
  appearance: AppearanceSettings;
  application: ApplicationSettings;
}
