/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

import { ElectronAPI } from './types';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
