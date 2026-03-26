package models

import (
	"time"

	"gorm.io/gorm"
)

// User 用户表
type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Username  string         `gorm:"uniqueIndex;size:50" json:"username"`
	Password  string         `gorm:"size:255" json:"-"`
	Nickname  string         `gorm:"size:100" json:"nickname"`
	Avatar    string         `gorm:"size:500" json:"avatar"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// Skin 涂装表
type Skin struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	WTLiveID       int            `gorm:"uniqueIndex" json:"wt_live_id"`
	LangGroup      int            `gorm:"index" json:"lang_group"`
	Title          string         `gorm:"size:500" json:"title"`
	Description    string         `gorm:"type:text" json:"description"`
	Author         string         `gorm:"size:100" json:"author"`
	AuthorID       int            `json:"author_id"`
	AuthorAvatar   string         `gorm:"size:500" json:"author_avatar"`
	VehicleType    string         `gorm:"size:50;index" json:"vehicle_type"`
	VehicleCountries string       `gorm:"type:text" json:"vehicle_countries"` // JSON 数组存储多个国家
	VehicleClass   string         `gorm:"size:50" json:"vehicle_class"`
	VehicleName    string         `gorm:"size:100" json:"vehicle_name"`
	Tags           string         `gorm:"type:text" json:"tags"` // JSON 数组存储标签
	ImageURL       string         `gorm:"size:500" json:"image_url"`
	Images         string         `gorm:"type:text" json:"images"`
	FileURL        string         `gorm:"size:500" json:"file_url"`
	FileName       string         `gorm:"size:255" json:"file_name"`
	FileSize       int64          `json:"file_size"`
	FileType       string         `gorm:"size:50" json:"file_type"`
	Downloads      int            `gorm:"default:0" json:"downloads"`
	Likes          int            `gorm:"default:0" json:"likes"`
	Views          int            `gorm:"default:0" json:"views"`
	Comments       int            `gorm:"default:0" json:"comments"`
	Featured       bool           `gorm:"default:false" json:"featured"`
	PbrReady       bool           `gorm:"default:false" json:"pbr_ready"`
	CreatedTS      int64          `json:"created_ts"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// Download 下载记录表
type Download struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	SkinID    uint      `gorm:"index" json:"skin_id"`
	CreatedAt time.Time `json:"created_at"`
}

// Favorite 收藏表
type Favorite struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	SkinID    uint      `gorm:"index" json:"skin_id"`
	CreatedAt time.Time `json:"created_at"`
}

// Tag 标签表
type Tag struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"uniqueIndex;size:100" json:"name"`
	Count     int       `gorm:"default:0" json:"count"` // 使用次数
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SkinTag 涂装-标签关联表
type SkinTag struct {
	ID     uint `gorm:"primaryKey" json:"id"`
	SkinID uint `gorm:"index" json:"skin_id"`
	TagID  uint `gorm:"index" json:"tag_id"`
}

// SkinImage 涂装图片表
type SkinImage struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	SkinID uint   `gorm:"index" json:"skin_id"`
	URL    string `gorm:"size:500" json:"url"`
	Sort   int    `gorm:"default:0" json:"sort"`
}

// Vehicle 载具表
type Vehicle struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	WTLiveID    string    `gorm:"uniqueIndex;size:100" json:"wt_live_id"` // War Thunder Live 中的载具ID
	Name        string    `gorm:"size:200;index" json:"name"`              // 载具名称
	NameCN      string    `gorm:"size:200" json:"name_cn"`                 // 中文名称
	Type        string    `gorm:"size:50;index" json:"type"`               // 载具类型: tank, aircraft, helicopter, ship
	Country     string    `gorm:"size:50;index" json:"country"`            // 国家
	Class       string    `gorm:"size:50;index" json:"class"`              // 子类型
	Rank        int       `gorm:"index" json:"rank"`                       // 等级
	BR          float64   `json:"br"`                                      // 战斗评级
	SkinCount   int       `gorm:"default:0;index" json:"skin_count"`       // 涂装数量（从 War Thunder Live 获取）
	ImageURL    string    `gorm:"size:500" json:"image_url"`               // 载具图片
	Description string    `gorm:"type:text" json:"description"`            // 描述
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// SkinVehicle 涂装-载具关联表（多对多）
type SkinVehicle struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	SkinID    uint      `gorm:"index" json:"skin_id"`       // 涂装ID
	VehicleID string    `gorm:"index;size:100" json:"vehicle_id"` // 载具ID（使用 WTLiveID）
	CreatedAt time.Time `json:"created_at"`
}

// SyncLog 同步日志表
type SyncLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	SessionID string    `gorm:"size:100;index" json:"session_id"` // 同步会话ID
	Type      string    `gorm:"size:50" json:"type"`              // 日志类型: info, error, progress, complete
	Message   string    `gorm:"type:text" json:"message"`         // 日志消息
	URL       string    `gorm:"size:1000" json:"url"`             // 请求URL
	Data      string    `gorm:"type:text" json:"data"`            // 额外数据（JSON格式）
	CreatedAt time.Time `json:"created_at"`
}

// SyncSession 同步会话表
type SyncSession struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	SessionID      string     `gorm:"uniqueIndex;size:100" json:"session_id"` // 会话ID
	VehicleType    string     `gorm:"size:50" json:"vehicle_type"`            // 载具类型
	VehicleCountry string     `gorm:"size:50" json:"vehicle_country"`         // 国家
	VehicleClass   string     `gorm:"size:50" json:"vehicle_class"`           // 子类型
	Status         string     `gorm:"size:50;index" json:"status"`            // 状态: running, completed, error
	Total          int        `json:"total"`                                  // 总数
	Current        int        `json:"current"`                                // 当前进度
	NewCount       int        `json:"new_count"`                              // 新增数量
	ExistCount     int        `json:"exist_count"`                            // 已存在数量
	StartedAt      time.Time  `json:"started_at"`
	CompletedAt    *time.Time `json:"completed_at"` // 使用指针类型，允许为 NULL
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
