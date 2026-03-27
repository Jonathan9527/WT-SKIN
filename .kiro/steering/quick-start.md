---
inclusion: manual
---

# 快速启动指南

## 系统要求

- Docker & Docker Compose
- Node.js 16+（前端开发）
- Go 1.21+（本地开发后端时）

## 一键启动

### 1. 启动后端

```bash
cd server
docker-compose up -d
```

服务（约 10-15 秒启动）：
- MySQL：端口 3306
- Go API：端口 8080
- Nginx：端口 80

### 2. 启动管理后台

```bash
cd admin
npm install
npm run dev   # http://localhost:3000
```

### 3. 启动 Electron 客户端

```bash
cd electron_client
npm install
npm run dev
```

### 4. 访问

- 管理后台：http://localhost:3000（admin / admin123）
- API：http://localhost:8080
- 健康检查：http://localhost:8080/health

## 数据初始化

```bash
# 生成载具数据
node scripts/generate_vehicles_complete.js

# 同步涂装数据：登录管理后台 → 数据同步页面 → 选择条件 → 开始同步
```

## 生产部署

1. 修改 `server/.env` 中的密码和 JWT_SECRET
2. `cd admin && npm run build`（将 dist 部署到 Nginx/CDN）
3. `cd server && docker-compose -f docker-compose.prod.yml up -d`
4. 配置 HTTPS

## 健康检查

```bash
curl http://localhost:8080/health
docker logs wt-api -f
docker logs wt-mysql -f
```
