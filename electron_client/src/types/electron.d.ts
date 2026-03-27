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
  // 缓存
  cacheImages: (urls: string[]) => Promise<Record<string, string>>;
  cacheGetData: (endpoint: string, params: Record<string, any>) => Promise<any | null>;
  cacheSetData: (endpoint: string, params: Record<string, any>, data: any) => Promise<boolean>;
  cacheClear: () => Promise<boolean>;
  cacheStats: () => Promise<{ imageCount: number; imageSize: number; dataCount: number; dataSize: number; totalSize: number }>;
  // 下载
  getGamePath: () => Promise<string>;
  downloadSkin: (skinData: Record<string, any>) => Promise<{ success: boolean; path?: string; error?: string }>;
  onDownloadProgress: (callback: (data: { skinId: number; received: number; total: number; percent: number }) => void) => () => void;
  // 皮肤管理
  getInstalledSkins: () => Promise<{ success: boolean; skins: any[]; error?: string }>;
  deleteInstalledSkin: (folderName: string) => Promise<{ success: boolean; error?: string }>;
  // 启动游戏
  launchGame: () => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
