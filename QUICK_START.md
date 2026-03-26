# War Thunder 涂装管理系统 - 快速启动指南

## 系统要求

- Docker & Docker Compose
- Node.js 16+ (用于前端开发)
- 支持 UTF-8 的现代浏览器

## 快速启动

### 1. 启动后端服务

```bash
cd server
docker-compose up -d
```

等待服务启动（约 10-15 秒），服务包括：
- MySQL 数据库 (端口 3306)
- Go 后端 API (端口 8080)
- Nginx 反向代理 (端口 80)

### 2. 启动前端开发服务器

```bash
cd admin
npm install
npm run dev
```

前端将在 http://localhost:3000 启动

### 3. 访问系统

- **前端管理界面**: http://localhost:3000
- **后端 API**: http://localhost:8080
- **默认账号**: admin / admin123

## 特殊字符支持验证

### 测试 1: 浏览器字体测试

打开 `test_special_characters.html` 文件，检查：
- ✓ 所有特殊字符都能正确显示（不是方块）
- ✓ 字体渲染测试显示"正常"
- ✓ 实际载具列表正确加载并显示

### 测试 2: API 测试

```bash
# Windows PowerShell
Invoke-WebRequest -Uri "http://localhost:8080/api/vehicles?type=tank&country=britain" | Select-Object -ExpandProperty Content

# 或使用浏览器访问
http://localhost:8080/api/vehicles?type=tank&country=britain
```

检查返回的 JSON 中是否包含正确的特殊字符，例如：
```json
{
  "name": "▄Sho't Kal Dalet"
}
```

### 测试 3: 前端界面测试

1. 登录管理后台
2. 进入"数据同步"页面
3. 选择：类型=坦克，国家=英国
4. 查看"具体载具"下拉列表
5. 确认能看到带 ▄ 字符的载具名称

## 常见问题排查

### 问题 1: 特殊字符显示为方块

**原因**: 字体不支持这些 Unicode 字符

**解决方案**:

1. **Windows 用户**:
   - 确保系统已安装 Segoe UI 或 Microsoft YaHei 字体
   - 在浏览器设置中选择这些字体

2. **macOS 用户**:
   - 系统默认字体已支持，无需额外配置

3. **Linux 用户**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install fonts-noto
   
   # Fedora
   sudo dnf install google-noto-sans-fonts
   ```

### 问题 2: API 返回乱码

**检查清单**:
- [ ] 确认 HTTP 响应头包含 `Content-Type: application/json; charset=utf-8`
- [ ] 确认数据库连接使用 UTF-8 编码
- [ ] 确认 JSON 文件保存为 UTF-8 格式

**验证命令**:
```bash
# 检查文件编码
file -i server/data/vehicles_complete.json
# 应该显示: charset=utf-8
```

### 问题 3: 前端显示正常但数据库存储乱码

**解决方案**:

检查 MySQL 配置:
```sql
-- 查看数据库编码
SHOW VARIABLES LIKE 'character_set%';

-- 应该都是 utf8mb4
-- 如果不是，修改 server/.env:
DB_CHARSET=utf8mb4
```

## 数据初始化

### 生成载具数据

如果需要重新生成载具数据：

```bash
# 使用 Node.js 脚本
node scripts/generate_vehicles_complete.js
```

这将从 `api_response_head.html` 和 `wt_vehicle_skins.json` 生成 `server/data/vehicles_complete.json`

### 同步涂装数据

1. 登录管理后台
2. 进入"数据同步"页面
3. 选择筛选条件
4. 点击"开始同步"或"批量同步"

## 开发指南

### 前端开发

```bash
cd admin
npm run dev    # 开发服务器
npm run build  # 生产构建
```

### 后端开发

```bash
cd server
go run main.go  # 直接运行（需要 MySQL）

# 或使用 Docker
docker-compose up --build
```

### 添加新的载具类型

1. 更新 `scripts/generate_vehicles_complete.js`
2. 重新生成数据文件
3. 更新前端选择器选项
4. 重新构建 Docker 镜像

## 性能优化建议

### 1. 数据库索引

```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_vehicle_type ON skins(vehicle_type);
CREATE INDEX idx_vehicle_country ON skins(vehicle_country);
CREATE INDEX idx_vehicle_class ON skins(vehicle_class);
CREATE INDEX idx_vehicle ON skins(vehicle);
```

### 2. API 缓存

考虑为载具列表 API 添加缓存：
- Redis 缓存
- 或使用 Nginx 缓存

### 3. 前端优化

- 使用虚拟滚动处理大量载具列表
- 实现搜索防抖
- 添加加载状态提示

## 部署到生产环境

### 1. 环境变量配置

复制并修改环境变量文件：
```bash
cp server/.env.example server/.env
```

修改以下配置：
- `DB_PASSWORD`: 使用强密码
- `JWT_SECRET`: 生成随机密钥
- `GIN_MODE=release`: 生产模式

### 2. 构建前端

```bash
cd admin
npm run build
```

将 `dist` 目录部署到 Nginx 或 CDN

### 3. 启动服务

```bash
cd server
docker-compose -f docker-compose.prod.yml up -d
```

### 4. 配置 HTTPS

使用 Let's Encrypt 或其他 SSL 证书服务

## 监控和日志

### 查看日志

```bash
# 后端日志
docker logs wt-api -f

# 数据库日志
docker logs wt-mysql -f

# Nginx 日志
docker logs wt-nginx -f
```

### 健康检查

```bash
# API 健康检查
curl http://localhost:8080/health

# 数据库连接检查
docker exec wt-mysql mysqladmin ping -h localhost
```

## 备份和恢复

### 数据库备份

```bash
# 备份
docker exec wt-mysql mysqldump -u root -p warthunder > backup.sql

# 恢复
docker exec -i wt-mysql mysql -u root -p warthunder < backup.sql
```

### 载具数据备份

```bash
# 备份载具数据文件
cp server/data/vehicles_complete.json backup/
```

## 更多资源

- [API 文档](./API_DOCUMENTATION.md)
- [特殊字符说明](./VEHICLE_SPECIAL_CHARACTERS.md)
- [载具分类指南](./VEHICLE_CLASSIFICATION_GUIDE.md)
- [数据源说明](./VEHICLE_DATA_SOURCE.md)

## 获取帮助

如果遇到问题：
1. 查看相关文档
2. 检查日志文件
3. 使用测试页面验证功能
4. 查看 GitHub Issues

## 许可证

本项目仅供学习和个人使用。War Thunder 及相关商标归 Gaijin Entertainment 所有。
