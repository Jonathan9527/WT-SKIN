package handlers

import (
	"net/http"
	"os"

	"warthunder-server/services"

	"github.com/gin-gonic/gin"
)

// GenerateDataPack 生成 SQLite 数据包
func GenerateDataPack(c *gin.Context) {
	info, err := services.GenerateSQLiteDataPack()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "OK", "message": "数据包生成成功", "data": info})
}

// GetDataPackVersion 获取已发布的数据包版本（客户端用）
func GetDataPackVersion(c *gin.Context) {
	info := services.GetPublishedPack()
	if info == nil {
		c.JSON(http.StatusOK, gin.H{"status": "OK", "available": false, "message": "暂无已发布的数据包"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "OK", "available": true, "data": info})
}

// DownloadDataPack 下载已发布的数据包
func DownloadDataPack(c *gin.Context) {
	filePath := "data/packs/latest.db"
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"status": "ERROR", "error": "数据包不存在，请先生成并发布"})
		return
	}
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Disposition", "attachment; filename=wt_skins.db")
	c.File(filePath)
}

// GetAllDataPacks 获取所有数据包列表（管理后台用）
func GetAllDataPacks(c *gin.Context) {
	packs := services.GetAllPacks()
	c.JSON(http.StatusOK, gin.H{"status": "OK", "data": packs})
}

// PublishDataPack 发布指定版本的数据包
func PublishDataPack(c *gin.Context) {
	var params struct {
		Version string `json:"version"`
	}
	if err := c.ShouldBindJSON(&params); err != nil || params.Version == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "ERROR", "error": "缺少 version 参数"})
		return
	}

	info, err := services.PublishPack(params.Version)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "OK", "message": "发布成功", "data": info})
}

// DeleteDataPack 删除指定版本的数据包
func DeleteDataPack(c *gin.Context) {
	version := c.Param("version")
	if version == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "ERROR", "error": "缺少 version 参数"})
		return
	}

	if err := services.DeletePack(version); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "OK", "message": "删除成功"})
}
