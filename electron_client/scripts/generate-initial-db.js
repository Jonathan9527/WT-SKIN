/**
 * 生成初始 SQLite 数据包
 * 从 vehicles_complete.json 导入载具数据
 * 用法: node scripts/generate-initial-db.js
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(OUTPUT_DIR, 'wt_skins.db');
const VEHICLES_JSON = path.join(__dirname, '..', '..', 'server', 'data', 'vehicles_complete.json');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 删除旧文件
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

console.log('创建 SQLite 数据库...');
const db = new Database(DB_PATH);

// 创建表
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

// 导入载具数据
if (fs.existsSync(VEHICLES_JSON)) {
  console.log('导入载具数据...');
  const data = JSON.parse(fs.readFileSync(VEHICLES_JSON, 'utf-8'));

  const stmt = db.prepare(`INSERT OR REPLACE INTO vehicles 
    (wt_live_id, name, name_cn, type, country, class, rank, br, skin_count, image_url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertMany = db.transaction((vehicles) => {
    for (const v of vehicles) {
      stmt.run(
        v.wt_live_id || v.id || '',
        v.name || '',
        v.name_cn || '',
        v.type || '',
        v.country || '',
        v.class || v.vehicle_class || '',
        v.rank || 0,
        v.br || 0,
        v.skin_count || 0,
        v.image_url || '',
        v.description || ''
      );
    }
  });

  // vehicles_complete.json 结构: { vehicles: { id: { name, count, vehicleCountry: [], vehicleType: [], vehicleClass: [] } } }
  let allVehicles = [];
  if (data.vehicles && typeof data.vehicles === 'object') {
    for (const [id, v] of Object.entries(data.vehicles)) {
      allVehicles.push({
        wt_live_id: id,
        name: v.name || id,
        name_cn: '',
        type: Array.isArray(v.vehicleType) ? v.vehicleType[0] || '' : '',
        country: Array.isArray(v.vehicleCountry) ? v.vehicleCountry[0] || '' : '',
        class: Array.isArray(v.vehicleClass) ? v.vehicleClass[0] || '' : '',
        rank: 0,
        br: 0,
        skin_count: v.count || 0,
        image_url: '',
        description: '',
      });
    }
  } else if (Array.isArray(data)) {
    allVehicles = data;
  }

  if (allVehicles.length > 0) {
    insertMany(allVehicles);
    console.log(`导入 ${allVehicles.length} 个载具`);
  } else {
    console.log('未找到载具数据，跳过');
  }
} else {
  console.log('未找到 vehicles_complete.json，跳过载具导入');
}

// 写入元数据
const now = new Date();
db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`).run('version', now.toISOString().replace(/[-:T]/g, '').slice(0, 14));
db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`).run('created_at', now.toISOString());
db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`).run('type', 'initial');

// 创建索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_skins_vehicle_type ON skins(vehicle_type);
  CREATE INDEX IF NOT EXISTS idx_skins_vehicle_countries ON skins(vehicle_countries);
  CREATE INDEX IF NOT EXISTS idx_skins_vehicle_class ON skins(vehicle_class);
  CREATE INDEX IF NOT EXISTS idx_skins_likes ON skins(likes);
  CREATE INDEX IF NOT EXISTS idx_skins_views ON skins(views);
  CREATE INDEX IF NOT EXISTS idx_skins_downloads ON skins(downloads);
  CREATE INDEX IF NOT EXISTS idx_skins_created_ts ON skins(created_ts);
  CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
  CREATE INDEX IF NOT EXISTS idx_vehicles_country ON vehicles(country);
  CREATE INDEX IF NOT EXISTS idx_vehicles_class ON vehicles(class);
  CREATE INDEX IF NOT EXISTS idx_skin_images_skin_id ON skin_images(skin_id);
  CREATE INDEX IF NOT EXISTS idx_skin_vehicles_skin_id ON skin_vehicles(skin_id);
`);

db.exec('VACUUM');

const stats = db.prepare('SELECT COUNT(*) as count FROM vehicles').get();
const fileSize = fs.statSync(DB_PATH).size;

console.log(`\n初始数据包生成完成:`);
console.log(`  路径: ${DB_PATH}`);
console.log(`  载具: ${stats.count}`);
console.log(`  大小: ${(fileSize / 1024).toFixed(1)} KB`);

db.close();
