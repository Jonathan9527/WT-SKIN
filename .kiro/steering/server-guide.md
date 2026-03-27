---
inclusion: fileMatch
fileMatchPattern: 'server/**'
---

# 后端服务开发指南

## 架构

Go + Gin + GORM + MySQL，Docker Compose 部署。

## 目录结构

```
server/
├── main.go              # 入口：加载配置 → 连接数据库 → 自动迁移 → 启动路由
├── config/config.go     # 配置加载（环境变量）
├── database/database.go # 数据库连接和迁移
├── models/models.go     # GORM 数据模型
├── router/router.go     # Gin 路由定义（CORS、/api、/client 两组路由）
├── handlers/            # 请求处理器
│   ├── admin.go         # 管理统计
│   ├── skin.go          # 涂装 CRUD
│   ├── sync.go          # 同步任务
│   ├── tag.go           # 标签管理
│   ├── user.go          # 用户认证（JWT）
│   ├── vehicle.go       # 载具管理
│   └── websocket.go     # WebSocket 同步进度
├── services/            # 业务逻辑
│   ├── sync.go          # 涂装同步（从 WT Live 爬取）
│   ├── sync_service.go  # 同步任务管理
│   ├── sync_vehicles.go # 载具同步
│   └── vehicle.go       # 载具筛选服务
├── data/                # 静态数据
│   ├── vehicles_complete.json  # 完整载具层级数据
│   └── vehicles.json           # 简化载具数据
├── docker-compose.yml   # MySQL + API + Nginx
├── Dockerfile           # Go 多阶段构建
├── nginx.conf           # Nginx 反向代理配置
├── init.sql             # 数据库初始化 SQL
└── .env                 # 环境变量
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | MySQL DSN | - |
| JWT_SECRET | JWT 密钥 | warthunder-secret-key |
| PORT | 服务端口 | 8080 |

## 本地开发

```bash
go mod tidy
go run main.go
```

## Docker 部署

```bash
docker-compose up -d          # 启动
docker-compose logs -f api    # 查看日志
docker-compose down           # 停止
docker-compose build          # 重新构建
```

## 认证

使用 JWT，需认证的路由通过 `handlers.AuthMiddleware()` 中间件保护。
Header: `Authorization: Bearer <token>`
