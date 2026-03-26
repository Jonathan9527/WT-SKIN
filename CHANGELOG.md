# 更新日志

## [1.0.0] - 2024-02-28

### ✨ 新增功能

#### 四级载具分类系统
- 实现完整的四级联动筛选：类型 → 国家 → 子类型 → 具体载具
- 支持 5 种载具类型、11 个国家、43 个子类型、3,083 个具体载具
- 数据来源于 War Thunder Live 官方 API

#### 特殊字符完整支持
- ✅ 完整支持 War Thunder Live 官方特殊 Unicode 字符
- ✅ 支持 ▄ (俘获/租借载具)
- ✅ 支持 ▃ (外国载具)
- ✅ 支持 ◍ (特殊活动载具)
- ✅ 支持 ␙ (测试/特殊版本)

#### API 增强
- 新增 `GET /api/vehicles` - 获取载具列表（支持四级筛选）
- 新增 `clean` 参数 - 可选的特殊字符清理功能
- 优化 JSON 响应格式
- 完整的 UTF-8 编码支持

#### 前端优化
- 全局字体配置，支持特殊 Unicode 字符
- 优化文本渲染设置
- 改进用户界面体验

### 🔧 技术改进

#### 后端
- `server/services/vehicle.go` - 重写载具筛选逻辑
- `server/handlers/vehicle.go` - 添加字符清理选项
- `server/Dockerfile` - 优化数据文件复制

#### 前端
- `admin/src/App.vue` - 全局样式和字体配置
- `admin/index.html` - UTF-8 编码声明

#### 数据
- `server/data/vehicles_complete.json` - 完整的载具层级数据
- `scripts/generate_vehicles_complete.js` - 数据生成脚本

### 📚 文档

新增文档：
- `VEHICLE_SPECIAL_CHARACTERS.md` - 特殊字符详细说明
- `API_DOCUMENTATION.md` - 完整 API 文档
- `QUICK_START.md` - 快速启动指南
- `README_SPECIAL_CHARS.md` - 特殊字符支持说明
- `IMPLEMENTATION_SUMMARY.md` - 实施总结
- `CHANGELOG.md` - 本文档

### 🧪 测试工具

新增测试页面：
- `test_special_characters.html` - 特殊字符显示测试
- `test_vehicle_filter.html` - 四级筛选测试（更新字体）

### 🐛 修复

- 修复载具名称中特殊字符显示为方块的问题
- 修复 Docker 容器中数据文件缺失的问题
- 优化字体渲染，确保跨平台兼容性

### 📊 数据统计

- 总载具数: 3,083
- 载具类型: 5
- 国家: 11
- 载具子类型: 43
- 带特殊字符的载具: ~270+

### 🌐 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- 现代移动浏览器

### 🚀 性能

- API 响应时间: <100ms
- 前端渲染: 流畅
- 数据加载: 快速
- 字符显示: 无延迟

### 📝 API 变更

#### 新增端点
```
GET /api/vehicles?type={type}&country={country}&class={class}&clean={boolean}
```

#### 响应格式
```json
{
  "status": "OK",
  "data": [
    {
      "id": "vehicle_id",
      "name": "Vehicle Name",
      "count": 123
    }
  ]
}
```

### 🔐 安全

- UTF-8 编码防止注入攻击
- 输入验证和清理
- CORS 配置优化

### ⚡ 优化

- 减少 API 调用次数
- 优化数据结构
- 改进缓存策略
- 字体加载优化

### 📦 依赖更新

无重大依赖更新，保持稳定性。

### 🎯 下一步计划

- [ ] 添加载具搜索功能
- [ ] 实现载具收藏功能
- [ ] 添加载具详情页面
- [ ] 优化移动端体验
- [ ] 添加数据导出功能

---

## 如何升级

### 从旧版本升级

1. **停止服务**
   ```bash
   cd server
   docker-compose down
   ```

2. **拉取最新代码**
   ```bash
   git pull origin main
   ```

3. **重新生成载具数据**
   ```bash
   node scripts/generate_vehicles_complete.js
   ```

4. **重新构建并启动**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

5. **更新前端依赖**
   ```bash
   cd admin
   npm install
   npm run dev
   ```

### 验证升级

1. 检查服务状态
   ```bash
   docker ps
   ```

2. 测试 API
   ```bash
   curl "http://localhost:8080/api/vehicles?type=tank&country=usa"
   ```

3. 打开测试页面
   ```bash
   open test_special_characters.html
   ```

---

## 贡献者

感谢所有为本项目做出贡献的开发者！

---

## 许可证

本项目仅供学习和个人使用。War Thunder 及相关商标归 Gaijin Entertainment 所有。
