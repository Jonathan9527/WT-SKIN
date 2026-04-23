const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  autoDetectGame: () => ipcRenderer.invoke('auto-detect-game'),
  selectGameFolder: () => ipcRenderer.invoke('select-game-folder'),
  validateGamePath: (path) => ipcRenderer.invoke('validate-game-path', path),
  ensureSkinsDir: (path) => ipcRenderer.invoke('ensure-skins-dir', path),
  // 窗口控制
  winMinimize: () => ipcRenderer.invoke('win-minimize'),
  winMaximize: () => ipcRenderer.invoke('win-maximize'),
  winClose: () => ipcRenderer.invoke('win-close'),
  winHideToTray: () => ipcRenderer.invoke('win-hide-to-tray'),
  winIsMaximized: () => ipcRenderer.invoke('win-is-maximized'),
  // 缓存
  cacheImages: (urls) => ipcRenderer.invoke('cache-images', urls),
  cacheGetData: (endpoint, params) => ipcRenderer.invoke('cache-get-data', endpoint, params),
  cacheSetData: (endpoint, params, data) => ipcRenderer.invoke('cache-set-data', endpoint, params, data),
  cacheClear: () => ipcRenderer.invoke('cache-clear'),
  cacheStats: () => ipcRenderer.invoke('cache-stats'),
  // 下载
  getGamePath: () => ipcRenderer.invoke('get-game-path'),
  downloadSkin: (skinData) => ipcRenderer.invoke('download-skin', skinData),
  onDownloadProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  // 皮肤管理
  getInstalledSkins: () => ipcRenderer.invoke('get-installed-skins'),
  deleteInstalledSkin: (folderName) => ipcRenderer.invoke('delete-installed-skin', folderName),
  // 启动游戏
  launchGame: () => ipcRenderer.invoke('launch-game'),
  // 本地数据库
  dbQuerySkins: (params) => ipcRenderer.invoke('db-query-skins', params),
  dbQueryVehicles: (params) => ipcRenderer.invoke('db-query-vehicles', params),
  dbGetSkinDetail: (id) => ipcRenderer.invoke('db-get-skin-detail', id),
  dbGetLocalVersion: () => ipcRenderer.invoke('db-get-local-version'),
  dbGetStats: () => ipcRenderer.invoke('db-get-stats'),
  dbSyncDatapack: (serverUrl) => ipcRenderer.invoke('db-sync-datapack', serverUrl),
  onDbSyncProgress: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('db-sync-progress', handler);
    return () => ipcRenderer.removeListener('db-sync-progress', handler);
  },
});
