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
  // 本地数据库
  dbQuerySkins: (params: Record<string, any>) => Promise<{ list: any[]; total: number; page: number }>;
  dbQueryVehicles: (params: Record<string, any>) => Promise<any[]>;
  dbGetSkinDetail: (id: number) => Promise<{ skin: any; images: any[]; vehicles: any[] } | null>;
  dbGetLocalVersion: () => Promise<{ version: string | null; skinCount: number; vehicleCount: number }>;
  dbGetStats: () => Promise<{ skinCount: number; vehicleCount: number; version: string | null; fileSize: number; dbPath: string }>;
  dbSyncDatapack: (serverUrl: string) => Promise<{ success: boolean; version?: string; skinCount?: number; vehicleCount?: number; error?: string }>;
  onDbSyncProgress: (callback: (data: { downloaded: number; total: number; percent: number }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
