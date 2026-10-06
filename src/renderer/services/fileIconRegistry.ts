import { resolveIconId } from './fileIcons';
import { materialIconTheme, materialIconUrl } from './materialIcons';

class FileIconRegistry {
  /**
   * Automatically detects the file extension/name and resolves the appropriate
   * programming-language icon URL from the material icon theme.
   */
  public getIconUrl(filePath: string): string | undefined {
    const iconId = resolveIconId(materialIconTheme, filePath);
    return materialIconUrl(iconId);
  }
}

export const fileIconRegistry = new FileIconRegistry();
