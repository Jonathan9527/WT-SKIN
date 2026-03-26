package handlers

import (
	"net/http"
	"strconv"

	"warthunder-server/database"
	"warthunder-server/models"
	"warthunder-server/services"

	"github.com/gin-gonic/gin"
)

// SkinWithVehicles 涂装及其关联载具
type SkinWithVehicles struct {
	models.Skin
	RelatedVehicles []models.Vehicle `json:"related_vehicles"`
}

// GetSkins 获取涂装列表（从数据库，同时触发同步）
func GetSkins(c *gin.Context) {
	vehicleType := c.DefaultQuery("vehicleType", "any")
	vehicleCountry := c.DefaultQuery("vehicleCountry", "any")
	vehicleClass := c.DefaultQuery("vehicleClass", "any")
	vehicle := c.DefaultQuery("vehicle", "any")
	sort := c.DefaultQuery("sort", "created")
	search := c.Query("search")
	period, _ := strconv.Atoi(c.DefaultQuery("period", "7"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	skins, total, err := services.FetchAndReturnSkins(vehicleType, vehicleCountry, vehicleClass, vehicle, sort, search, period, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": err.Error()})
		return
	}

	// 为每个涂装获取关联载具
	skinsWithVehicles := make([]SkinWithVehicles, 0, len(skins))
	for _, skin := range skins {
		// 获取关联的载具ID列表
		var skinVehicles []models.SkinVehicle
		database.DB.Where("skin_id = ?", skin.ID).Find(&skinVehicles)

		// 获取载具详细信息
		vehicleIDs := make([]string, 0)
		for _, sv := range skinVehicles {
			vehicleIDs = append(vehicleIDs, sv.VehicleID)
		}

		var vehicles []models.Vehicle
		if len(vehicleIDs) > 0 {
			database.DB.Where("wt_live_id IN ?", vehicleIDs).Find(&vehicles)
		}

		skinsWithVehicles = append(skinsWithVehicles, SkinWithVehicles{
			Skin:            skin,
			RelatedVehicles: vehicles,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data": gin.H{
			"list":  skinsWithVehicles,
			"total": total,
			"page":  page,
		},
	})
}

// GetSkin 获取单个涂装详情
func GetSkin(c *gin.Context) {
	id := c.Param("id")
	var skin models.Skin

	if err := database.DB.First(&skin, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "ERROR", "error": "涂装不存在"})
		return
	}

	// 增加浏览量
	database.DB.Model(&skin).Update("views", skin.Views+1)

	// 获取关联的载具列表
	var skinVehicles []models.SkinVehicle
	database.DB.Where("skin_id = ?", skin.ID).Find(&skinVehicles)

	// 获取载具详细信息
	vehicleIDs := make([]string, 0)
	for _, sv := range skinVehicles {
		vehicleIDs = append(vehicleIDs, sv.VehicleID)
	}

	var vehicles []models.Vehicle
	if len(vehicleIDs) > 0 {
		database.DB.Where("wt_live_id IN ?", vehicleIDs).Find(&vehicles)
	}

	// 获取图片列表
	var images []models.SkinImage
	database.DB.Where("skin_id = ?", skin.ID).Order("sort ASC").Find(&images)

	c.JSON(http.StatusOK, gin.H{
		"status":   "OK",
		"data":     skin,
		"vehicles": vehicles,
		"images":   images,
	})
}

// SyncFromWTLive 手动触发从 War Thunder Live 同步数据
func SyncFromWTLive(c *gin.Context) {
	var params struct {
		VehicleType    string `json:"vehicleType"`
		VehicleCountry string `json:"vehicleCountry"`
		VehicleClass   string `json:"vehicleClass"`
		Vehicle        string `json:"vehicle"`
		Sort           string `json:"sort"`
		Period         int    `json:"period"`
		Page           int    `json:"page"`
	}

	if err := c.ShouldBindJSON(&params); err != nil {
		params.VehicleType = "any"
		params.VehicleCountry = "any"
		params.VehicleClass = "any"
		params.Vehicle = "any"
		params.Sort = "created"
		params.Period = 7
		params.Page = 0
	}

	count, err := services.SyncSkinsFromWTLive(
		params.VehicleType,
		params.VehicleCountry,
		params.VehicleClass,
		params.Vehicle,
		params.Sort,
		params.Period,
		params.Page,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "OK",
		"message": "同步完成",
		"count":   count,
	})
}

