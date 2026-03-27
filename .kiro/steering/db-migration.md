---
inclusion: fileMatch
fileMatchPattern: '**/database/**,**/models/**,**/init.sql,**/MIGRATION**'
---

# 数据库迁移参考

## 自动迁移

服务器启动时通过 GORM `AutoMigrate()` 自动创建/更新表，无需手动操作。

## vehicles 表结构

```sql
CREATE TABLE `vehicles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wt_live_id` varchar(100) NOT NULL UNIQUE,
  `name` varchar(200),
  `name_cn` varchar(200),
  `type` varchar(50),       -- tank, aircraft, helicopter, ship
  `country` varchar(50),    -- usa, germany, ussr, britain, japan, china, france, italy, sweden, israel
  `class` varchar(50),      -- light_tank, medium_tank, heavy_tank, tank_destroyer, spaa, fighter, attacker, bomber, fleet, coastal
  `rank` int,
  `br` double,
  `skin_count` int DEFAULT 0,
  `image_url` varchar(500),
  `description` text,
  `created_at` datetime(3),
  `updated_at` datetime(3),
  PRIMARY KEY (`id`),
  KEY `idx_vehicles_name` (`name`),
  KEY `idx_vehicles_type` (`type`),
  KEY `idx_vehicles_country` (`country`),
  KEY `idx_vehicles_class` (`class`),
  KEY `idx_vehicles_rank` (`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 四级分类字段映射

- skins 表：vehicle_type（第一级）, vehicle_country（第二级，JSON 数组存多国家）, vehicle_class（第三级）, vehicle_name（第四级）
- vehicles 表：type, country, class, wt_live_id
- skin_vehicles 关联表：skin_id ↔ vehicle_id（多对多）

## 同步相关表

- sync_sessions：记录每次同步会话的状态和进度
- sync_logs：记录同步过程中的详细日志
