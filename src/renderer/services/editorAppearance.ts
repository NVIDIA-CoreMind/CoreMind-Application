import { resolveEffectiveTheme, type ThemeMode } from "../stores/themeStore";

type ConcreteTheme = 'dark' | 'light';

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

const PALETTES: Record<ConcreteTheme, Palette> = {
  dark: {
    colorTheme: "Dark Modern",
    surface: "#1f1f1f",
    raised: "#252526",
    chrome: "#181818",
    border: "#2a2a2a",
    overlay: (alpha) => `#ffffff${alpha}`,
    activeText: "#f3f4f6",
    inactiveText: "#9ca3af",
    statusText: "#9ca3af",
  },
  light: {
    colorTheme: "Light Modern",
    surface: "#ffffff",
    raised: "#f3f3f3",
    chrome: "#f3f3f3",
    border: "#d8d8d8",
    overlay: (alpha) => `#000000${alpha}`,
    activeText: "#1f2328",
    inactiveText: "#57606a",
    statusText: "#57606a",
  },
};

// Antigravity-style editor look: one continuous surface shared with the agent panel, quiet chrome,
// comfortable code typography. Built per theme so Dark/Light switch the whole Workbench.
const TOKEN_COLORS: Record<ConcreteTheme, Record<string, string>> = {
  dark: {
    comment: "#6a9955",
    keyword: "#c586c0",
    storage: "#569cd6",
    string: "#ce9178",
    number: "#b5cea8",
    function: "#dcdcaa",
    type: "#4ec9b0",
    variable: "#9cdcfe",
    constant: "#4fc1ff",
    operator: "#d4d4d4",
    decorator: "#dcdcaa",
    tag: "#569cd6",
    attribute: "#9cdcfe",
    regexp: "#d16969",
  },
  light: {
    comment: "#008000",
    keyword: "#af00db",
    storage: "#0000ff",
    string: "#a31515",
    number: "#098658",
    function: "#795e26",
    type: "#267f99",
    variable: "#001080",
    constant: "#0070c1",
    operator: "#000000",
    decorator: "#795e26",
    tag: "#800000",
    attribute: "#e50000",
    regexp: "#811f3f",
  },
};

function tokenColorRules(theme: ThemeMode) {
  const concreteTheme = resolveEffectiveTheme(theme);
  const c = TOKEN_COLORS[concreteTheme];
  const rule = (scope: string[], foreground: string, fontStyle?: string) => ({
    scope,
    settings: fontStyle ? { foreground, fontStyle } : { foreground },
  });
  return [
    rule(["comment", "punctuation.definition.comment"], c.comment, "italic"),
    rule(
      [
        "keyword",
        "keyword.control",
        "keyword.operator.new",
        "keyword.operator.expression",
        "keyword.operator.logical.python",
      ],
      c.keyword,
    ),
    rule(["storage", "storage.type", "storage.modifier"], c.storage),
    rule(["string", "string.quoted", "string.template"], c.string),
    rule(["constant.numeric"], c.number),
    rule(
      [
        "entity.name.function",
        "support.function",
        "meta.function-call",
        "support.function.builtin",
      ],
      c.function,
    ),
    rule(
      [
        "entity.name.type",
        "entity.name.class",
        "support.class",
        "support.type",
        "entity.other.inherited-class",
      ],
      c.type,
    ),
    rule(
      ["variable", "variable.parameter", "meta.definition.variable"],
      c.variable,
    ),
    rule(
      ["constant.language", "variable.other.constant", "support.constant"],
      c.constant,
    ),
    rule(["keyword.operator"], c.operator),
    rule(["meta.decorator", "entity.name.function.decorator"], c.decorator),
    rule(["entity.name.tag", "meta.tag"], c.tag),
    rule(
      ["entity.other.attribute-name", "support.type.property-name"],
      c.attribute,
    ),
    rule(["string.regexp"], c.regexp),
  ];
}

export function buildEditorConfiguration(
  theme: ThemeMode,
): Record<string, unknown> {
  const concreteTheme = resolveEffectiveTheme(theme);
  const p = PALETTES[concreteTheme];
  return {
    "workbench.colorTheme": p.colorTheme,
    "window.title": "${rootName}${separator}CoreMind${separator}${activeEditorShort}",
    "window.titleSeparator": " - ",
    "window.commandCenter": false,
    "workbench.layoutControl.enabled": false,
    "workbench.tree.indent": 14,
    "workbench.tree.renderIndentGuides": "onHover",
    "workbench.editor.tabActionLocation": "right",
    "workbench.editor.showTabs": "multiple",
    "workbench.list.smoothScrolling": true,
    "editor.fontFamily": "Menlo, Monaco, 'SF Mono', 'Courier New', monospace",
    "editor.fontSize": 14,
    "editor.lineHeight": 24,
    "editor.fontLigatures": false,
    "editor.cursorBlinking": "smooth",
    "editor.cursorSmoothCaretAnimation": "off",
    "editor.smoothScrolling": true,
    "editor.minimap.enabled": true,
    "editor.minimap.renderCharacters": false,
    "editor.renderLineHighlight": "all",
    "editor.bracketPairColorization.enabled": true,
    "editor.guides.bracketPairs": "active",
    "editor.padding.top": 8,
    "workbench.editor.showIcons": true,
    "breadcrumbs.symbolPath": "on",
    "breadcrumbs.icons": true,
    "editor.lineNumbers": "on",
    "editor.guides.indentation": true,
    "editor.scrollBeyondLastLine": false,
    "editor.stickyScroll.enabled": false,
    "breadcrumbs.enabled": true,
    "editor.semanticHighlighting.enabled": true,
    "editor.tokenColorCustomizations": {
      textMateRules: tokenColorRules(theme),
    },
    "workbench.colorCustomizations": {
      "editor.background": p.surface,
      "editorGutter.background": p.surface,
      "editor.lineHighlightBackground": p.overlay("06"),
      "editor.lineHighlightBorder": p.overlay("10"),
      "editor.selectionBackground": "#264f7855",
      "editorIndentGuide.background1": p.overlay("10"),
      "editorIndentGuide.activeBackground1": p.overlay("30"),
      "editorWidget.background": p.raised,
      "breadcrumb.background": p.surface,
      "sideBar.background": p.surface,
      "sideBar.border": p.border,
      "sideBarSectionHeader.background": p.surface,
      "sideBarSectionHeader.border": p.border,
      "list.activeSelectionBackground": p.overlay("12"),
      "list.inactiveSelectionBackground": p.overlay("0c"),
      "list.hoverBackground": p.overlay("08"),
      "activityBar.background": p.chrome,
      "activityBar.border": p.border,
      "activityBar.activeBorder": "#10b981",
      "activityBar.foreground": p.activeText,
      "activityBar.inactiveForeground": p.inactiveText,
      "editorGroupHeader.tabsBackground": p.surface,
      "editorGroupHeader.tabsBorder": p.border,
      "tab.activeBackground": p.surface,
      "tab.inactiveBackground": p.chrome,
      "tab.activeBorderTop": "#10b981",
      "tab.border": p.border,
      "tab.activeForeground": p.activeText,
      "tab.inactiveForeground": p.inactiveText,
      "panel.background": p.surface,
      "panel.border": p.border,
      "statusBar.background": p.chrome,
      "statusBar.foreground": p.statusText,
      "statusBar.border": p.border,
      "titleBar.activeBackground": p.chrome,
      "scrollbarSlider.background": p.overlay("14"),
      "scrollbarSlider.hoverBackground": p.overlay("24"),
    },
  };
}
