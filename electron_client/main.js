const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const https = require('https');
const http = require('http');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const cache = require('./cache');

let mainWindow;
let tray = null;
let isQuitting = false;

// ---- 游戏路径持久化 ----
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {}
  return {};
}

function saveSettings(data) {
  const current = loadSettings();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...current, ...data }), 'utf-8');
}

function getGamePath() {
  return loadSettings().gamePath || '';
}

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
  if (gamePath) {
    const result = { found: true, gamePath, ...validateGamePath(gamePath) };
    if (result.valid) saveSettings({ gamePath });
    return result;
  }
  return { found: false, gamePath: '', valid: false };
});

ipcMain.handle('select-game-folder', async () => {
  const result = await dialog.showOpenDialog({ title: '选择 War Thunder 安装目录', properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const gamePath = result.filePaths[0];
  const validation = validateGamePath(gamePath);
  if (validation.valid) saveSettings({ gamePath });
  return { canceled: false, gamePath, ...validation };
});

ipcMain.handle('validate-game-path', (_, gamePath) => validateGamePath(gamePath));

ipcMain.handle('ensure-skins-dir', (_, gamePath) => {
  const skinsDir = path.join(gamePath, 'UserSkins');
  if (!fs.existsSync(skinsDir)) fs.mkdirSync(skinsDir, { recursive: true });
  return skinsDir;
});

// 注册自定义协议（必须在 app.whenReady 之前）
protocol.registerSchemesAsPrivileged([
  { scheme: 'cached-img', privileges: { bypassCSP: true, supportFetchAPI: true, stream: true } },
  { scheme: 'cached-img-local', privileges: { bypassCSP: true, supportFetchAPI: true, stream: true } },
]);

app.whenReady().then(() => {
  cache.ensureDirs();

  // 注册协议处理器：cached-img://filename -> 本地缓存文件
  protocol.handle('cached-img', (request) => {
    const fileName = decodeURIComponent(request.url.replace('cached-img://', ''));
    const filePath = path.join(cache.IMAGE_DIR, fileName);
    return net.fetch(pathToFileURL(filePath).href);
  });

  // 注册协议处理器：cached-img-local:///absolutePath -> 本地任意文件
  protocol.handle('cached-img-local', (request) => {
    // URL 格式: cached-img-local:///D:/path/to/file
    let filePath = decodeURIComponent(request.url.replace(/^cached-img-local:\/\/\/?/, ''));
    const fileUrl = pathToFileURL(filePath).href;
    return net.fetch(fileUrl);
  });

  createWindow();
  createTray();

  // 缓存 IPC
  ipcMain.handle('cache-images', (_, urls) => cache.cacheImages(urls));
  ipcMain.handle('cache-get-data', (_, endpoint, params) => cache.getDataCache(endpoint, params));
  ipcMain.handle('cache-set-data', (_, endpoint, params, data) => { cache.setDataCache(endpoint, params, data); return true; });
  ipcMain.handle('cache-clear', () => { cache.clearAllCache(); return true; });
  ipcMain.handle('cache-stats', () => cache.getCacheStats());

  // 获取持久化的游戏路径
  ipcMain.handle('get-game-path', () => getGamePath());

  // 获取已安装的皮肤列表
  ipcMain.handle('get-installed-skins', () => {
    const gamePath = getGamePath();
    if (!gamePath) return { success: false, skins: [], error: '未设置游戏路径' };
    const skinsDir = path.join(gamePath, 'UserSkins');
    if (!fs.existsSync(skinsDir)) return { success: true, skins: [] };

    const skins = [];
    const dirs = fs.readdirSync(skinsDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const dir of dirs) {
      const dirPath = path.join(skinsDir, dir.name);
      const jsonPath = path.join(dirPath, 'skin_info.json');
      if (!fs.existsSync(jsonPath)) continue;
      try {
        const info = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        // 查找封面图片
        let coverFile = '';
        const files = fs.readdirSync(dirPath);
        const cover = files.find(f => /^cover\.\w+$/i.test(f));
        if (cover) coverFile = 'cached-img-local:///' + path.join(dirPath, cover).replace(/\\/g, '/');
        skins.push({ ...info, folderName: dir.name, coverFile, dirPath });
      } catch {}
    }
    return { success: true, skins };
  });

  // 删除已安装的皮肤
  ipcMain.handle('delete-installed-skin', (_, folderName) => {
    const gamePath = getGamePath();
    if (!gamePath) return { success: false, error: '未设置游戏路径' };
    const skinDir = path.join(gamePath, 'UserSkins', folderName);
    if (!fs.existsSync(skinDir)) return { success: false, error: '目录不存在' };
    try {
      fs.rmSync(skinDir, { recursive: true, force: true });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // 启动游戏
  ipcMain.handle('launch-game', () => {
    const gamePath = getGamePath();
    if (!gamePath) return { success: false, error: '请先在设置中配置游戏路径' };
    const launcher = path.join(gamePath, 'launcher.exe');
    if (!fs.existsSync(launcher)) return { success: false, error: '未找到 launcher.exe' };
    try {
      require('child_process').exec(`"${launcher}"`, { cwd: gamePath });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // 下载涂装到 UserSkins 目录
  ipcMain.handle('download-skin', async (_, skinData) => {
    const gamePath = getGamePath();
    if (!gamePath) return { success: false, error: '未设置游戏路径，请先在设置中配置' };

    const skinsDir = path.join(gamePath, 'UserSkins');
    if (!fs.existsSync(skinsDir)) fs.mkdirSync(skinsDir, { recursive: true });

    const fileName = skinData.file_name || `skin_${skinData.wt_live_id}.zip`;
    const skinName = path.basename(fileName, path.extname(fileName)).replace(/[<>:"/\\|?*]/g, '_');
    const skinDir = path.join(skinsDir, skinName);
    const tempFile = path.join(skinsDir, fileName);

    try {
      // 下载文件（带进度推送）
      const onProgress = (received, total) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            skinId: skinData.wt_live_id,
            received, total,
            percent: Math.round((received / total) * 100),
          });
        }
      };
      await downloadFile(skinData.file_url, tempFile, 5, onProgress);

      // 解压 zip
      if (fileName.endsWith('.zip')) {
        await unzipFile(tempFile, skinDir);
        try { fs.unlinkSync(tempFile); } catch {}
      }

      // 写入涂装详情 JSON
      const info = {
        wt_live_id: skinData.wt_live_id,
        title: skinData.title,
        author: skinData.author,
        author_id: skinData.author_id,
        description: skinData.description,
        vehicle_type: skinData.vehicle_type,
        vehicle_country: skinData.vehicle_country,
        vehicle_class: skinData.vehicle_class,
        vehicle_name: skinData.vehicle_name,
        likes: skinData.likes,
        views: skinData.views,
        downloads: skinData.downloads,
        comments: skinData.comments,
        file_name: skinData.file_name,
        file_size: skinData.file_size,
        image_url: skinData.image_url,
        lang_group: skinData.lang_group,
        downloaded_at: new Date().toISOString(),
      };
      if (!fs.existsSync(skinDir)) fs.mkdirSync(skinDir, { recursive: true });
      fs.writeFileSync(path.join(skinDir, 'skin_info.json'), JSON.stringify(info, null, 2), 'utf-8');

      // 下载封面图片
      const imgUrl = skinData.image_url || '';
      if (imgUrl) {
        try {
          if (imgUrl.startsWith('cached-img://')) {
            // 从本地缓存复制
            const cachedFileName = decodeURIComponent(imgUrl.replace('cached-img://', ''));
            const cachedPath = path.join(cache.IMAGE_DIR, cachedFileName);
            if (fs.existsSync(cachedPath)) {
              const ext = path.extname(cachedFileName) || '.jpg';
              fs.copyFileSync(cachedPath, path.join(skinDir, 'cover' + ext));
            }
          } else if (imgUrl.startsWith('http')) {
            const ext = path.extname(new URL(imgUrl).pathname).split('?')[0] || '.jpg';
            await downloadFile(imgUrl, path.join(skinDir, 'cover' + ext));
          }
        } catch {}
      }

      // skin_info.json 中保存原始 HTTP URL（如果有的话）
      // 尝试从缓存映射还原原始 URL 不现实，保持现状即可

      return { success: true, path: skinDir };
    } catch (e) {
      return { success: false, error: e.message || '下载失败' };
    }
  });
});

app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---- 工具函数 ----

function downloadFile(url, dest, maxRedirects = 5, onProgress = null) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('重定向次数过多'));
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'WT-Skin-Downloader/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const u = new URL(url);
          redirectUrl = u.protocol + '//' + u.host + redirectUrl;
        }
        return downloadFile(redirectUrl, dest, maxRedirects - 1, onProgress).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let receivedBytes = 0;
      const file = createWriteStream(dest);
      res.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (onProgress && totalBytes > 0) {
          onProgress(receivedBytes, totalBytes);
        }
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (e) => { try { fs.unlinkSync(dest); } catch {} reject(e); });
    }).on('error', reject);
  });
}

function unzipFile(zipPath, destDir) {
  const yauzl = require('yauzl');
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        const fullPath = path.join(destDir, entry.fileName);
        if (/\/$/.test(entry.fileName)) {
          fs.mkdirSync(fullPath, { recursive: true });
          zipfile.readEntry();
        } else {
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);
            const writeStream = createWriteStream(fullPath);
            readStream.pipe(writeStream);
            writeStream.on('close', () => zipfile.readEntry());
          });
        }
      });
      zipfile.on('end', resolve);
      zipfile.on('error', reject);
    });
  });
}
