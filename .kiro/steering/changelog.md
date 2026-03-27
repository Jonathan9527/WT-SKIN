---
inclusion: manual
---

# 更新日志

## v1.0.0 (2024-02-28)

### 新增功能
- 四级载具分类系统：类型 → 国家 → 子类型 → 具体载具（5 类型, 11 国家, 43 子类型, 3,083 载具）
- War Thunder Live 特殊 Unicode 字符完整支持（▄ ▃ ◍ ␙）
- `GET /api/vehicles` 端点，支持四级筛选和 `clean` 参数
- 全局字体配置支持 Unicode 字符渲染
- 测试工具：特殊字符测试页、四级筛选测试页、API 测试脚本

### 技术改进
- 后端：重写载具筛选逻辑、添加字符清理选项、优化 Dockerfile
- 前端：全局样式和字体配置、UTF-8 编码声明
- 数据：完整载具层级数据 vehicles_complete.json、生成脚本

### 修复
- 载具名称特殊字符显示为方块
- Docker 容器数据文件缺失
- 跨平台字体渲染兼容性

### 下一步计划
- 载具搜索功能
- 载具收藏功能
- 载具详情页面
- 移动端优化
- 数据导出功能

## 升级步骤

```bash
cd server && docker-compose down
git pull origin main
node scripts/generate_vehicles_complete.js
docker-compose build && docker-compose up -d
cd ../admin && npm install && npm run dev
```
