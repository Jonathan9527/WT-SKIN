/**
 * 从 MySQL 导出完整 SQLite 数据包（涂装 + 载具 + 图片 + 关联）
 * 用法: node scripts/generate-full-db.js
 */
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(OUTPUT_DIR, 'wt_skins.db');

const MYSQL_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'wtuser',
  password: 'wtpassword',
  database: 'warthunder',
};

async function main() {
  console.log('连接 MySQL...');
  const conn = await mysql.createConnection(MYSQL_CONFIG);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  console.log('创建 SQLite 数据库...');
  const db = new Database(DB_PATH);

  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS skins (
      id INTEGER PRIMARY KEY, wt_live_id INTEGER UNIQUE, lang_group INTEGER,
      title TEXT, description TEXT, author TEXT, author_id INTEGER, author_avatar TEXT,
      vehicle_type TEXT, vehicle_countries TEXT, vehicle_class TEXT, vehicle_name TEXT,
      tags TEXT, image_url TEXT, images TEXT, file_url TEXT, file_name TEXT,
      file_size INTEGER DEFAULT 0, file_type TEXT,
      downloads INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, views INTEGER DEFAULT 0, comments INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0, pbr_ready INTEGER DEFAULT 0, created_ts INTEGER DEFAULT 0,
      created_at TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY, wt_live_id TEXT UNIQUE, name TEXT, name_cn TEXT,
      type TEXT, country TEXT, class TEXT, rank INTEGER DEFAULT 0, br REAL DEFAULT 0,
      skin_count INTEGER DEFAULT 0, image_url TEXT, description TEXT
    );
    CREATE TABLE IF NOT EXISTS skin_images (
      id INTEGER PRIMARY KEY, skin_id INTEGER, url TEXT, sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS skin_vehicles (
      id INTEGER PRIMARY KEY, skin_id INTEGER, vehicle_id TEXT
    );
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
  `);

  // 导出涂装
  console.log('导出涂装数据...');
  const [skins] = await conn.query('SELECT * FROM skins WHERE deleted_at IS NULL');
  const skinStmt = db.prepare(`INSERT OR REPLACE INTO skins 
    (id, wt_live_id, lang_group, title, description, author, author_id, author_avatar,
     vehicle_type, vehicle_countries, vehicle_class, vehicle_name, tags, image_url, images,
     file_url, file_name, file_size, file_type, downloads, likes, views, comments,
     featured, pbr_ready, created_ts, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const insertSkins = db.transaction((rows) => {
    for (const s of rows) {
      skinStmt.run(
        s.id, s.wt_live_id, s.lang_group, s.title, s.description, s.author, s.author_id, s.author_avatar,
        s.vehicle_type, s.vehicle_countries, s.vehicle_class, s.vehicle_name, s.tags, s.image_url, s.images,
        s.file_url, s.file_name, s.file_size, s.file_type, s.downloads, s.likes, s.views, s.comments,
        s.featured ? 1 : 0, s.pbr_ready ? 1 : 0, s.created_ts || 0,
        s.created_at ? new Date(s.created_at).toISOString() : '',
        s.updated_at ? new Date(s.updated_at).toISOString() : ''
      );
    }
  });
  insertSkins(skins);
  console.log(`  涂装: ${skins.length}`);

  // 导出载具
  console.log('导出载具数据...');
  const [vehicles] = await conn.query('SELECT * FROM vehicles');
  const vStmt = db.prepare(`INSERT OR REPLACE INTO vehicles 
    (id, wt_live_id, name, name_cn, type, country, class, rank, br, skin_count, image_url, description)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertVehicles = db.transaction((rows) => {
    for (const v of rows) {
      vStmt.run(v.id, v.wt_live_id, v.name, v.name_cn || '', v.type, v.country, v.class, v.rank || 0, v.br || 0, v.skin_count || 0, v.image_url || '', v.description || '');
    }
  });
  insertVehicles(vehicles);
  console.log(`  载具: ${vehicles.length}`);

  // 导出涂装图片
  console.log('导出涂装图片...');
  const [images] = await conn.query('SELECT * FROM skin_images');
  const imgStmt = db.prepare('INSERT OR REPLACE INTO skin_images (id, skin_id, url, sort) VALUES (?,?,?,?)');
  const insertImages = db.transaction((rows) => {
    for (const img of rows) imgStmt.run(img.id, img.skin_id, img.url, img.sort || 0);
  });
  insertImages(images);
  console.log(`  图片: ${images.length}`);

  // 导出涂装-载具关联
  console.log('导出涂装载具关联...');
  const [svs] = await conn.query('SELECT * FROM skin_vehicles');
  const svStmt = db.prepare('INSERT OR REPLACE INTO skin_vehicles (id, skin_id, vehicle_id) VALUES (?,?,?)');
  const insertSVs = db.transaction((rows) => {
    for (const sv of rows) svStmt.run(sv.id, sv.skin_id, sv.vehicle_id);
  });
  insertSVs(svs);
  console.log(`  关联: ${svs.length}`);

  // 写入元数据
  const now = new Date();
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run('version', now.toISOString().replace(/[-:T]/g, '').slice(0, 14));
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run('created_at', now.toISOString());
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run('skin_count', String(skins.length));
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run('vehicle_count', String(vehicles.length));

  // 创建索引
  console.log('创建索引...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_skins_vehicle_type ON skins(vehicle_type);
    CREATE INDEX IF NOT EXISTS idx_skins_vehicle_countries ON skins(vehicle_countries);
    CREATE INDEX IF NOT EXISTS idx_skins_vehicle_class ON skins(vehicle_class);
    CREATE INDEX IF NOT EXISTS idx_skins_author ON skins(author);
    CREATE INDEX IF NOT EXISTS idx_skins_likes ON skins(likes);
    CREATE INDEX IF NOT EXISTS idx_skins_views ON skins(views);
    CREATE INDEX IF NOT EXISTS idx_skins_downloads ON skins(downloads);
    CREATE INDEX IF NOT EXISTS idx_skins_created_ts ON skins(created_ts);
    CREATE INDEX IF NOT EXISTS idx_skins_wt_live_id ON skins(wt_live_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
    CREATE INDEX IF NOT EXISTS idx_vehicles_country ON vehicles(country);
    CREATE INDEX IF NOT EXISTS idx_vehicles_class ON vehicles(class);
    CREATE INDEX IF NOT EXISTS idx_skin_images_skin_id ON skin_images(skin_id);
    CREATE INDEX IF NOT EXISTS idx_skin_vehicles_skin_id ON skin_vehicles(skin_id);
    CREATE INDEX IF NOT EXISTS idx_skin_vehicles_vehicle_id ON skin_vehicles(vehicle_id);
  `);

  db.exec('VACUUM');
  db.close();
  await conn.end();

  const fileSize = fs.statSync(DB_PATH).size;
  console.log(`\n完整数据包生成完成:`);
  console.log(`  路径: ${DB_PATH}`);
  console.log(`  涂装: ${skins.length}`);
  console.log(`  载具: ${vehicles.length}`);
  console.log(`  图片: ${images.length}`);
  console.log(`  关联: ${svs.length}`);
  console.log(`  大小: ${(fileSize / 1048576).toFixed(1)} MB`);
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
