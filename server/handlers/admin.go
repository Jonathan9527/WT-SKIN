package handlers

import (
	"net/http"

	"warthunder-server/database"
	"warthunder-server/models"

	"github.com/gin-gonic/gin"
)

// GetStats 获取统计数据
func GetStats(c *gin.Context) {
	var totalSkins int64
	var totalUsers int64
	var totalDownloads int64
	var totalViews int64
	var totalVehicles int64

	database.DB.Model(&models.Skin{}).Count(&totalSkins)
	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.Skin{}).Select("COALESCE(SUM(downloads), 0)").Scan(&totalDownloads)
	database.DB.Model(&models.Skin{}).Select("COALESCE(SUM(views), 0)").Scan(&totalViews)
	database.DB.Model(&models.Vehicle{}).Count(&totalVehicles)

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data": gin.H{
			"totalSkins":     totalSkins,
			"totalUsers":     totalUsers,
			"totalDownloads": totalDownloads,
			"totalViews":     totalViews,
			"totalVehicles":  totalVehicles,
		},
	})
}

// GetAllUsers 获取所有用户
func GetAllUsers(c *gin.Context) {
	var users []models.User
	database.DB.Find(&users)

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data":   users,
	})
}

// DeleteUser 删除用户
func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	if err := database.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK", "message": "删除成功"})
}

// DeleteSkin 删除涂装
func DeleteSkin(c *gin.Context) {
	id := c.Param("id")

	// 删除关联的图片
	database.DB.Where("skin_id = ?", id).Delete(&models.SkinImage{})
	
	// 删除关联的载具关系
	database.DB.Where("skin_id = ?", id).Delete(&models.SkinVehicle{})

	if err := database.DB.Delete(&models.Skin{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK", "message": "删除成功"})
}
