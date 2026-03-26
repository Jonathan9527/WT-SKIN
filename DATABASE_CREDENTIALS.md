# 数据库凭据信息

## 📋 MySQL 数据库配置

### 基本信息

| 项目 | 值 |
|------|-----|
| 容器名称 | wt-mysql |
| 镜像版本 | mysql:8.0 |
| 端口映射 | 3306:3306 |
| 数据库名 | warthunder |
| 字符集 | utf8mb4 |
| 排序规则 | utf8mb4_unicode_ci |

### 用户凭据

#### Root 用户（管理员）

```
用户名: root
密码: warthunder123
权限: 所有权限
```

**用途**: 数据库管理、备份恢复、用户管理

#### 应用用户（推荐使用）

```
用户名: wtuser
密码: wtpassword
数据库: warthunder
权限: 该数据库的所有权限
```

**用途**: 应用程序连接、日常操作

## 🔌 连接方式

### 1. 命令行连接

#### 从宿主机连接

```bash
# Root 用户
mysql -h 127.0.0.1 -P 3306 -u root -pwarthunder123

# 应用用户
mysql -h 127.0.0.1 -P 3306 -u wtuser -pwtpassword warthunder
```

#### 通过 Docker 容器

```bash
# Root 用户
docker exec -it wt-mysql mysql -u root -pwarthunder123

# 应用用户
docker exec -it wt-mysql mysql -u wtuser -pwtpassword warthunder
```

### 2. 应用程序连接

#### Go 应用（当前配置）

```go
// DSN 格式
DATABASE_URL=wtuser:wtpassword@tcp(mysql:3306)/warthunder?charset=utf8mb4&parseTime=True&loc=Local
```

#### 其他语言示例

**Python (pymysql)**:
```python
import pymysql

connection = pymysql.connect(
    host='localhost',
    port=3306,
    user='wtuser',
    password='wtpassword',
    database='warthunder',
    charset='utf8mb4'
)
```

**Node.js (mysql2)**:
```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'wtuser',
  password: 'wtpassword',
  database: 'warthunder',
  charset: 'utf8mb4'
});
```

**PHP (PDO)**:
```php
$dsn = "mysql:host=localhost;port=3306;dbname=warthunder;charset=utf8mb4";
$pdo = new PDO($dsn, 'wtuser', 'wtpassword');
```

### 3. GUI 工具连接

#### MySQL Workbench

```
连接名称: War Thunder DB
主机名: 127.0.0.1
端口: 3306
用户名: root 或 wtuser
密码: warthunder123 或 wtpassword
默认数据库: warthunder
```

#### DBeaver

```
数据库: MySQL
服务器地址: localhost
端口: 3306
数据库: warthunder
用户名: wtuser
密码: wtpassword
```

#### phpMyAdmin

```
服务器: localhost:3306
用户名: root
密码: warthunder123
```

## 🔐 安全建议

### 开发环境（当前配置）

✅ 当前配置适用于开发环境
- 简单易记的密码
- 本地访问
- 快速开发

### 生产环境（必须修改）

⚠️ 部署到生产环境前，必须修改以下内容：

1. **修改 Root 密码**
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY '强密码';
   ```

2. **修改应用用户密码**
   ```sql
   ALTER USER 'wtuser'@'%' IDENTIFIED BY '强密码';
   ```

3. **更新配置文件**
   - 修改 `server/docker-compose.yml`
   - 修改 `server/.env`
   - 重新构建容器

4. **限制访问**
   ```yaml
   # docker-compose.yml
   ports:
     - "127.0.0.1:3306:3306"  # 只允许本地访问
   ```

5. **使用环境变量**
   ```bash
   # 不要在代码中硬编码密码
   export MYSQL_ROOT_PASSWORD="your-strong-password"
   export MYSQL_PASSWORD="your-app-password"
   ```

### 强密码生成

推荐使用以下方式生成强密码：

```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

## 📊 数据库结构

### 主要表

| 表名 | 说明 | 记录数 |
|------|------|--------|
| users | 用户表 | - |
| skins | 涂装表 | - |
| vehicles | 载具表 | 3,083 |
| tags | 标签表 | - |
| downloads | 下载记录 | - |
| favorites | 收藏记录 | - |

### 查询示例

