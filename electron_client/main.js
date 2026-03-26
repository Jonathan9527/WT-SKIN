const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960, height: 720, resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.setMenuBarVisibility(false);
  const isDev = !app.isPackaged;
  isDev ? mainWindow.loadURL('http://localhost:5173') : mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // 点击关闭按钮时隐藏到托盘而非退出
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // 窗口控制 IPC
  ipcMain.handle('win-minimize', () => mainWindow.minimize());
  ipcMain.handle('win-maximize', () => {
    if (mainWindow.isMaximized()) { mainWindow.unmaximize(); } else { mainWindow.maximize(); }
    return mainWindow.isMaximized();
  });
  ipcMain.handle('win-close', () => mainWindow.close());
  ipcMain.handle('win-hide-to-tray', () => mainWindow.hide());
  ipcMain.handle('win-is-maximized', () => mainWindow.isMaximized());
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('WT 涂装下载器');
  tray.setContextMenu(contextMenu);

  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// 自动搜索 War Thunder 安装目录
function findWarThunderPath() {
  const candidates = [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\War Thunder',
    'C:\\Program Files\\Steam\\steamapps\\common\\War Thunder',
    'D:\\Steam\\steamapps\\common\\War Thunder',
    'D:\\SteamLibrary\\steamapps\\common\\War Thunder',
    'E:\\Steam\\steamapps\\common\\War Thunder',
    'E:\\SteamLibrary\\steamapps\\common\\War Thunder',
    'F:\\Steam\\steamapps\\common\\War Thunder',
    'F:\\SteamLibrary\\steamapps\\common\\War Thunder',
    'C:\\Program Files\\War Thunder',
    'C:\\Program Files (x86)\\War Thunder',
    'D:\\War Thunder', 'E:\\War Thunder',
    'D:\\Games\\War Thunder', 'E:\\Games\\War Thunder',
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'aces.exe')) || fs.existsSync(path.join(dir, 'launcher.exe'))) return dir;
  }
  return '';
}

function validateGamePath(gamePath) {
  if (!gamePath || !fs.existsSync(gamePath)) return { valid: false, reason: '路径不存在' };
  const hasExe = fs.existsSync(path.join(gamePath, 'aces.exe')) || fs.existsSync(path.join(gamePath, 'launcher.exe'));
  if (!hasExe) return { valid: false, reason: '未找到游戏可执行文件' };
  const skinsDir = path.join(gamePath, 'UserSkins');
  return { valid: true, skinsPath: skinsDir, skinsExist: fs.existsSync(skinsDir) };
}

ipcMain.handle('auto-detect-game', () => {
  const gamePath = findWarThunderPath();
  if (gamePath) return { found: true, gamePath, ...validateGamePath(gamePath) };
  return { found: false, gamePath: '', valid: false };
});

ipcMain.handle('select-game-folder', async () => {
  const result = await dialog.showOpenDialog({ title: '选择 War Thunder 安装目录', properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const gamePath = result.filePaths[0];
  return { canceled: false, gamePath, ...validateGamePath(gamePath) };
});

ipcMain.handle('validate-game-path', (_, gamePath) => validateGamePath(gamePath));

ipcMain.handle('ensure-skins-dir', (_, gamePath) => {
  const skinsDir = path.join(gamePath, 'UserSkins');
  if (!fs.existsSync(skinsDir)) fs.mkdirSync(skinsDir, { recursive: true });
  return skinsDir;
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