// RecordDownload 记录下载
func RecordDownload(c *gin.Context) {
	skinID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetUint("userID")

	// 记录下载
	download := models.Download{
		UserID: userID,
		SkinID: uint(skinID),
	}
	database.DB.Create(&download)

	// 增加下载量
	database.DB.Model(&models.Skin{}).Where("id = ?", skinID).Update("downloads", database.DB.Raw("downloads + 1"))

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
}

// ToggleFavorite 切换收藏状态
func ToggleFavorite(c *gin.Context) {
	skinID, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetUint("userID")

	var favorite models.Favorite
	result := database.DB.Where("user_id = ? AND skin_id = ?", userID, skinID).First(&favorite)

	if result.Error == nil {
		// 已收藏，取消收藏
		database.DB.Delete(&favorite)
		database.DB.Model(&models.Skin{}).Where("id = ?", skinID).Update("likes", database.DB.Raw("likes - 1"))
		c.JSON(http.StatusOK, gin.H{"status": "OK", "favorited": false})
	} else {
		// 未收藏，添加收藏
		favorite = models.Favorite{UserID: userID, SkinID: uint(skinID)}
		database.DB.Create(&favorite)
		database.DB.Model(&models.Skin{}).Where("id = ?", skinID).Update("likes", database.DB.Raw("likes + 1"))
		c.JSON(http.StatusOK, gin.H{"status": "OK", "favorited": true})
	}
}

// GetFavorites 获取用户收藏
func GetFavorites(c *gin.Context) {
	userID := c.GetUint("userID")

	var skins []models.Skin
	database.DB.Joins("JOIN favorites ON favorites.skin_id = skins.id").
		Where("favorites.user_id = ?", userID).
		Find(&skins)

	c.JSON(http.StatusOK, gin.H{"status": "OK", "data": skins})
}

// GetDownloads 获取用户下载记录
func GetDownloads(c *gin.Context) {
	userID := c.GetUint("userID")

	var skins []models.Skin
	database.DB.Joins("JOIN downloads ON downloads.skin_id = skins.id").
		Where("downloads.user_id = ?", userID).
		Group("skins.id").
		Find(&skins)

	c.JSON(http.StatusOK, gin.H{"status": "OK", "data": skins})
}


// FetchSkinDetail 获取涂装详情（从 WT Live 获取并保存）
func FetchSkinDetail(c *gin.Context) {
	var params struct {
		LangGroup int `json:"lang_group" form:"lang_group"`
	}

	if err := c.ShouldBind(&params); err != nil || params.LangGroup == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"status": "ERROR", "error": "缺少 lang_group 参数"})
		return
	}

	skin, err := services.FetchSkinDetail(params.LangGroup)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data":   skin,
	})
}



// ============ Client API (Windows 客户端专用) ============