```sql
-- 查看所有表
SHOW TABLES;

-- 查看载具数量
SELECT COUNT(*) FROM vehicles;

-- 查看涂装数量最多的载具
SELECT name, type, country, skin_count 
FROM vehicles 
WHERE skin_count > 0 
ORDER BY skin_count DESC 
LIMIT 10;

-- 按国家统计载具数量
SELECT country, COUNT(*) as count, SUM(skin_count) as total_skins
FROM vehicles 
GROUP BY country 
ORDER BY total_skins DESC;

-- 按类型统计
SELECT type, COUNT(*) as count, SUM(skin_count) as total_skins
FROM vehicles 
GROUP BY type 
ORDER BY total_skins DESC;
```

## 🔧 常用操作

### 备份数据库

```bash
# 备份整个数据库
docker exec wt-mysql mysqldump -u root -pwarthunder123 warthunder > backup.sql

# 备份特定表
docker exec wt-mysql mysqldump -u root -pwarthunder123 warthunder vehicles > vehicles_backup.sql

# 备份到容器内
docker exec wt-mysql mysqldump -u root -pwarthunder123 warthunder > /tmp/backup.sql
docker cp wt-mysql:/tmp/backup.sql ./backup.sql
```

### 恢复数据库

```bash
# 从宿主机恢复
docker exec -i wt-mysql mysql -u root -pwarthunder123 warthunder < backup.sql

# 从容器内恢复
docker cp backup.sql wt-mysql:/tmp/backup.sql
docker exec wt-mysql mysql -u root -pwarthunder123 warthunder -e "source /tmp/backup.sql"
```

### 重置数据库

```bash
# 删除并重新创建数据库
docker exec -it wt-mysql mysql -u root -pwarthunder123 -e "DROP DATABASE IF EXISTS warthunder; CREATE DATABASE warthunder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 重新运行初始化脚本
docker exec -i wt-mysql mysql -u root -pwarthunder123 warthunder < server/init.sql
```

### 查看连接状态

```sql
-- 查看当前连接
SHOW PROCESSLIST;

-- 查看用户权限
SHOW GRANTS FOR 'wtuser'@'%';

-- 查看数据库大小
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'warthunder'
GROUP BY table_schema;
```

## 🐛 故障排查

### 问题 1: 无法连接

**症状**: `ERROR 2003: Can't connect to MySQL server`

**解决方案**:
```bash
# 检查容器状态
docker ps | grep wt-mysql

# 查看容器日志
docker logs wt-mysql

# 重启容器
docker restart wt-mysql
```

### 问题 2: 密码错误

**症状**: `ERROR 1045: Access denied for user`

**解决方案**:
```bash
# 确认使用正确的密码
# Root: warthunder123
# wtuser: wtpassword

# 重置密码（如果需要）
docker exec -it wt-mysql mysql -u root -pwarthunder123 -e "ALTER USER 'wtuser'@'%' IDENTIFIED BY 'wtpassword';"
```

### 问题 3: 数据库不存在

**症状**: `ERROR 1049: Unknown database 'warthunder'`

**解决方案**:
```bash
# 创建数据库
docker exec -it wt-mysql mysql -u root -pwarthunder123 -e "CREATE DATABASE warthunder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行初始化脚本
docker exec -i wt-mysql mysql -u root -pwarthunder123 warthunder < server/init.sql
```

## 📝 测试脚本

运行测试脚本验证连接：

```bash
# Windows
test_mysql_connection.bat

# Linux/Mac
chmod +x test_mysql_connection.sh
./test_mysql_connection.sh
```

## ⚠️ 重要提醒

1. **开发环境专用**: 当前密码仅用于开发环境
2. **不要提交到版本控制**: `.env` 文件应该在 `.gitignore` 中
3. **生产环境必须修改**: 部署前务必更换所有密码
4. **定期备份**: 重要数据定期备份
5. **监控访问**: 定期检查数据库访问日志

## 📚 相关文档

- [Docker Compose 配置](./server/docker-compose.yml)
- [环境变量配置](./server/.env)
- [数据库初始化脚本](./server/init.sql)
- [快速启动指南](./QUICK_START.md)

---

**最后更新**: 2024-02-28  
**环境**: 开发环境  
**状态**: ✅ 正常运行
