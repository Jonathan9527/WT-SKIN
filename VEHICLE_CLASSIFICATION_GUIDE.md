# War Thunder 载具四级分类功能使用指南

## 功能概述

本系统实现了完整的 War Thunder 载具四级分类功能，可以精确筛选和同步涂装数据。

## 四级分类结构

### 第一级：载具类型 (Vehicle Type)
- `any` - 全部
- `tank` - 坦克
- `aircraft` - 飞机
- `helicopter` - 直升机
- `ship` - 舰船

### 第二级：国家 (Country)
- `any` - 全部
- `usa` - 美国
- `germany` - 德国
- `ussr` - 苏联
- `britain` - 英国
- `japan` - 日本
- `china` - 中国
- `france` - 法国
- `italy` - 意大利
- `sweden` - 瑞典
- `israel` - 以色列

### 第三级：载具子类型 (Vehicle Class)

#### 坦克子类型
- `light_tank` - 轻型坦克
- `medium_tank` - 中型坦克
- `heavy_tank` - 重型坦克
- `tank_destroyer` - 坦克歼击车
- `spaa` - 自行防空炮

#### 飞机子类型
- `fighter` - 战斗机
- `attacker` - 攻击机
- `bomber` - 轰炸机

#### 舰船子类型
- `fleet` - 舰队
- `coastal` - 沿海

### 第四级：具体载具 (Vehicle)
- 具体的载具名称，如 `m1_abrams`, `t-34`, `bf_109` 等
- 从 War Thunder Live API 动态加载

## 使用方法

### 1. 管理后台 - 数据同步页面

1. 打开管理后台 `http://localhost:5173`
2. 登录后进入"数据同步"页面
3. 选择筛选条件：
   - 载具类型：选择要同步的载具类型
   - 国家：选择国家（可选）
   - 载具子类型：根据载具类型显示对应的子类型（可选）
   - 具体载具：从数据库加载的载具列表中选择（可选）
   - 时间范围：选择同步的时间范围
   - 页码：选择要同步的页码
4. 点击"开始同步"或"批量同步"按钮

### 2. 管理后台 - 涂装管理页面

1. 打开"涂装管理"页面
2. 使用顶部的筛选器：
   - 全部类型 / 坦克 / 飞机 / 直升机 / 舰船
   - 全部国家 / 具体国家
   - 全部子类型 / 具体子类型（根据载具类型动态显示）
   - 全部载具 / 具体载具（从数据库动态加载）
3. 点击"刷新"按钮查看筛选结果

### 3. API 调用示例

#### 同步涂装数据（四级筛选）
```bash
curl -X POST http://localhost:8080/api/skins/sync \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "tank",
    "vehicleCountry": "usa",
    "vehicleClass": "heavy_tank",
    "vehicle": "m1_abrams",
    "period": 7,
    "page": 0
  }'
```

#### 查询涂装列表（四级筛选）
```bash
curl "http://localhost:8080/api/skins?vehicleType=tank&vehicleCountry=usa&vehicleClass=heavy_tank&vehicle=m1_abrams&page=0&pageSize=10"
```

#### 同步载具数据
```bash
curl -X POST "http://localhost:8080/api/vehicles/sync?type=tank&country=usa&class=heavy_tank"
```

#### 查询载具列表
```bash
curl "http://localhost:8080/api/vehicles?type=tank&country=usa&class=heavy_tank"
```

## 数据库变更

### 新增表：vehicles

存储载具信息，包括：
- `wt_live_id` - War Thunder Live 中的载具 ID（唯一）
- `name` - 载具名称
- `name_cn` - 中文名称
- `type` - 载具类型
- `country` - 国家
- `class` - 子类型
- `rank` - 等级
- `br` - 战斗评级
- `image_url` - 载具图片
- `description` - 描述

### 更新表：skins

现有字段支持四级分类：
- `vehicle_type` - 载具类型（第一级）
- `vehicle_country` - 国家（第二级）
- `vehicle_class` - 载具子类型（第三级）
- `vehicle_name` - 具体载具名称（第四级）

## 启动步骤

### 1. 启动后端服务器

```bash
cd server
go run main.go
```

服务器会自动创建 `vehicles` 表。

### 2. 启动前端管理后台

```bash
cd admin
npm install
npm run dev
```

访问 `http://localhost:5173`

### 3. 首次使用

1. 登录管理后台（默认账号：admin / admin123）
2. 进入"数据同步"页面
3. 先同步一些涂装数据，系统会自动从描述中提取载具信息
4. （可选）调用载具同步 API 获取完整的载具列表

## 注意事项

1. **载具列表动态加载**：选择载具类型后，系统会从数据库加载对应的载具列表
2. **级联筛选**：改变上级分类时，下级分类会自动重置为"全部"
3. **War Thunder Live API 限制**：
   - 注意请求频率，避免被限流
   - 批量同步时已添加 500ms 延迟
4. **数据提取**：
   - 系统会从涂装描述中自动提取载具信息
   - 提取准确度取决于描述的规范性
   - 建议定期同步载具数据以获取准确的分类信息

## 故障排查

### 载具列表为空
- 检查是否选择了载具类型
- 确认数据库中有对应的载具数据
- 尝试调用载具同步 API

### 同步失败
- 检查网络连接
- 确认 War Thunder Live API 可访问
- 查看服务器日志获取详细错误信息

### 分类信息不准确
- 涂装描述可能不规范
- 可以手动调用载具同步 API 获取准确数据
- 或者手动更新数据库中的分类字段

## 技术架构

### 后端 (Go)
- `server/models/models.go` - 数据模型（新增 Vehicle 表）
- `server/services/vehicle.go` - 载具服务
- `server/services/sync.go` - 同步服务（更新支持四级分类）
- `server/handlers/vehicle.go` - 载具 API 处理器
- `server/handlers/skin.go` - 涂装 API 处理器（更新支持四级分类）
- `server/router/router.go` - 路由配置（新增载具路由）
- `server/database/database.go` - 数据库初始化（新增 Vehicle 表迁移）

### 前端 (Vue 3 + TypeScript)
- `admin/src/views/Sync.vue` - 数据同步页面（新增四级分类选择）
- `admin/src/views/Skins.vue` - 涂装管理页面（新增四级分类筛选）
- `admin/src/api/index.ts` - API 接口（新增载具相关接口）

## 更新日志

### v2.0.0 - 2024-02-28
- ✅ 新增载具表 (vehicles)
- ✅ 实现四级分类筛选（类型 > 国家 > 子类型 > 具体载具）
- ✅ 前端同步页面支持四级分类选择
- ✅ 前端涂装管理页面支持四级分类筛选
- ✅ 后端 API 支持四级分类查询和同步
- ✅ 载具列表动态加载
- ✅ 级联筛选功能
- ✅ 改进的载具信息提取算法
