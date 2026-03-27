---
inclusion: auto
---

# 项目概览 - War Thunder 涂装管理系统 (WT-SKIN)

## 项目简介

War Thunder Live 社区涂装下载与管理工具，包含三个子系统：

- Go 后端服务 (`server/`)：Gin + GORM + MySQL，Docker Compose 部署
- Vue 管理后台 (`admin/`)：Vue 3 + TypeScript + Ant Design Vue + Pinia + Vite
- Electron 桌面客户端 (`electron_client/`)：Electron + React + TypeScript + Tailwind CSS + Radix UI
- CLI 客户端 (`main.go` + `api/`)：Go 命令行交互版本

## 技术栈

- 后端：Go 1.21+, Gin, GORM, MySQL 8.0, Docker, Nginx
- 管理后台：Vue 3, TypeScript, Ant Design Vue 4, Pinia, Vite 5, Less
- 桌面客户端：Electron 31, React 18, TypeScript, Tailwind CSS 3, Radix UI, Vite 5
- CLI：Go, Fyne (GUI 版本可选)

## 项目结构

```
WT-SKIN/
├── main.go                    # CLI 命令行版本入口
├── api/warthunder.go          # Go 客户端 SDK
├── server/                    # Go 后端服务
│   ├── main.go                # 服务入口
│   ├── config/                # 配置
│   ├── database/              # 数据库连接
│   ├── models/                # GORM 数据模型
│   ├── router/                # Gin 路由
│   ├── handlers/              # 请求处理器
│   ├── services/              # 业务逻辑
│   ├── data/                  # 载具 JSON 数据
│   ├── docker-compose.yml     # Docker 编排
│   └── Dockerfile             # 后端镜像
├── admin/                     # Vue 管理后台
│   ├── src/views/             # 页面组件
│   ├── src/api/               # API 调用
│   ├── src/router/            # 路由配置
│   └── src/layouts/           # 布局组件
├── electron_client/           # Electron 桌面客户端
│   ├── main.js                # Electron 主进程
│   ├── preload.js             # 预加载脚本
│   ├── src/pages/             # React 页面
│   ├── src/components/        # React 组件
│   └── src/api.ts             # API 调用
└── scripts/                   # 数据生成脚本 (JS/Python)
```

## 两套 API

- `/api/*` — Admin 后台管理接口（涂装 CRUD、同步、用户管理、标签、载具）
- `/client/*` — Windows 客户端接口（涂装列表/详情、载具列表，简化格式）

## 默认账号

- 管理后台：admin / admin123
- MySQL root：root / warthunder123
- MySQL 应用用户：wtuser / wtpassword

## 启动方式

```bash
# 后端 (Docker)
cd server && docker-compose up -d

# 管理后台
cd admin && npm install && npm run dev  # http://localhost:3000

# Electron 客户端
cd electron_client && npm install && npm run dev
```
