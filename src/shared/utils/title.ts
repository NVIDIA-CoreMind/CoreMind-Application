/**
 * Extracts a clean base name from a file path, URI, or folder path.
 */
export function extractBaseName(pathOrName?: string | null): string | null {
  if (!pathOrName) return null;
  const clean = pathOrName.split('?')[0].split('#')[0].replace(/[/\\]+$/, '');
  const parts = clean.split(/[/\\]/).filter(Boolean);
  const base = parts.pop()?.trim() || null;
  return base || null;
}

/**
 * Formats the IDE title according to the requirements:
 * "folderName - ide name - file name , if the folder or the file when its opened or else show only the ide name"
 *
 * Rules:
 * - If both folder and file are opened: `${folderName} - ${ideName} - ${fileName}`
 * - If only folder is opened: `${folderName} - ${ideName}`
 * - If only file is opened: `${ideName} - ${fileName}`
 * - Otherwise: `${ideName}`
 */
export function formatIdeTitle(
  folderName?: string | null,
  fileName?: string | null,
  ideName: string = 'CoreMind'
): string {
  const folder = extractBaseName(folderName);
  const file = extractBaseName(fileName);

  if (folder && file) {
    return `${folder} - ${ideName} - ${file}`;
  }
  if (folder) {
    return `${folder} - ${ideName}`;
  }
  if (file) {
    return `${ideName} - ${file}`;
  }
  return ideName;
}
