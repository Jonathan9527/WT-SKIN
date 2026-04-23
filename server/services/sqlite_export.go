package services

import (
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"warthunder-server/database"
	"warthunder-server/models"

	_ "github.com/mattn/go-sqlite3"
)

// DataPackInfo 数据包信息
type DataPackInfo struct {
	Version      string    `json:"version"`
	Hash         string    `json:"hash"`
	Size         int64     `json:"size"`
	SkinCount    int       `json:"skin_count"`
	VehicleCount int       `json:"vehicle_count"`
	Published    bool      `json:"published"`
	CreatedAt    time.Time `json:"created_at"`
	FileName     string    `json:"file_name"`
	FilePath     string    `json:"-"`
}

var (
	publishedPack *DataPackInfo
	allPacks      []*DataPackInfo
	packMu        sync.RWMutex
	packsDir      = filepath.Join("data", "packs")
	metaFile      = filepath.Join("data", "packs", "meta.json")
)

// PackMeta 持久化的元数据
type PackMeta struct {
	PublishedVersion string `json:"published_version"`
}

func init() {
	os.MkdirAll(packsDir, 0755)
}

// LoadPackMeta 启动时加载元数据，扫描已有数据包
func LoadPackMeta() {
	packMu.Lock()
	defer packMu.Unlock()

	// 扫描已有数据包
	allPacks = scanPacks()

	// 读取发布信息
	meta := loadMeta()
	if meta.PublishedVersion != "" {
		for _, p := range allPacks {
			if p.Version == meta.PublishedVersion {
				p.Published = true
				publishedPack = p
				// 确保 latest.db 指向已发布版本
				copyFile(p.FilePath, filepath.Join(packsDir, "latest.db"))
				break
			}
		}
	}

	log.Printf("[数据包] 已加载 %d 个数据包，已发布版本: %s", len(allPacks), meta.PublishedVersion)
}

// GetPublishedPack 获取已发布的数据包信息
func GetPublishedPack() *DataPackInfo {
	packMu.RLock()
	defer packMu.RUnlock()
	return publishedPack
}

// GetAllPacks 获取所有数据包列表
func GetAllPacks() []*DataPackInfo {
	packMu.RLock()
	defer packMu.RUnlock()
	result := make([]*DataPackInfo, len(allPacks))
	copy(result, allPacks)
	return result
}

// PublishPack 发布指定版本的数据包
func PublishPack(version string) (*DataPackInfo, error) {
	packMu.Lock()
	defer packMu.Unlock()

	var target *DataPackInfo
	for _, p := range allPacks {
		p.Published = false
		if p.Version == version {
			target = p
		}
	}

	if target == nil {
		return nil, fmt.Errorf("数据包版本 %s 不存在", version)
	}

	target.Published = true
	publishedPack = target

	// 复制为 latest.db
	if err := copyFile(target.FilePath, filepath.Join(packsDir, "latest.db")); err != nil {
		return nil, fmt.Errorf("复制 latest.db 失败: %v", err)
	}

	// 保存元数据
	saveMeta(PackMeta{PublishedVersion: version})

	log.Printf("[数据包] 已发布版本: %s", version)
	return target, nil
}

// DeletePack 删除指定版本的数据包
func DeletePack(version string) error {
	packMu.Lock()
	defer packMu.Unlock()

	idx := -1
	for i, p := range allPacks {
		if p.Version == version {
			if p.Published {
				return fmt.Errorf("不能删除已发布的数据包")
			}
			idx = i
			break
		}
	}

	if idx == -1 {
		return fmt.Errorf("数据包版本 %s 不存在", version)
	}

	// 删除文件
	os.Remove(allPacks[idx].FilePath)
	allPacks = append(allPacks[:idx], allPacks[idx+1:]...)

	log.Printf("[数据包] 已删除版本: %s", version)
	return nil
}

