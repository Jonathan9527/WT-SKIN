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
});
