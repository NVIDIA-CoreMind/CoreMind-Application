import React from 'react';
import { fileIconRegistry } from '../services/fileIconRegistry';

interface FileIconProps {
  path: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({ path, size = 14 }) => {
  const url = fileIconRegistry.getIconUrl(path);
  return url ? (
    <img src={url} alt="" aria-hidden width={size} height={size} style={{ flexShrink: 0, display: 'block' }} />
  ) : (
    <span style={{ width: size, height: size, flexShrink: 0 }} />
  );
};
