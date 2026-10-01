import { registerExtension, type RegisterLocalExtensionResult } from '@codingame/monaco-vscode-api/extensions';
import themeUrl from 'material-icon-theme/dist/material-icons.json?no-inline';
import themeJson from 'material-icon-theme/dist/material-icons.json';
import type { IconTheme } from './fileIcons';

// Material icon theme: the single icon source for the Workbench (Explorer, tabs, open editors)
// and for React surfaces (AI Changes, agent timeline).
const svgModules = import.meta.glob('/node_modules/material-icon-theme/icons/*.svg', {
  query: '?no-inline',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const materialIconTheme = themeJson as unknown as IconTheme;

const urlByName = new Map<string, string>();
for (const [modulePath, url] of Object.entries(svgModules)) {
  const name = modulePath.slice(modulePath.lastIndexOf('/') + 1);
  urlByName.set(name, url);
}

export function materialIconUrl(iconId: string): string | undefined {
  const iconPath = materialIconTheme.iconDefinitions[iconId]?.iconPath;
  if (!iconPath) return undefined;
  return urlByName.get(iconPath.slice(iconPath.lastIndexOf('/') + 1));
}

export const MATERIAL_ICON_THEME_ID = 'material-icon-theme';

let registered = false;

// Must run before the Workbench starts so the theme can be selected through configuration.
export function registerMaterialIconTheme(): void {
  if (registered) return;
  registered = true;

  // Manifest-only (no extension host) registration; the runtime result exposes registerFileUrl.
  const { registerFileUrl } = registerExtension(
    {
      name: 'material-icon-theme',
      publisher: 'pkief',
      version: '5.38.1',
      engines: { vscode: '*' },
      contributes: {
        iconThemes: [
          { id: MATERIAL_ICON_THEME_ID, label: 'Material Icon Theme', path: './dist/material-icons.json' },
        ],
      },
    },
    undefined,
    { system: true }
  ) as RegisterLocalExtensionResult;

  registerFileUrl('dist/material-icons.json', themeUrl, { mimeType: 'application/json' });
  for (const [name, url] of urlByName) {
    registerFileUrl(`icons/${name}`, url, { mimeType: 'image/svg+xml' });
  }
}
