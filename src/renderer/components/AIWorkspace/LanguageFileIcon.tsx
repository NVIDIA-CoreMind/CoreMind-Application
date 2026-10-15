import React from 'react';
import { FileCode, FileText } from 'lucide-react';

export const PythonIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 128 128"
    fill="none"
    style={{ flexShrink: 0, verticalAlign: 'middle', display: 'inline-block' }}
  >
    <path
      d="M63.5 1c-34.6 0-32.5 15-32.5 15l.1 15.5h33.1v4.7H20.2S-2 33.6-2 68.4c0 34.6 19.5 33.5 19.5 33.5h11.6V85.4s-.7-19.5 19.3-19.5h32.9s18.6.3 18.6-18.6V20s2.8-19-33.4-19zm-18.4 10.2c5.9 0 10.7 4.8 10.7 10.7 0 5.9-4.8 10.7-10.7 10.7-5.9 0-10.7-4.8-10.7-10.7 0-5.9 4.8-10.7 10.7-10.7z"
      transform="translate(4, 4) scale(0.93)"
      fill="#387EB8"
    />
    <path
      d="M64.5 125c34.6 0 32.5-15 32.5-15l-.1-15.5H63.8v-4.7h44.3s22.2 2.6 22.2-32.2c0-34.6-19.5-33.5-19.5-33.5h-11.6v16.5s.7 19.5-19.3 19.5H47s-18.6-.3-18.6 18.6V106s-2.8 19 33.4 19zm18.4-10.2c-5.9 0-10.7-4.8-10.7-10.7 0-5.9 4.8-10.7 10.7-10.7 5.9 0 10.7 4.8 10.7 10.7 0 5.9-4.8 10.7-10.7z"
      transform="translate(4, 4) scale(0.93)"
      fill="#FFE052"
    />
  </svg>
);

export const TypeScriptIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '2px',
      backgroundColor: '#3178C6',
      color: '#ffffff',
      fontSize: '9px',
      fontWeight: 700,
      fontFamily: 'ui-monospace, sans-serif',
      flexShrink: 0,
      lineHeight: 1,
    }}
  >
    TS
  </span>
);

export const JavaScriptIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '2px',
      backgroundColor: '#F7DF1E',
      color: '#000000',
      fontSize: '9px',
      fontWeight: 700,
      fontFamily: 'ui-monospace, sans-serif',
      flexShrink: 0,
      lineHeight: 1,
    }}
  >
    JS
  </span>
);

export const LanguageFileIcon: React.FC<{ filename: string; size?: number }> = ({
  filename,
  size = 14,
}) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (ext === 'py') {
    return <PythonIcon size={size} />;
  }
  if (ext === 'ts' || ext === 'tsx') {
    return <TypeScriptIcon size={size} />;
  }
  if (ext === 'js' || ext === 'jsx') {
    return <JavaScriptIcon size={size} />;
  }
  if (ext === 'rs') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '2px',
          backgroundColor: '#DEA584',
          color: '#000',
          fontSize: '9px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        RS
      </span>
    );
  }
  if (ext === 'go') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: '2px',
          backgroundColor: '#00ACD7',
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        GO
      </span>
    );
  }
  if (ext === 'json') {
    return (
      <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '11px', fontFamily: 'monospace' }}>
        &#123;&#125;
      </span>
    );
  }
  if (ext === 'md') {
    return <FileText size={size} color="#94A3B8" />;
  }

  return <FileCode size={size} color="#94A3B8" />;
};
