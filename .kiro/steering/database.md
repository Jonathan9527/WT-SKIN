---
inclusion: fileMatch
fileMatchPattern: '**/database/**,**/models/**,**/*.sql,**/docker-compose.yml,**/.env'
---

# 数据库参考

## 连接信息（开发环境）

- 容器：wt-mysql (mysql:8.0)，端口 3306
- 数据库：warthunder，字符集 utf8mb4，排序 utf8mb4_unicode_ci
- Root：root / warthunder123
- 应用用户：wtuser / wtpassword
- DSN：`wtuser:wtpassword@tcp(mysql:3306)/warthunder?charset=utf8mb4&parseTime=True&loc=Local`

## 数据模型（GORM）

定义在 `server/models/models.go`：

- `User` — 用户表（id, username, password, nickname, avatar）
- `Skin` — 涂装表（wt_live_id, title, description, author, vehicle_type, vehicle_countries, vehicle_class, vehicle_name, tags, image_url, images, file_url, file_name, file_size, downloads, likes, views, comments, featured, pbr_ready, created_ts）
- `Vehicle` — 载具表（wt_live_id, name, name_cn, type, country, class, rank, br, skin_count, image_url, description）
- `Tag` — 标签表（name, count）
- `SkinTag` — 涂装-标签关联
- `SkinImage` — 涂装图片
- `SkinVehicle` — 涂装-载具关联（多对多）
- `Download` — 下载记录（user_id, skin_id）
- `Favorite` — 收藏记录（user_id, skin_id）
- `SyncLog` — 同步日志（session_id, type, message, url, data）
- `SyncSession` — 同步会话（session_id, vehicle_type, vehicle_country, vehicle_class, status, total, current, new_count, exist_count）

## 迁移

服务器启动时通过 `database.AutoMigrate()` 自动创建/更新表结构，无需手动操作。

## 常用操作

```bash
# 备份
docker exec wt-mysql mysqldump -u root -pwarthunder123 warthunder > backup.sql

# 恢复
docker exec -i wt-mysql mysql -u root -pwarthunder123 warthunder < backup.sql

# 重置
docker exec -it wt-mysql mysql -u root -pwarthunder123 -e "DROP DATABASE IF EXISTS warthunder; CREATE DATABASE warthunder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 生产环境注意

部署前必须修改所有默认密码，限制端口为 `127.0.0.1:3306:3306`，使用环境变量管理密码。
