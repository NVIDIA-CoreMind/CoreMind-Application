/// <reference types="vite/client" />

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.icns' {
  const src: string;
  export default src;
}

declare module '@codingame/monaco-vscode-theme-defaults-default-extension';
declare module '@codingame/monaco-vscode-theme-seti-default-extension';
