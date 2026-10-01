import React from 'react';
import setiTheme from '@codingame/monaco-vscode-theme-seti-default-extension/resources/vs-seti-icon-theme.json';
import setiFontUrl from '@codingame/monaco-vscode-theme-seti-default-extension/resources/seti.woff?url';
import { resolveSetiIcon, SetiIconTheme } from '../services/fileIcons';

const FONT_FAMILY = 'CoreMindSeti';
let fontInjected = false;

function ensureFont(): void {
  if (fontInjected || typeof document === 'undefined') return;
  fontInjected = true;
  const style = document.createElement('style');
  style.textContent = `@font-face { font-family: '${FONT_FAMILY}'; src: url('${setiFontUrl}') format('woff'); }`;
  document.head.appendChild(style);
}

interface FileIconProps {
  path: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({ path, size = 14 }) => {
  ensureFont();
  const icon = resolveSetiIcon(setiTheme as unknown as SetiIconTheme, path);
  return (
    <span
      aria-hidden
      style={{
        fontFamily: `'${FONT_FAMILY}'`,
        fontSize: `${size * 1.5}px`,
        lineHeight: `${size}px`,
        width: `${size + 2}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: icon?.color ?? '#9ca3af',
        overflow: 'hidden',
      }}
    >
      {icon?.character ?? ''}
    </span>
  );
};