// ClientSkin 客户端涂装数据结构
type ClientSkin struct {
	ID             uint   `json:"id"`
	WTLiveID       int    `json:"wt_live_id"`
	LangGroup      int    `json:"lang_group"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	Author         string `json:"author"`
	AuthorID       int    `json:"author_id"`
	AuthorAvatar   string `json:"author_avatar"`
	VehicleType    string `json:"vehicle_type"`
	VehicleCountry string `json:"vehicle_country"`
	VehicleClass   string `json:"vehicle_class"`
	VehicleName    string `json:"vehicle_name"`
	ImageURL       string `json:"image_url"`
	Images         string `json:"images"`
	FileURL        string `json:"file_url"`
	FileName       string `json:"file_name"`
	FileSize       int64  `json:"file_size"`
	FileType       string `json:"file_type"`
	Likes          int    `json:"likes"`
	Views          int    `json:"views"`
	Downloads      int    `json:"downloads"`
	Comments       int    `json:"comments"`
	Featured       bool   `json:"featured"`
	PbrReady       bool   `json:"pbr_ready"`
}

// GetSkinsForClient 获取涂装列表（客户端专用）
func GetSkinsForClient(c *gin.Context) {
	vehicleType := c.DefaultQuery("vehicleType", "any")
	vehicleCountry := c.DefaultQuery("vehicleCountry", "any")
	vehicleClass := c.DefaultQuery("vehicleClass", "any")
	vehicle := c.DefaultQuery("vehicle", "any")
	sort := c.DefaultQuery("sort", "created")
	search := c.Query("search")
	period, _ := strconv.Atoi(c.DefaultQuery("period", "7"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	skins, total, err := services.FetchAndReturnSkins(vehicleType, vehicleCountry, vehicleClass, vehicle, sort, search, period, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": err.Error()})
		return
	}

	// 转换为客户端格式
	clientSkins := make([]ClientSkin, 0, len(skins))
	for _, skin := range skins {
		clientSkins = append(clientSkins, ClientSkin{
			ID:             skin.ID,
			WTLiveID:       skin.WTLiveID,
			LangGroup:      skin.LangGroup,
			Title:          skin.Title,
			Description:    skin.Description,
			Author:         skin.Author,
			AuthorID:       skin.AuthorID,
			AuthorAvatar:   skin.AuthorAvatar,
			VehicleType:    skin.VehicleType,
			VehicleCountry: skin.VehicleCountries,
			VehicleClass:   skin.VehicleClass,
			VehicleName:    skin.VehicleName,
			ImageURL:       skin.ImageURL,
			Images:         skin.Images,
			FileURL:        skin.FileURL,
			FileName:       skin.FileName,
			FileSize:       skin.FileSize,
			FileType:       skin.FileType,
			Likes:          skin.Likes,
			Views:          skin.Views,
			Downloads:      skin.Downloads,
			Comments:       skin.Comments,
			Featured:       skin.Featured,
			PbrReady:       skin.PbrReady,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data": gin.H{
			"list":  clientSkins,
			"total": total,
			"page":  page,
		},
	})
}

// GetSkinForClient 获取单个涂装详情（客户端专用）
func GetSkinForClient(c *gin.Context) {
	id := c.Param("id")
	var skin models.Skin

	if err := database.DB.First(&skin, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "ERROR", "error": "涂装不存在"})
		return
	}

	// 获取图片列表
	var images []models.SkinImage
	database.DB.Where("skin_id = ?", skin.ID).Order("sort ASC").Find(&images)

	// 转换为客户端格式
	clientSkin := ClientSkin{
		ID:             skin.ID,
		WTLiveID:       skin.WTLiveID,
		LangGroup:      skin.LangGroup,
		Title:          skin.Title,
		Description:    skin.Description,
		Author:         skin.Author,
		AuthorID:       skin.AuthorID,
		AuthorAvatar:   skin.AuthorAvatar,
		VehicleType:    skin.VehicleType,
		VehicleCountry: skin.VehicleCountries,
		VehicleClass:   skin.VehicleClass,
		VehicleName:    skin.VehicleName,
		ImageURL:       skin.ImageURL,
		Images:         skin.Images,
		FileURL:        skin.FileURL,
		FileName:       skin.FileName,
		FileSize:       skin.FileSize,
		FileType:       skin.FileType,
		Likes:          skin.Likes,
		Views:          skin.Views,
		Downloads:      skin.Downloads,
		Comments:       skin.Comments,
		Featured:       skin.Featured,
		PbrReady:       skin.PbrReady,
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data":   clientSkin,
		"images": images,
	})
}
