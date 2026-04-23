package main

import (
	"log"
	"os"

	"warthunder-server/config"
	"warthunder-server/database"
	"warthunder-server/router"
	"warthunder-server/services"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 连接数据库
	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer database.Close()

	// 自动迁移数据库表
	if err := database.AutoMigrate(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	// 启动路由
	r := router.Setup()

	// 加载数据包元数据
	services.LoadPackMeta()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("服务启动在端口 %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
