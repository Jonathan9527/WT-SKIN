package router

import (
	"warthunder-server/handlers"

	"github.com/gin-gonic/gin"
)

func Setup() *gin.Engine {
	r := gin.Default()

	// CORS 中间件
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API 路由组（admin 后台管理）
	api := r.Group("/api")
	{
		// WebSocket 路由（必须在动态路由之前）
		api.GET("/ws/sync-vehicles", handlers.SyncSkinsWebSocket)

		// 涂装相关（公开）
		api.GET("/skins", handlers.GetSkins)
		api.GET("/skins/:id", handlers.GetSkin)
		api.POST("/skins/sync", handlers.SyncFromWTLive)
		api.POST("/skins/detail", handlers.FetchSkinDetail)
		api.DELETE("/skins/:id", handlers.DeleteSkin)

		// 标签相关
		api.GET("/tags", handlers.GetTags)
		api.GET("/tags/:name", handlers.GetTagSkins)
		api.GET("/tags/stats", handlers.GetTagStats)

		// 载具相关
		api.GET("/vehicles", handlers.GetVehicles)
		api.GET("/vehicles/db", handlers.GetVehiclesFromDB)
		api.POST("/vehicles/sync", handlers.SyncVehicles)
		api.POST("/vehicles/sync-from-json", handlers.SyncVehiclesFromJSON)
		api.POST("/vehicles/refresh-counts", handlers.RefreshVehicleCounts)
		api.GET("/vehicles/remote-stats", handlers.GetRemoteStats)

		// 同步任务相关
		api.POST("/sync/start", handlers.StartSync)
		api.GET("/sync/status", handlers.GetSyncStatus)
		api.GET("/sync/sessions", handlers.GetSyncSessions)

		// 用户相关
		api.POST("/register", handlers.Register)
		api.POST("/login", handlers.Login)

		// 管理接口
		admin := api.Group("/admin")
		{
			admin.GET("/stats", handlers.GetStats)
			admin.GET("/users", handlers.GetAllUsers)
			admin.DELETE("/users/:id", handlers.DeleteUser)
		}

		// 需要认证的路由
		auth := api.Group("/")
		auth.Use(handlers.AuthMiddleware())
		{
			auth.GET("/user/profile", handlers.GetProfile)
			auth.POST("/skins/:id/download", handlers.RecordDownload)
			auth.POST("/skins/:id/favorite", handlers.ToggleFavorite)
			auth.GET("/user/favorites", handlers.GetFavorites)
			auth.GET("/user/downloads", handlers.GetDownloads)
		}
	}

	// Client API 路由组（Windows 客户端）
	client := r.Group("/client")
	{
		// 涂装相关
		client.GET("/skins", handlers.GetSkinsForClient)
		client.GET("/skins/:id", handlers.GetSkinForClient)

		// 载具相关（四级筛选）
		client.GET("/vehicles", handlers.GetVehiclesFromDB)
	}

	return r
}
