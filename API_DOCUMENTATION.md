# War Thunder 涂装管理系统 API 文档

## 基础信息

本项目提供两套 API 接口：
- **Admin API**: `http://localhost:8080/api` - 后台管理接口
- **Client API**: `http://localhost:8080/client` - Windows 客户端接口

- **编码**: UTF-8
- **响应格式**: JSON

## 特殊字符支持

本 API 完整支持 War Thunder Live 官方使用的特殊 Unicode 字符：
- ▄ (U+2584) - 俘获/租借载具
- ▃ (U+2583) - 外国载具
- ◍ (U+25CD) - 特殊活动载具
- ␙ (U+2419) - 测试/特殊版本

详细说明请参考 [VEHICLE_SPECIAL_CHARACTERS.md](./VEHICLE_SPECIAL_CHARACTERS.md)

---

## 接口区别

| 功能 | Admin API (`/api`) | Client API (`/client`) |
|------|-----------|------------|
| 涂装列表 | 包含关联载具信息 | 简化格式 |
| 默认分页 | 10条/页 | 20条/页 |
| 载具列表 | 支持JSON和数据库 | 仅数据库 |
| 同步功能 | 支持 | 不支持 |
| 用户管理 | 支持 | 不支持 |

---

## Client API (Windows 客户端)

### 获取载具列表（四级筛选）
```
GET /client/vehicles?type=tank&country=france&class=spaa
```

参数：
- `type`: 载具类型 (tank, aircraft, helicopter, ship)
- `country`: 国家 (usa, germany, ussr, britain, japan, china, france, italy, sweden, israel)
- `class`: 子类型

返回：按涂装数量降序排列的载具列表

### 获取涂装列表
```
GET /client/skins?vehicleType=tank&vehicleCountry=france&vehicle=fr_amx_30_roland
```

参数：
- `vehicleType`: 载具类型
- `vehicleCountry`: 国家
- `vehicleClass`: 子类型
- `vehicle`: 载具ID
- `sort`: 排序 (created, likes, views, downloads)
- `search`: 搜索关键词
- `page`: 页码
- `pageSize`: 每页数量 (默认20)

### 获取涂装详情
```
GET /client/skins/:id
```

---

## Admin API (后台管理)

## 载具相关 API

### 1. 获取载具列表

获取符合条件的载具列表，支持四级筛选。

**请求**
```
GET /api/vehicles
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| type | string | 是 | 载具类型 | tank, aircraft, helicopter, ship |
| country | string | 否 | 国家 | usa, germany, ussr, britain, japan, china, france, italy, sweden, israel |
| class | string | 否 | 载具子类型 | light_tank, medium_tank, heavy_tank, fighter, bomber 等 |
| clean | boolean | 否 | 是否清理特殊字符 | true/false（默认 false） |

**响应示例**

```json
{
  "status": "OK",
  "data": [
    {
      "id": "uk_centurion_shot_kal_d",
      "name": "▄Sho't Kal Dalet",
      "count": 178
    },
    {
      "id": "uk_challenger_2",
      "name": "Challenger 2",
      "count": 246
    }
  ]
}
```

**使用示例**

```bash
# 获取所有美国坦克
curl "http://localhost:8080/api/vehicles?type=tank&country=usa"

# 获取美国中型坦克
curl "http://localhost:8080/api/vehicles?type=tank&country=usa&class=medium_tank"

# 获取载具并清理特殊字符
curl "http://localhost:8080/api/vehicles?type=tank&country=britain&clean=true"
```

---

### 2. 同步载具数据

从 War Thunder Live 同步载具数据到数据库。

**请求**
```
POST /api/vehicles/sync
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 载具类型 |
| country | string | 否 | 国家 |
| class | string | 否 | 载具子类型 |

**响应示例**

```json
{
  "status": "OK",
  "count": 42
}
```

---

## 涂装相关 API

### 3. 获取涂装列表

获取涂装列表，支持分页和筛选。