// GenerateSQLiteDataPack 从 MySQL 导出数据到 SQLite 数据包
func GenerateSQLiteDataPack() (*DataPackInfo, error) {
	log.Println("[SQLite导出] 开始生成数据包...")

	os.MkdirAll(packsDir, 0755)

	version := time.Now().Format("20060102150405")
	dbPath := filepath.Join(packsDir, fmt.Sprintf("wt_skins_%s.db", version))

	sqliteDB, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL")
	if err != nil {
		return nil, fmt.Errorf("创建 SQLite 数据库失败: %v", err)
	}
	defer sqliteDB.Close()

	if err := createSQLiteTables(sqliteDB); err != nil {
		os.Remove(dbPath)
		return nil, fmt.Errorf("创建表结构失败: %v", err)
	}

	skinCount, err := exportSkins(sqliteDB)
	if err != nil {
		os.Remove(dbPath)
		return nil, fmt.Errorf("导出涂装数据失败: %v", err)
	}

	vehicleCount, err := exportVehicles(sqliteDB)
	if err != nil {
		os.Remove(dbPath)
		return nil, fmt.Errorf("导出载具数据失败: %v", err)
	}

	if err := exportSkinImages(sqliteDB); err != nil {
		os.Remove(dbPath)
		return nil, fmt.Errorf("导出涂装图片失败: %v", err)
	}

	if err := exportSkinVehicles(sqliteDB); err != nil {
		os.Remove(dbPath)
		return nil, fmt.Errorf("导出涂装载具关联失败: %v", err)
	}

	sqliteDB.Exec(`INSERT INTO meta (key, value) VALUES (?, ?), (?, ?), (?, ?)`,
		"version", version,
		"created_at", time.Now().Format(time.RFC3339),
		"skin_count", fmt.Sprintf("%d", skinCount),
	)

	createSQLiteIndexes(sqliteDB)
	sqliteDB.Exec("VACUUM")
	sqliteDB.Close()

	fileInfo, _ := os.Stat(dbPath)
	data, _ := os.ReadFile(dbPath)
	hash := fmt.Sprintf("%x", md5.Sum(data))

	info := &DataPackInfo{
		Version:      version,
		Hash:         hash,
		Size:         fileInfo.Size(),
		SkinCount:    skinCount,
		VehicleCount: vehicleCount,
		Published:    false,
		CreatedAt:    time.Now(),
		FileName:     filepath.Base(dbPath),
		FilePath:     dbPath,
	}

	packMu.Lock()
	allPacks = append(allPacks, info)
	// 按版本倒序
	sort.Slice(allPacks, func(i, j int) bool { return allPacks[i].Version > allPacks[j].Version })
	packMu.Unlock()

	log.Printf("[SQLite导出] 数据包生成完成: %s (涂装: %d, 载具: %d, 大小: %.2f MB)",
		version, skinCount, vehicleCount, float64(fileInfo.Size())/1024/1024)

	return info, nil
}

// ---- 内部工具函数 ----

func scanPacks() []*DataPackInfo {
	var packs []*DataPackInfo
	entries, err := os.ReadDir(packsDir)
	if err != nil {
		return packs
	}
	for _, e := range entries {
		name := e.Name()
		if !strings.HasPrefix(name, "wt_skins_") || !strings.HasSuffix(name, ".db") {
			continue
		}
		version := strings.TrimPrefix(name, "wt_skins_")
		version = strings.TrimSuffix(version, ".db")

		fPath := filepath.Join(packsDir, name)
		fi, err := os.Stat(fPath)
		if err != nil {
			continue
		}

		data, err := os.ReadFile(fPath)
		hash := ""
		if err == nil {
			hash = fmt.Sprintf("%x", md5.Sum(data))
		}

		// 尝试读取 SQLite 元数据
		skinCount, vehicleCount := readPackCounts(fPath)

		packs = append(packs, &DataPackInfo{
			Version:      version,
			Hash:         hash,
			Size:         fi.Size(),
			SkinCount:    skinCount,
			VehicleCount: vehicleCount,
			CreatedAt:    fi.ModTime(),
			FileName:     name,
			FilePath:     fPath,
		})
	}
	sort.Slice(packs, func(i, j int) bool { return packs[i].Version > packs[j].Version })
	return packs
}

func readPackCounts(dbPath string) (int, int) {
	db, err := sql.Open("sqlite3", dbPath+"?mode=ro")
	if err != nil {
		return 0, 0
	}
	defer db.Close()

	var skinCount, vehicleCount int
	db.QueryRow("SELECT COUNT(*) FROM skins").Scan(&skinCount)
	db.QueryRow("SELECT COUNT(*) FROM vehicles").Scan(&vehicleCount)
	return skinCount, vehicleCount
}

func loadMeta() PackMeta {
	var meta PackMeta
	data, err := os.ReadFile(metaFile)
	if err != nil {
		return meta
	}
	json.Unmarshal(data, &meta)
	return meta
}

func saveMeta(meta PackMeta) {
	data, _ := json.MarshalIndent(meta, "", "  ")
	os.WriteFile(metaFile, data, 0644)
}

// ---- SQLite 导出函数（不变）----

func createSQLiteTables(db *sql.DB) error {
	tables := `
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
	CREATE TABLE IF NOT EXISTS skin_images (id INTEGER PRIMARY KEY, skin_id INTEGER, url TEXT, sort INTEGER DEFAULT 0);
	CREATE TABLE IF NOT EXISTS skin_vehicles (id INTEGER PRIMARY KEY, skin_id INTEGER, vehicle_id TEXT);
	CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
	`
	_, err := db.Exec(tables)
	return err
}

