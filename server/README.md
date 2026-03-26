# War Thunder 涂装服务端

Go + MySQL 后端服务，使用 Docker 部署。

## 快速启动

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f api
```

## API 接口

### 涂装接口
- `GET /api/skins` - 获取涂装列表
  - 参数: `vehicleType`, `vehicleCountry`, `vehicleClass`, `search`, `sort`, `page`
- `GET /api/skins/:id` - 获取涂装详情
- `POST /api/skins/sync` - 从 WT Live 同步数据

### 用户接口
- `POST /api/register` - 注册
- `POST /api/login` - 登录
- `GET /api/user/profile` - 获取用户信息 (需认证)
- `GET /api/user/favorites` - 获取收藏 (需认证)
- `GET /api/user/downloads` - 获取下载记录 (需认证)

### 操作接口 (需认证)
- `POST /api/skins/:id/download` - 记录下载
- `POST /api/skins/:id/favorite` - 收藏/取消收藏

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | MySQL 连接字符串 | - |
| JWT_SECRET | JWT 密钥 | warthunder-secret-key |
| PORT | 服务端口 | 8080 |

## 本地开发

```bash
# 安装依赖
go mod tidy

# 运行
go run main.go
```
