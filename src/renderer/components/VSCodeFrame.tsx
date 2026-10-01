import React, { useEffect, useRef } from 'react';
import { initialize } from '@codingame/monaco-vscode-api';
import getWorkbenchServiceOverride from '@codingame/monaco-vscode-workbench-service-override';
import getFilesServiceOverride from '@codingame/monaco-vscode-files-service-override';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import '@codingame/monaco-vscode-theme-defaults-default-extension';
import '@codingame/monaco-vscode-theme-seti-default-extension';

// Using monaco-vscode-api to embed the native workbench
export const VSCodeFrame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const initVSCode = async () => {
      if (!containerRef.current) return;
      try {
        // Initialize Monaco VS Code API and pass the container div
        await initialize(
          {
            ...getWorkbenchServiceOverride(),
            ...getFilesServiceOverride(),
            ...getThemeServiceOverride(),
            ...getTextmateServiceOverride(),
          },
          containerRef.current
        );

        if (isMounted) {
          console.log('VS Code API initialized');
        }
      } catch (err) {
        console.error('Failed to initialize VS Code API', err);
      }
    };

    // Since initialize is global and can only be called once, we must handle it carefully
    initVSCode();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="vscode-container"
      style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#1e1e1e' }}
    />
  );
};
