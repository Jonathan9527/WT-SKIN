---
inclusion: fileMatch
fileMatchPattern: '**/vehicle**,**/sync**,**/Sync**,**/Skins**,**/StorePage**'
---

# 载具四级分类系统

## 分类结构

### 第一级：载具类型 (vehicle_type)
tank（坦克）, aircraft（飞机）, helicopter（直升机）, ship（舰船）

### 第二级：国家 (country)
usa, germany, ussr, britain, japan, china, france, italy, sweden, israel

### 第三级：载具子类型 (vehicle_class)

坦克：light_tank, medium_tank, heavy_tank, tank_destroyer, spaa
飞机：fighter, attacker, bomber
舰船：fleet, coastal

### 第四级：具体载具 (vehicle)
从 War Thunder Live API 动态加载的具体载具 ID，如 m1_abrams, t-34 等

## 级联筛选规则

- 改变上级分类时，下级分类自动重置为"全部"
- 载具列表根据选中的类型/国家/子类型动态加载
- 载具按涂装数量降序排列

## 相关文件

后端：
- `server/models/models.go` — Vehicle 和 Skin 模型
- `server/services/vehicle.go` — 载具筛选逻辑
- `server/handlers/vehicle.go` — 载具 API
- `server/data/vehicles_complete.json` — 完整载具层级数据（3,083 个载具）

前端：
- `admin/src/views/Sync.vue` — 同步页面四级选择
- `admin/src/views/Skins.vue` — 涂装管理四级筛选
- `admin/src/api/index.ts` — 载具相关 API 调用

## API 示例

```bash
# 获取美国重型坦克列表
GET /api/vehicles?type=tank&country=usa&class=heavy_tank

# 按四级筛选查询涂装
GET /api/skins?vehicleType=tank&vehicleCountry=usa&vehicleClass=heavy_tank&vehicle=m1_abrams

# 同步指定载具的涂装
POST /api/skins/sync
{ "vehicleType": "tank", "vehicleCountry": "usa", "vehicleClass": "heavy_tank", "vehicle": "m1_abrams", "period": 7, "page": 0 }
```

## 数据生成

```bash
node scripts/generate_vehicles_complete.js
```

从 HTML 和 JSON 源数据生成 `server/data/vehicles_complete.json`。
