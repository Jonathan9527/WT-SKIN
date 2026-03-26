package handlers

import (
	"fmt"
	"net/http"

	"warthunder-server/database"
	"warthunder-server/models"

	"github.com/gin-gonic/gin"
)

// GetTags 获取所有标签（按使用次数排序）
func GetTags(c *gin.Context) {
	var tags []models.Tag

	limit := 100
	if l := c.Query("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
	}

	database.DB.Order("count DESC").Limit(limit).Find(&tags)

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data":   tags,
	})
}

// GetTagSkins 获取某个标签下的所有涂装
func GetTagSkins(c *gin.Context) {
	tagName := c.Param("name")

	var tag models.Tag
	if err := database.DB.Where("name = ?", tagName).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "ERROR", "error": "标签不存在"})
		return
	}

	var skinIDs []uint
	database.DB.Model(&models.SkinTag{}).Where("tag_id = ?", tag.ID).Pluck("skin_id", &skinIDs)

	var skins []models.Skin
	if len(skinIDs) > 0 {
		database.DB.Where("id IN ?", skinIDs).Find(&skins)
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data": gin.H{
			"tag":   tag,
			"skins": skins,
			"total": len(skins),
		},
	})
}

// GetTagStats 获取标签统计
func GetTagStats(c *gin.Context) {
	var totalTags int64
	var topTags []models.Tag

	database.DB.Model(&models.Tag{}).Count(&totalTags)
	database.DB.Order("count DESC").Limit(20).Find(&topTags)

	c.JSON(http.StatusOK, gin.H{
		"status": "OK",
		"data": gin.H{
			"total":   totalTags,
			"topTags": topTags,
		},
	})
}
