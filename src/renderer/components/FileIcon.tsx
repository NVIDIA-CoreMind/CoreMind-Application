import React from 'react';
import { resolveIconId } from '../services/fileIcons';
import { materialIconTheme, materialIconUrl } from '../services/materialIcons';

interface FileIconProps {
  path: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({ path, size = 14 }) => {
  const url = materialIconUrl(resolveIconId(materialIconTheme, path));
  return url ? (
    <img src={url} alt="" aria-hidden width={size} height={size} style={{ flexShrink: 0, display: 'block' }} />
  ) : (
    <span style={{ width: size, height: size, flexShrink: 0 }} />
  );
};
