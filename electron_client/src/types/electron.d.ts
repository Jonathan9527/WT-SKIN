interface ElectronAPI {
  autoDetectGame: () => Promise<{ found: boolean; gamePath: string; valid: boolean; skinsPath?: string; skinsExist?: boolean; reason?: string }>;
  selectGameFolder: () => Promise<{ canceled: boolean; gamePath?: string; valid?: boolean; skinsPath?: string; skinsExist?: boolean; reason?: string }>;
  validateGamePath: (path: string) => Promise<{ valid: boolean; skinsPath?: string; skinsExist?: boolean; reason?: string }>;
  ensureSkinsDir: (path: string) => Promise<string>;
  winMinimize: () => Promise<void>;
  winMaximize: () => Promise<boolean>;
  winClose: () => Promise<void>;
  winHideToTray: () => Promise<void>;
  winIsMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
