package handlers

import (
	"net/http"
	"strconv"

	"warthunder-server/services"

	"github.com/gin-gonic/gin"
)

// StartSync 启动同步任务
func StartSync(c *gin.Context) {
	var req struct {
		VehicleType    string `json:"vehicleType" binding:"required"`
		VehicleCountry string `json:"vehicleCountry"`
		VehicleClass   string `json:"vehicleClass"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误: " + err.Error()})
		return
	}

	sessionID, err := services.StartSyncTask(req.VehicleType, req.VehicleCountry, req.VehicleClass)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id": sessionID,
		"message":    "同步任务已启动",
	})
}

// GetSyncStatus 获取同步状态和日志
func GetSyncStatus(c *gin.Context) {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 session_id 参数"})
		return
	}

	// 获取会话信息
	session, err := services.GetSyncSession(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "会话不存在"})
		return
	}

	// 获取日志（默认获取所有日志）
	limit := 0
	if limitStr := c.Query("limit"); limitStr != "" {
		limit, _ = strconv.Atoi(limitStr)
	}

	logs, err := services.GetSyncLogs(sessionID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取日志失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session": session,
		"logs":    logs,
	})
}

// GetSyncSessions 获取同步会话列表
func GetSyncSessions(c *gin.Context) {
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		limit, _ = strconv.Atoi(limitStr)
	}

	sessions, err := services.GetLatestSyncSessions(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取会话列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessions": sessions,
	})
}
