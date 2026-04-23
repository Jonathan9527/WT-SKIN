const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const https = require('https');
const http = require('http');

let db = null;
const DB_DIR = path.join(app.getPath('userData'), 'data');
const DB_PATH = path.join(DB_DIR, 'wt_skins.db');

// 初始化数据库
function initDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  try {
    if (!fs.existsSync(DB_PATH)) {
      // 尝试从内置初始数据包复制
      const bundledDB = getBundledDBPath();
      if (bundledDB && fs.existsSync(bundledDB)) {
        fs.copyFileSync(bundledDB, DB_PATH);
        console.log('[LocalDB] 已从内置数据包初始化:', bundledDB);
      } else {
        // 没有内置数据包，创建空数据库
        console.log('[LocalDB] 未找到内置数据包，创建空数据库');
        createEmptyDB();
        return db;
      }
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    return db;
  } catch (e) {
    console.error('[LocalDB] 初始化数据库失败:', e.message);
    db = null;
    return null;
  }
}

// 获取内置数据包路径（开发模式 vs 打包模式）
function getBundledDBPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    // 开发模式：electron_client/data/wt_skins.db
    return path.join(__dirname, 'data', 'wt_skins.db');
  } else {
    // 打包模式：resources/data/wt_skins.db
    return path.join(process.resourcesPath, 'data', 'wt_skins.db');
  }
}

