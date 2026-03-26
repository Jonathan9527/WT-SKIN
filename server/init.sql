-- 初始化数据库
CREATE DATABASE IF NOT EXISTS warthunder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE warthunder;

-- 授权
GRANT ALL PRIVILEGES ON warthunder.* TO 'wtuser'@'%';
FLUSH PRIVILEGES;