func createSQLiteIndexes(db *sql.DB) {
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_skins_vehicle_type ON skins(vehicle_type)",
		"CREATE INDEX IF NOT EXISTS idx_skins_vehicle_countries ON skins(vehicle_countries)",
		"CREATE INDEX IF NOT EXISTS idx_skins_vehicle_class ON skins(vehicle_class)",
		"CREATE INDEX IF NOT EXISTS idx_skins_author ON skins(author)",
		"CREATE INDEX IF NOT EXISTS idx_skins_likes ON skins(likes)",
		"CREATE INDEX IF NOT EXISTS idx_skins_views ON skins(views)",
		"CREATE INDEX IF NOT EXISTS idx_skins_downloads ON skins(downloads)",
		"CREATE INDEX IF NOT EXISTS idx_skins_created_ts ON skins(created_ts)",
		"CREATE INDEX IF NOT EXISTS idx_skins_wt_live_id ON skins(wt_live_id)",
		"CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type)",
		"CREATE INDEX IF NOT EXISTS idx_vehicles_country ON vehicles(country)",
		"CREATE INDEX IF NOT EXISTS idx_vehicles_class ON vehicles(class)",
		"CREATE INDEX IF NOT EXISTS idx_skin_images_skin_id ON skin_images(skin_id)",
		"CREATE INDEX IF NOT EXISTS idx_skin_vehicles_skin_id ON skin_vehicles(skin_id)",
		"CREATE INDEX IF NOT EXISTS idx_skin_vehicles_vehicle_id ON skin_vehicles(vehicle_id)",
	}
	for _, idx := range indexes {
		db.Exec(idx)
	}
}

func exportSkins(sqliteDB *sql.DB) (int, error) {
	var skins []models.Skin
	if err := database.DB.Find(&skins).Error; err != nil {
		return 0, err
	}
	tx, _ := sqliteDB.Begin()
	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO skins 
		(id, wt_live_id, lang_group, title, description, author, author_id, author_avatar,
		 vehicle_type, vehicle_countries, vehicle_class, vehicle_name, tags, image_url, images,
		 file_url, file_name, file_size, file_type, downloads, likes, views, comments,
		 featured, pbr_ready, created_ts, created_at, updated_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
	if err != nil {
		tx.Rollback()
		return 0, err
	}
	defer stmt.Close()
	for _, s := range skins {
		f, p := 0, 0
		if s.Featured { f = 1 }
		if s.PbrReady { p = 1 }
		stmt.Exec(s.ID, s.WTLiveID, s.LangGroup, s.Title, s.Description, s.Author, s.AuthorID, s.AuthorAvatar,
			s.VehicleType, s.VehicleCountries, s.VehicleClass, s.VehicleName, s.Tags, s.ImageURL, s.Images,
			s.FileURL, s.FileName, s.FileSize, s.FileType, s.Downloads, s.Likes, s.Views, s.Comments,
			f, p, s.CreatedTS, s.CreatedAt.Format(time.RFC3339), s.UpdatedAt.Format(time.RFC3339))
	}
	tx.Commit()
	return len(skins), nil
}

func exportVehicles(sqliteDB *sql.DB) (int, error) {
	var vehicles []models.Vehicle
	if err := database.DB.Find(&vehicles).Error; err != nil {
		return 0, err
	}
	tx, _ := sqliteDB.Begin()
	stmt, _ := tx.Prepare(`INSERT OR REPLACE INTO vehicles 
		(id, wt_live_id, name, name_cn, type, country, class, rank, br, skin_count, image_url, description)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
	defer stmt.Close()
	for _, v := range vehicles {
		stmt.Exec(v.ID, v.WTLiveID, v.Name, v.NameCN, v.Type, v.Country, v.Class, v.Rank, v.BR, v.SkinCount, v.ImageURL, v.Description)
	}
	tx.Commit()
	return len(vehicles), nil
}

func exportSkinImages(sqliteDB *sql.DB) error {
	var images []models.SkinImage
	if err := database.DB.Find(&images).Error; err != nil {
		return err
	}
	tx, _ := sqliteDB.Begin()
	stmt, _ := tx.Prepare(`INSERT OR REPLACE INTO skin_images (id, skin_id, url, sort) VALUES (?,?,?,?)`)
	defer stmt.Close()
	for _, img := range images {
		stmt.Exec(img.ID, img.SkinID, img.URL, img.Sort)
	}
	return tx.Commit()
}

func exportSkinVehicles(sqliteDB *sql.DB) error {
	var svs []models.SkinVehicle
	if err := database.DB.Find(&svs).Error; err != nil {
		return err
	}
	tx, _ := sqliteDB.Begin()
	stmt, _ := tx.Prepare(`INSERT OR REPLACE INTO skin_vehicles (id, skin_id, vehicle_id) VALUES (?,?,?)`)
	defer stmt.Close()
	for _, sv := range svs {
		stmt.Exec(sv.ID, sv.SkinID, sv.VehicleID)
	}
	return tx.Commit()
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}
