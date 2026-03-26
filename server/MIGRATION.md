# 数据库迁移说明

## 新增载具表 (vehicles)

本次更新添加了载具分类功能，新增了 `vehicles` 表用于存储载具信息。

### 表结构

```sql
CREATE TABLE `vehicles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wt_live_id` varchar(100) NOT NULL,
  `name` varchar(200) DEFAULT NULL,
  `name_cn` varchar(200) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `class` varchar(50) DEFAULT NULL,
  `rank` int DEFAULT NULL,
  `br` double DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `description` text,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wt_live_id` (`wt_live_id`),
  KEY `idx_vehicles_name` (`name`),
  KEY `idx_vehicles_type` (`type`),
  KEY `idx_vehicles_country` (`country`),
  KEY `idx_vehicles_class` (`class`),
  KEY `idx_vehicles_rank` (`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 自动迁移

服务器启动时会自动创建该表，无需手动操作。

### 数据同步

使用管理后台的"数据同步"页面，可以：

1. 同步载具数据：调用 `/api/vehicles/sync` 接口
2. 查询载具列表：调用 `/api/vehicles` 接口，支持按类型、国家、子类型筛选

### 四级分类说明

1. **载具类型 (type)**: tank, aircraft, helicopter, ship
2. **国家 (country)**: usa, germany, ussr, britain, japan, china, france, italy, sweden, israel
3. **载具子类型 (class)**:
   - 坦克: light_tank, medium_tank, heavy_tank, tank_destroyer, spaa
   - 飞机: fighter, attacker, bomber
   - 舰船: fleet, coastal
4. **具体载具 (wt_live_id)**: 具体的载具名称

### API 接口

#### 获取载具列表
```
GET /api/vehicles?type=tank&country=usa&class=heavy_tank
```

#### 同步载具数据
```
POST /api/vehicles/sync
{
  "type": "tank",
  "country": "usa",
  "class": "heavy_tank"
}
```

#### 获取涂装列表（支持四级筛选）
```
GET /api/skins?vehicleType=tank&vehicleCountry=usa&vehicleClass=heavy_tank&vehicle=m1_abrams
```

#### 同步涂装数据（支持四级筛选）
```
POST /api/skins/sync
{
  "vehicleType": "tank",
  "vehicleCountry": "usa",
  "vehicleClass": "heavy_tank",
  "vehicle": "m1_abrams",
  "period": 7,
  "page": 0
}
```