// 创建空数据库
function createEmptyDB() {
  db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS skins (
      id INTEGER PRIMARY KEY,
      wt_live_id INTEGER UNIQUE,
      lang_group INTEGER,
      title TEXT,
      description TEXT,
      author TEXT,
      author_id INTEGER,
      author_avatar TEXT,
      vehicle_type TEXT,
      vehicle_countries TEXT,
      vehicle_class TEXT,
      vehicle_name TEXT,
      tags TEXT,
      image_url TEXT,
      images TEXT,
      file_url TEXT,
      file_name TEXT,
      file_size INTEGER DEFAULT 0,
      file_type TEXT,
      downloads INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      pbr_ready INTEGER DEFAULT 0,
      created_ts INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY,
      wt_live_id TEXT UNIQUE,
      name TEXT,
      name_cn TEXT,
      type TEXT,
      country TEXT,
      class TEXT,
      rank INTEGER DEFAULT 0,
      br REAL DEFAULT 0,
      skin_count INTEGER DEFAULT 0,
      image_url TEXT,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS skin_images (
      id INTEGER PRIMARY KEY,
      skin_id INTEGER,
      url TEXT,
      sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS skin_vehicles (
      id INTEGER PRIMARY KEY,
      skin_id INTEGER,
      vehicle_id TEXT
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// 获取数据库实例
function getDB() {
  if (!db) {
    try { initDB(); } catch (e) { console.error('[LocalDB] getDB 失败:', e.message); }
  }
  return db;
}

// 关闭数据库
function closeDB() {
  if (db) {
    try { db.close(); } catch (e) { console.error('[LocalDB] 关闭数据库失败:', e.message); }
    db = null;
  }
}

// 查询涂装列表
function querySkins({ vehicleType, vehicleCountry, vehicleClass, vehicle, sort, period, search, page, pageSize }) {
  const database = getDB();
  if (!database) return { list: [], total: 0, page: 0 };
  const conditions = [];
  const params = [];

  if (vehicleType && vehicleType !== 'any') {
    conditions.push('vehicle_type = ?');
    params.push(vehicleType);
  }
  if (vehicleCountry && vehicleCountry !== 'any') {
    conditions.push('vehicle_countries LIKE ?');
    params.push(`%${vehicleCountry}%`);
  }
  if (vehicleClass && vehicleClass !== 'any') {
    conditions.push('vehicle_class = ?');
    params.push(vehicleClass);
  }
  if (vehicle && vehicle !== 'any') {
    // 通过 skin_vehicles 关联查询
    conditions.push('id IN (SELECT skin_id FROM skin_vehicles WHERE vehicle_id = ?)');
    params.push(vehicle);
  }
  if (search) {
    conditions.push('(title LIKE ? OR author LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (period && period > 0) {
    const since = Math.floor(Date.now() / 1000) - period * 86400;
    conditions.push('created_ts >= ?');
    params.push(since);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // 排序
  let orderBy = 'created_ts DESC';
  switch (sort) {
    case 'likes': orderBy = 'likes DESC'; break;
    case 'views': orderBy = 'views DESC'; break;
    case 'downloads': orderBy = 'downloads DESC'; break;
    case 'created': default: orderBy = 'created_ts DESC'; break;
  }

  const offset = (page || 0) * (pageSize || 9);
  const limit = pageSize || 9;

  // 查询总数
  const countRow = database.prepare(`SELECT COUNT(*) as total FROM skins ${where}`).get(...params);
  const total = countRow ? countRow.total : 0;

  // 查询列表
  const skins = database.prepare(
    `SELECT * FROM skins ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  // 转换 boolean 字段
  const list = skins.map(s => ({
    ...s,
    featured: !!s.featured,
    pbr_ready: !!s.pbr_ready,
  }));

  return { list, total, page: page || 0 };
}

// 查询载具列表
function queryVehicles({ type, country, class: vehicleClass }) {
  const database = getDB();
  if (!database) return [];
  const conditions = [];
  const params = [];

  if (type && type !== 'any') {
    conditions.push('type = ?');
    params.push(type);
  }
  if (country && country !== 'any') {
    conditions.push('country = ?');
    params.push(country);
  }
  if (vehicleClass && vehicleClass !== 'any') {
    conditions.push('class = ?');
    params.push(vehicleClass);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  return database.prepare(`SELECT * FROM vehicles ${where} ORDER BY skin_count DESC`).all(...params);
}

// 获取涂装详情
function getSkinDetail(id) {
  const database = getDB();
  if (!database) return null;
  const skin = database.prepare('SELECT * FROM skins WHERE id = ?').get(id);
  if (!skin) return null;

  skin.featured = !!skin.featured;
  skin.pbr_ready = !!skin.pbr_ready;

  const images = database.prepare('SELECT * FROM skin_images WHERE skin_id = ? ORDER BY sort ASC').all(id);
  const vehicles = database.prepare(
    `SELECT v.* FROM vehicles v 
     JOIN skin_vehicles sv ON sv.vehicle_id = v.wt_live_id 
     WHERE sv.skin_id = ?`
  ).all(id);

  return { skin, images, vehicles };
}

// 获取本地数据包版本
function getLocalVersion() {
  const database = getDB();
  try {
    const row = database.prepare("SELECT value FROM meta WHERE key = 'version'").get();
    const countRow = database.prepare('SELECT COUNT(*) as count FROM skins').get();
    const vehicleRow = database.prepare('SELECT COUNT(*) as count FROM vehicles').get();
    return {
      version: row ? row.value : null,
      skinCount: countRow ? countRow.count : 0,
      vehicleCount: vehicleRow ? vehicleRow.count : 0,
    };
  } catch (e) {
    return { version: null, skinCount: 0, vehicleCount: 0 };
  }
}

// 下载并替换数据包
function downloadDataPack(serverUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const downloadUrl = `${serverUrl}/client/datapack/download`;
    const tempPath = path.join(DB_DIR, 'wt_skins_download.tmp');

    // 先关闭数据库，释放文件锁
    closeDB();

    // 清理可能残留的临时文件
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }

    const file = fs.createWriteStream(tempPath);

    const protocol = downloadUrl.startsWith('https') ? https : http;

    const request = protocol.get(downloadUrl, (response) => {
      if (response.statusCode !== 200) {
        fs.unlinkSync(tempPath);
        reject(new Error(`下载失败: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10) || 0;
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (onProgress && totalSize > 0) {
          onProgress({ downloaded, total: totalSize, percent: Math.round(downloaded / totalSize * 100) });
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          // 验证下载的文件是有效的 SQLite 数据库
          try {
            const testDb = new Database(tempPath, { readonly: true });
            const row = testDb.prepare("SELECT COUNT(*) as count FROM skins").get();
            testDb.close();

            if (!row || row.count === 0) {
              fs.unlinkSync(tempPath);
              initDB(); // 重新打开原数据库
              reject(new Error('数据包为空'));
              return;
            }

            // 替换文件
            if (fs.existsSync(DB_PATH)) {
              try { fs.unlinkSync(DB_PATH); } catch (e) {}
            }
            // 清理 WAL 文件
            if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
            if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');

            fs.renameSync(tempPath, DB_PATH);

            // 重新打开数据库
            initDB();

            const info = getLocalVersion();
            resolve(info);
          } catch (e) {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            initDB(); // 出错时重新打开原数据库
            reject(new Error(`数据包验证失败: ${e.message}`));
          }
        });
      });
    });

    request.on('error', (err) => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      initDB(); // 出错时重新打开原数据库
      reject(new Error(`下载失败: ${err.message}`));
    });

    request.setTimeout(60000, () => {
      request.destroy();
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      initDB();
      reject(new Error('下载超时'));
    });
  });
}

// 获取数据库统计
function getDBStats() {
  const database = getDB();
  try {
    const skinCount = database.prepare('SELECT COUNT(*) as count FROM skins').get();
    const vehicleCount = database.prepare('SELECT COUNT(*) as count FROM vehicles').get();
    const version = database.prepare("SELECT value FROM meta WHERE key = 'version'").get();
    const fileSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
    return {
      skinCount: skinCount ? skinCount.count : 0,
      vehicleCount: vehicleCount ? vehicleCount.count : 0,
      version: version ? version.value : null,
      fileSize,
      dbPath: DB_PATH,
    };
  } catch (e) {
    return { skinCount: 0, vehicleCount: 0, version: null, fileSize: 0, dbPath: DB_PATH };
  }
}

module.exports = {
  initDB,
  getDB,
  closeDB,
  querySkins,
  queryVehicles,
  getSkinDetail,
  getLocalVersion,
  downloadDataPack,
  getDBStats,
};