**请求**
```
GET /api/skins
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | int | 否 | 页码（从 1 开始） | 1 |
| page_size | int | 否 | 每页数量 | 20 |
| vehicle_type | string | 否 | 载具类型 | - |
| vehicle_country | string | 否 | 国家 | - |
| vehicle_class | string | 否 | 载具子类型 | - |
| vehicle | string | 否 | 具体载具 ID | - |

**响应示例**

```json
{
  "status": "OK",
  "data": {
    "items": [
      {
        "id": 1,
        "wt_live_id": "123456",
        "title": "Desert Storm",
        "author": "Player123",
        "vehicle_type": "tank",
        "vehicle_country": "usa",
        "vehicle_class": "medium_tank",
        "vehicle": "m1_abrams",
        "image_url": "https://...",
        "download_url": "https://...",
        "views": 1000,
        "downloads": 500,
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

---

### 4. 同步涂装数据

从 War Thunder Live 同步涂装数据。

**请求**
```
POST /api/skins/sync
```

**请求体**

```json
{
  "vehicle_type": "tank",
  "vehicle_country": "usa",
  "vehicle_class": "medium_tank",
  "vehicle": "m1_abrams",
  "period": 7,
  "page": 0
}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vehicle_type | string | 否 | 载具类型 |
| vehicle_country | string | 否 | 国家 |
| vehicle_class | string | 否 | 载具子类型 |
| vehicle | string | 否 | 具体载具 ID |
| period | int | 否 | 时间范围（天），0 表示全部 |
| page | int | 否 | 页码（从 0 开始） |

**响应示例**

```json
{
  "status": "OK",
  "count": 25,
  "message": "同步成功"
}
```

---

### 5. 删除涂装

删除指定的涂装记录。

**请求**
```
DELETE /api/skins/:id
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | int | 涂装 ID |

**响应示例**

```json
{
  "status": "OK",
  "message": "删除成功"
}
```

---

## 标签相关 API

### 6. 获取标签列表

获取所有标签。

**请求**
```
GET /api/tags
```

**响应示例**

```json
{
  "status": "OK",
  "data": [
    {
      "id": 1,
      "name": "历史涂装",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 7. 创建标签

创建新标签。

**请求**
```
POST /api/tags
```

**请求体**

```json
{
  "name": "历史涂装"
}
```

**响应示例**

```json
{
  "status": "OK",
  "data": {
    "id": 1,
    "name": "历史涂装",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 用户相关 API

### 8. 用户登录

用户登录认证。

**请求**
```
POST /api/login
```

**请求体**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应示例**

```json
{
  "status": "OK",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

---

### 9. 获取用户列表

获取所有用户（需要管理员权限）。

**请求**
```
GET /api/users
```

**Headers**
```
Authorization: Bearer <token>
```

**响应示例**

```json
{
  "status": "OK",
  "data": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 错误响应

所有 API 在发生错误时返回统一格式：

```json
{
  "status": "ERROR",
  "error": "错误描述信息"
}
```

**常见错误码**

| HTTP 状态码 | 说明 |
|------------|------|
| 400 | 请求参数错误 |
| 401 | 未授权（需要登录） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 数据类型说明

### 载具类型 (vehicle_type)

| 值 | 说明 |
|----|------|
| tank | 坦克 |
| aircraft | 飞机 |
| helicopter | 直升机 |
| ship | 舰船 |

### 国家 (country)

| 值 | 说明 |
|----|------|
| usa | 美国 |
| germany | 德国 |
| ussr | 苏联 |
| britain | 英国 |
| japan | 日本 |
| china | 中国 |
| france | 法国 |
| italy | 意大利 |
| sweden | 瑞典 |
| israel | 以色列 |

### 载具子类型 (vehicle_class)

**坦克类**
- light_tank - 轻型坦克
- medium_tank - 中型坦克
- heavy_tank - 重型坦克
- tank_destroyer - 坦克歼击车
- spaa - 自行防空炮

**飞机类**
- fighter - 战斗机
- jet_fighter - 喷气战斗机
- attacker - 攻击机
- bomber - 轰炸机
- 等等...

**直升机类**
- attack_helicopter - 攻击直升机
- utility_helicopter - 通用直升机

**舰船类**
- destroyer - 驱逐舰
- light_cruiser - 轻巡洋舰
- heavy_cruiser - 重巡洋舰
- battleship - 战列舰
- 等等...

---

## 测试工具

项目提供了多个测试页面：

1. **test_vehicle_filter.html** - 四级联动筛选测试
2. **test_special_characters.html** - 特殊字符显示测试
3. **test_vehicle_api.bat** - API 命令行测试脚本

---

## 注意事项

1. **编码**: 所有请求和响应都使用 UTF-8 编码
2. **特殊字符**: 载具名称可能包含特殊 Unicode 字符，请确保客户端正确处理
3. **分页**: 涂装列表 API 使用基于 1 的分页（page=1 表示第一页）
4. **同步**: 涂装同步 API 使用基于 0 的分页（page=0 表示第一页），与 War Thunder Live API 保持一致
5. **认证**: 部分 API 需要在 Header 中携带 JWT token

---

## 更新日志

### v1.0.0 (2024-02-28)
- 实现四级载具分类系统
- 支持 3,083 个载具数据
- 完整支持 War Thunder Live 特殊字符
- 提供字符清理选项（clean 参数）
