package handlers

import (
	"fmt"
	"net/http"

	"warthunder-server/database"
	"warthunder-server/models"
	"warthunder-server/services"

	"github.com/gin-gonic/gin"
)

// GetVehicles 获取载具列表
func GetVehicles(c *gin.Context) {
	vehicleType := c.Query("type")
	country := c.Query("country")
	class := c.Query("class")
	cleanNames := c.Query("clean") == "true" // 是否清理特殊字符

	// 优先从 JSON 文件获取
	vehicles, err := services.GetVehiclesByFilter(vehicleType, country, class, cleanNames)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "ERROR",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data":   vehicles,
	})
}

// GetVehiclesFromDB 从数据库获取载具列表（支持四级筛选）
func GetVehiclesFromDB(c *gin.Context) {
	vehicleType := c.Query("type")
	country := c.Query("country")
	class := c.Query("class")

	var vehicles []models.Vehicle
	query := database.DB.Model(&models.Vehicle{})

	if vehicleType != "" && vehicleType != "any" {
		query = query.Where("type = ?", vehicleType)
	}
	if country != "" && country != "any" {
		query = query.Where("country = ?", country)
	}
	if class != "" && class != "any" {
		query = query.Where("class = ?", class)
	}

	// 按涂装数量降序排序
	query = query.Order("skin_count DESC, name ASC")
	query.Find(&vehicles)

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data":   vehicles,
	})
}

// SyncVehicles 同步载具数据
func SyncVehicles(c *gin.Context) {
	vehicleType := c.Query("type")
	country := c.Query("country")
	class := c.Query("class")

	count, err := services.SyncVehiclesFromWTLive(vehicleType, country, class)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "ERROR",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"count":  count,
	})
}

// SyncVehiclesFromJSON 从 JSON 文件同步载具数据到数据库
func SyncVehiclesFromJSON(c *gin.Context) {
	count, err := services.SyncVehiclesFromJSON()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "ERROR",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "OK",
		"count":   count,
		"message": fmt.Sprintf("成功同步 %d 个载具数据到数据库", count),
	})
}


// RefreshVehicleCounts 刷新载具涂装数量
func RefreshVehicleCounts(c *gin.Context) {
	vehicleType := c.Query("type")
	country := c.Query("country")
	class := c.Query("class")

	result, err := services.RefreshVehicleCountsFromSkinAPI(vehicleType, country, class)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "ERROR",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data":   result,
	})
}


// GetRemoteStats 获取 War Thunder Live 远程统计数据
func GetRemoteStats(c *gin.Context) {
	stats, err := services.GetRemoteStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "ERROR",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data":   stats,
	})
}
