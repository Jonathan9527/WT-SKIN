# War Thunder 涂装下载器

War Thunder Live 社区涂装浏览与下载工具，包含 Electron 桌面客户端、Go 后端 API 和 Vue 管理后台。

## 功能特性

### 桌面客户端（Electron）
- 九宫格涂装商店，四级筛选（类型/国家/子类型/载具）
- 本地 SQLite 数据库，离线浏览 94,000+ 涂装
- 涂装详情：图片轮播、一键下载安装到 UserSkins
- 已安装涂装检测
- 深色/亮色主题切换
- 系统托盘最小化
- 数据包在线更新

### 管理后台（Vue + Ant Design）
- 涂装管理：列表、详情、搜索
- 载具数据管理：同步、本地/远程涂装数统计
- 涂装同步：基于载具列表从 WT Live 批量同步
- 数据包管理：生成、发布、版本管理
- 仪表盘：实时统计

### 后端 API（Go + Gin）
- MySQL 数据存储
- WT Live API 涂装同步
- SQLite 数据包导出
- 四级载具分类系统（3,083 个载具）
- JWT 认证
- Docker 部署

## 项目结构

```
├── electron_client/     # Electron 桌面客户端
│   ├── src/             # React + TypeScript + Tailwind + shadcn/ui
│   ├── main.js          # Electron 主进程
│   ├── local-db.js      # 本地 SQLite 数据库
│   └── data/            # 内置数据包
├── admin/               # Vue 管理后台
│   └── src/views/       # 页面（Dashboard, Skins, Sync, DataPack...）
├── server/              # Go 后端
│   ├── handlers/        # 请求处理器
│   ├── services/        # 业务逻辑
│   ├── models/          # 数据模型
│   ├── router/          # 路由定义
│   └── docker-compose.yml
└── scripts/             # 工具脚本
```

## 快速开始

### 1. 启动后端

```bash
cd server
docker-compose up -d
```

服务地址：
- API：http://localhost:8080
- MySQL：localhost:3306

### 2. 启动管理后台

```bash
cd admin
npm install
npm run dev
```

访问 http://localhost:3000，登录：admin / admin123

### 3. 启动客户端（开发模式）

```bash
cd electron_client
npm install
npx electron-rebuild -f -w better-sqlite3
npm run dev
```

### 4. 打包客户端

```bash
cd electron_client
npm run build
```

安装包输出到 `electron_client/release/`

## 技术栈

| 模块 | 技术 |
|------|------|
| 客户端 | Electron + React + TypeScript + Tailwind CSS + shadcn/ui + better-sqlite3 |
| 管理后台 | Vue 3 + Ant Design Vue + Vite |
| 后端 | Go + Gin + GORM + MySQL + go-sqlite3 |
| 部署 | Docker Compose（MySQL + API + Nginx） |

## API 路由

| 路径 | 说明 |
|------|------|
| `/api/*` | 管理后台 API |
| `/client/skins` | 客户端涂装列表 |
| `/client/vehicles` | 客户端载具列表 |
| `/client/datapack/version` | 数据包版本检测 |
| `/client/datapack/download` | 数据包下载 |
| `/health` | 健康检查 |

## 下载

前往 [Releases](https://github.com/Jonathan9527/WT-SKIN/releases) 下载最新安装包。

## 许可证

仅供学习和研究使用
