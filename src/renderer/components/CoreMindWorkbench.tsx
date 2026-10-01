import React, { useEffect, useState } from 'react';
import { MonacoEditorReactComp } from '@typefox/monaco-editor-react';

import getWorkbenchServiceOverride from '@codingame/monaco-vscode-workbench-service-override';
import getFilesServiceOverride from '@codingame/monaco-vscode-files-service-override';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import getLayoutServiceOverride from '@codingame/monaco-vscode-layout-service-override';
import getViewsServiceOverride from '@codingame/monaco-vscode-views-service-override';
import getQuickAccessServiceOverride from '@codingame/monaco-vscode-quickaccess-service-override';
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override';
import getEnvironmentServiceOverride from '@codingame/monaco-vscode-environment-service-override';
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import getDialogsServiceOverride from '@codingame/monaco-vscode-dialogs-service-override';
import getEditorServiceOverride from '@codingame/monaco-vscode-editor-service-override';
import getLifecycleServiceOverride from '@codingame/monaco-vscode-lifecycle-service-override';
import getConfigurationServiceOverride from '@codingame/monaco-vscode-configuration-service-override';
import * as monaco from 'monaco-editor';
import '@codingame/monaco-vscode-theme-defaults-default-extension';
import '@codingame/monaco-vscode-theme-seti-default-extension';
import '../workers';

let initializedServices = false;

export const CoreMindWorkbench: React.FC = () => {
  const [workbenchContainer, setWorkbenchContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* The container for the VS Code Workbench */}
      <div 
        ref={(el) => setWorkbenchContainer(el)} 
        style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#1e1e1e' }} 
      />

      {workbenchContainer && (
        <MonacoEditorReactComp
          style={{ display: 'none' }}
          vscodeApiConfig={{
            $type: 'extended',
            viewsConfig: {
              $type: 'WorkbenchService',
              htmlContainer: workbenchContainer
            },
            serviceOverrides: {
              ...getWorkbenchServiceOverride(),
              ...getFilesServiceOverride(),
              ...getThemeServiceOverride(),
              ...getTextmateServiceOverride(),
              ...getLayoutServiceOverride(),
              ...getViewsServiceOverride(),
              ...getEditorServiceOverride(),
              ...getQuickAccessServiceOverride(),
              ...getExplorerServiceOverride(),
              ...getEnvironmentServiceOverride(),
              ...getKeybindingsServiceOverride(),
              ...getDialogsServiceOverride(),
              ...getLifecycleServiceOverride(),
              ...getConfigurationServiceOverride(),
            },
            workspaceConfig: {
              workspaceProvider: {
                trusted: true,
                workspace: {
                  folderUri: monaco.Uri.parse('coremind:///Users/manojsarya/Documents/My Projects/CoreMind-Application')
                },
                async open() { return false; }
              }
            },
            userConfiguration: {
              json: JSON.stringify({
                'workbench.colorTheme': 'Default Dark Modern'
              }),
            },
          }}
          editorAppConfig={{
            codeResources: {
              modified: {
                text: 'Welcome to CoreMind IDE',
                uri: '/workspace/welcome.txt',
              },
            }
          }}
          onVscodeApiInitDone={async () => {
            if (!initializedServices) {
              initializedServices = true;
              console.log('VS Code API Initialized via React Wrapper');
              
              // Import vscode API
              const vscode = await import('vscode');
              
              // Register file system after init
              const { CoreMindFileSystemProvider } = await import('../services/CoreMindFileSystemProvider');
              const fsProvider = new CoreMindFileSystemProvider();
              try {
                vscode.workspace.registerFileSystemProvider('coremind', fsProvider, { isCaseSensitive: true, isReadonly: false });
              } catch (e) {
                // Ignore already registered error during HMR
              }
              
              // Wait for the workbench layout to be fully restored
              setTimeout(async () => {
                try {
                  // Open Explorer view by default
                  await vscode.commands.executeCommand('workbench.view.explorer');
    
                  // Force open a new untitled file to make the editor part visible
                  await vscode.commands.executeCommand('workbench.action.files.newUntitledFile');
                  
                  // Open the package.json file
                  const packageUri = vscode.Uri.parse('coremind:///Users/manojsarya/Documents/My Projects/CoreMind-Application/package.json');
                  await vscode.window.showTextDocument(packageUri);
                } catch (e) {
                  console.error('Failed to open file', e);
                }
              }, 1000);
            }
          }}
        />
      )}
    </div>
  );
};
