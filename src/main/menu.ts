import { Menu, MenuItemConstructorOptions, app, dialog, BrowserWindow } from 'electron';
import { getMainWindow } from './windows/mainWindow';
import { authorizeWorkspace } from './services/workspaceAuthorization';
import { isMac } from './platform/platform';

export function setupApplicationMenu(): void {
  const mac = isMac();

  const template: MenuItemConstructorOptions[] = [
    ...(mac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mac) {
              app.focus({ steal: true });
            }

            const result = await dialog.showOpenDialog({
              title: 'Open Project Folder',
              buttonLabel: 'Select Folder',
              properties: ['openDirectory', 'createDirectory'],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const selectedPath = result.filePaths[0];
              const win = getMainWindow() || BrowserWindow.getFocusedWindow();
              if (win) {
                win.webContents.send('workspace:open-path', authorizeWorkspace(win.webContents.id, selectedPath));
              }
            }
          },
        },
        { type: 'separator' as const },
        mac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(mac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),

      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
