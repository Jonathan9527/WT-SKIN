const { app, net, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const CACHE_DIR = path.join(app.getPath('userData'), 'app_cache');
const IMAGE_DIR = path.join(CACHE_DIR, 'images');
const DATA_DIR = path.join(CACHE_DIR, 'data');

const DATA_TTL = 30 * 60 * 1000;   // API 数据 30 分钟
const IMAGE_TTL = 7 * 24 * 3600 * 1000; // 图片 7 天

function ensureDirs() {
  [CACHE_DIR, IMAGE_DIR, DATA_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function urlHash(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

// ---- 图片缓存 ----

function getCacheFileName(url) {
  const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
  return urlHash(url) + ext;
}

function getImageCachePath(url) {
  return path.join(IMAGE_DIR, getCacheFileName(url));
}

function isImageCached(url) {
  const p = getImageCachePath(url);
  if (!fs.existsSync(p)) return false;
  const age = Date.now() - fs.statSync(p).mtimeMs;
  if (age > IMAGE_TTL) { try { fs.unlinkSync(p); } catch {} return false; }
  return true;
}

async function cacheImage(url) {
  if (!url || !url.startsWith('http')) return url;
  const cachePath = getImageCachePath(url);
  const cachedUrl = 'cached-img://' + getCacheFileName(url);

  if (isImageCached(url)) return cachedUrl;

  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(cachePath, buffer);
    return cachedUrl;
  } catch {
    return url;
  }
}

async function cacheImages(urls) {
  const results = {};
  const tasks = urls.map(async (url) => {
    results[url] = await cacheImage(url);
  });
  await Promise.all(tasks);
  return results;
}

// ---- 数据缓存 ----

function getDataCacheKey(endpoint, params) {
  const sorted = Object.keys(params || {}).sort().map(k => `${k}=${params[k]}`).join('&');
  return urlHash(endpoint + '?' + sorted);
}

function getDataCache(endpoint, params) {
  const key = getDataCacheKey(endpoint, params);
  const p = path.join(DATA_DIR, key + '.json');
  if (!fs.existsSync(p)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (Date.now() - raw.timestamp > DATA_TTL) {
      try { fs.unlinkSync(p); } catch {}
      return null;
    }
    return raw.data;
  } catch {
    return null;
  }
}

function setDataCache(endpoint, params, data) {
  const key = getDataCacheKey(endpoint, params);
  const p = path.join(DATA_DIR, key + '.json');
  try {
    fs.writeFileSync(p, JSON.stringify({ timestamp: Date.now(), data }), 'utf-8');
  } catch {}
}

function clearAllCache() {
  [IMAGE_DIR, DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      try { fs.unlinkSync(path.join(dir, f)); } catch {}
    });
  });
}

function getCacheStats() {
  let imageCount = 0, imageSize = 0, dataCount = 0, dataSize = 0;
  if (fs.existsSync(IMAGE_DIR)) {
    const files = fs.readdirSync(IMAGE_DIR);
    imageCount = files.length;
    files.forEach(f => { try { imageSize += fs.statSync(path.join(IMAGE_DIR, f)).size; } catch {} });
  }
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    dataCount = files.length;
    files.forEach(f => { try { dataSize += fs.statSync(path.join(DATA_DIR, f)).size; } catch {} });
  }
  return { imageCount, imageSize, dataCount, dataSize, totalSize: imageSize + dataSize };
}

module.exports = {
  ensureDirs, cacheImage, cacheImages,
  getDataCache, setDataCache,
  clearAllCache, getCacheStats,
  IMAGE_DIR,
};
