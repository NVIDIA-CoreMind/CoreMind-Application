import type { ThemeMode } from '../stores/themeStore';

interface Palette {
  colorTheme: string;
  surface: string;
  raised: string;
  chrome: string;
  border: string;
  overlay: (alpha: string) => string;
  activeText: string;
  inactiveText: string;
  statusText: string;
}

const PALETTES: Record<ThemeMode, Palette> = {
  dark: {
    colorTheme: 'Default Dark Modern',
    surface: '#181818',
    raised: '#1f1f1f',
    chrome: '#141414',
    border: '#2a2a2a',
    overlay: (alpha) => `#ffffff${alpha}`,
    activeText: '#f3f4f6',
    inactiveText: '#9ca3af',
    statusText: '#9ca3af',
  },
  light: {
    colorTheme: 'Default Light Modern',
    surface: '#ffffff',
    raised: '#f3f3f3',
    chrome: '#f3f3f3',
    border: '#d8d8d8',
    overlay: (alpha) => `#000000${alpha}`,
    activeText: '#1f2328',
    inactiveText: '#57606a',
    statusText: '#57606a',
  },
};

// Antigravity-style editor look: one continuous surface shared with the agent panel, quiet chrome,
// comfortable code typography. Built per theme so Dark/Light switch the whole Workbench.
export function buildEditorConfiguration(theme: ThemeMode): Record<string, unknown> {
  const p = PALETTES[theme];
  return {
  'workbench.colorTheme': p.colorTheme,
  'workbench.tree.indent': 14,
  'workbench.tree.renderIndentGuides': 'onHover',
  'workbench.editor.tabActionLocation': 'right',
  'workbench.editor.showTabs': 'multiple',
  'workbench.list.smoothScrolling': true,
  'editor.fontFamily': "'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
  'editor.fontSize': 13,
  'editor.lineHeight': 21,
  'editor.fontLigatures': true,
  'editor.cursorBlinking': 'smooth',
  'editor.cursorSmoothCaretAnimation': 'on',
  'editor.smoothScrolling': true,
  'editor.minimap.enabled': false,
  'editor.renderLineHighlight': 'gutter',
  'editor.bracketPairColorization.enabled': true,
  'editor.guides.bracketPairs': 'active',
  'editor.padding.top': 12,
  'editor.scrollBeyondLastLine': false,
  'editor.stickyScroll.enabled': false,
  'breadcrumbs.enabled': true,
  'workbench.colorCustomizations': {
    'editor.background': p.surface,
    'editorGutter.background': p.surface,
    'editor.lineHighlightBackground': p.overlay('08'),
    'editor.selectionBackground': '#264f7855',
    'editorIndentGuide.background1': p.overlay('10'),
    'editorIndentGuide.activeBackground1': p.overlay('30'),
    'editorWidget.background': p.raised,
    'breadcrumb.background': p.surface,
    'sideBar.background': p.surface,
    'sideBar.border': p.border,
    'sideBarSectionHeader.background': p.surface,
    'sideBarSectionHeader.border': p.border,
    'list.activeSelectionBackground': p.overlay('12'),
    'list.inactiveSelectionBackground': p.overlay('0c'),
    'list.hoverBackground': p.overlay('08'),
    'activityBar.background': p.chrome,
    'activityBar.border': p.border,
    'activityBar.activeBorder': '#10b981',
    'activityBar.foreground': p.activeText,
    'activityBar.inactiveForeground': p.inactiveText,
    'editorGroupHeader.tabsBackground': p.surface,
    'editorGroupHeader.tabsBorder': p.border,
    'tab.activeBackground': p.surface,
    'tab.inactiveBackground': p.chrome,
    'tab.activeBorderTop': '#10b981',
    'tab.border': p.border,
    'tab.activeForeground': p.activeText,
    'tab.inactiveForeground': p.inactiveText,
    'panel.background': p.surface,
    'panel.border': p.border,
    'statusBar.background': p.chrome,
    'statusBar.foreground': p.statusText,
    'statusBar.border': p.border,
    'titleBar.activeBackground': p.chrome,
    'scrollbarSlider.background': p.overlay('14'),
    'scrollbarSlider.hoverBackground': p.overlay('24'),
  },
  };
}
