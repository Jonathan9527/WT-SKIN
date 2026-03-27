---
inclusion: fileMatch
fileMatchPattern: '**/api/**,**/handlers/**,**/router/**,**/services/**'
---

# API 文档参考

本项目提供两套 API 接口，编码 UTF-8，响应格式 JSON。

## Client API (`/client`) — Windows 客户端

- `GET /client/vehicles?type=&country=&class=` — 载具列表（四级筛选，按涂装数量降序）
- `GET /client/skins?vehicleType=&vehicleCountry=&vehicleClass=&vehicle=&sort=&search=&page=&pageSize=` — 涂装列表（默认 20 条/页）
- `GET /client/skins/:id` — 涂装详情

## Admin API (`/api`) — 后台管理

### 载具
- `GET /api/vehicles?type=&country=&class=&clean=` — 载具列表（支持 clean=true 清理特殊字符）
- `GET /api/vehicles/db` — 从数据库获取载具
- `POST /api/vehicles/sync` — 从 WT Live 同步载具数据
- `POST /api/vehicles/sync-from-json` — 从 JSON 文件同步载具
- `POST /api/vehicles/refresh-counts` — 刷新载具涂装计数
- `GET /api/vehicles/remote-stats` — 远程统计

### 涂装
- `GET /api/skins?page=&page_size=&vehicle_type=&vehicle_country=&vehicle_class=&vehicle=` — 涂装列表（默认 10 条/页）
- `GET /api/skins/:id` — 涂装详情
- `POST /api/skins/sync` — 同步涂装（body: vehicleType, vehicleCountry, vehicleClass, vehicle, period, page）
- `POST /api/skins/detail` — 获取涂装详细信息
- `DELETE /api/skins/:id` — 删除涂装

### 同步
- `POST /api/sync/start` — 开始同步任务
- `GET /api/sync/status` — 同步状态
- `GET /api/sync/sessions` — 同步会话列表
- `GET /api/ws/sync-vehicles` — WebSocket 实时同步进度

### 标签
- `GET /api/tags` — 标签列表
- `GET /api/tags/:name` — 标签下的涂装
- `GET /api/tags/stats` — 标签统计

### 用户
- `POST /api/register` — 注册
- `POST /api/login` — 登录（返回 JWT token）
- `GET /api/user/profile` — 用户信息（需认证）
- `GET /api/user/favorites` — 收藏列表（需认证）
- `GET /api/user/downloads` — 下载记录（需认证）
- `POST /api/skins/:id/download` — 记录下载（需认证）
- `POST /api/skins/:id/favorite` — 收藏/取消（需认证）

### 管理
- `GET /api/admin/stats` — 统计数据
- `GET /api/admin/users` — 用户列表
- `DELETE /api/admin/users/:id` — 删除用户

## 数据类型枚举

- vehicle_type: tank, aircraft, helicopter, ship
- country: usa, germany, ussr, britain, japan, china, france, italy, sweden, israel
- vehicle_class (坦克): light_tank, medium_tank, heavy_tank, tank_destroyer, spaa
- vehicle_class (飞机): fighter, attacker, bomber
- vehicle_class (舰船): fleet, coastal
- sort: created, likes, views, downloads

## 错误响应格式

```json
{ "status": "ERROR", "error": "错误描述" }
```

HTTP 状态码：400 参数错误, 401 未授权, 403 权限不足, 404 不存在, 500 服务器错误
