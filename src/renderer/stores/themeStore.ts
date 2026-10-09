import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

export function resolveEffectiveTheme(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        if (query && typeof query.matches === 'boolean') {
          return query.matches ? 'dark' : 'light';
        }
      } catch {
        // fallback
      }
    }
    return 'dark';
  }
  return theme;
}

const STORAGE_KEY = 'coremind:theme';

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
    return 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: ThemeMode): void {
  const effective = resolveEffectiveTheme(theme);
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = effective;
  }
  if (typeof window !== 'undefined') {
    try {
      const isDark = effective === 'dark';
      window.coreMindAPI?.setTitleBarOverlay?.({
        color: isDark ? '#1E1E1E' : '#ffffff',
        symbolColor: isDark ? '#9A9A9A' : '#57606a',
        height: 36,
      });
    } catch {
      // ignore
    }
  }
}

interface ThemeStore {
  theme: ThemeMode;
  effectiveTheme: () => 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: readStoredTheme(),
  effectiveTheme: () => resolveEffectiveTheme(get().theme),
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Preference is best-effort.
    }
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const current = resolveEffectiveTheme(get().theme);
    get().setTheme(current === 'dark' ? 'light' : 'dark');
  },
}));

if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    if (useThemeStore.getState().theme === 'system') {
      applyTheme('system');
      useThemeStore.setState({ theme: 'system' });
    }
  };
  if (mql.addEventListener) {
    mql.addEventListener('change', handleSystemChange);
  } else if ((mql as any).addListener) {
    (mql as any).addListener(handleSystemChange);
  }
}

applyTheme(useThemeStore.getState().theme);
