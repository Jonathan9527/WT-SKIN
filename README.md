# War Thunder 涂装下载器

War Thunder Live 社区内容下载工具

## 🚀 快速开始

**第一次使用？** 请查看 [QUICKSTART.md](QUICKSTART.md) 获取详细的安装指南。

### 一键检查环境

双击运行 `setup_check.bat` 检查你的系统环境。

### 安装依赖

1. **安装 Go**（必需）
   - 双击 `install_go.bat` 打开下载页面
   - 或访问：https://go.dev/dl/

2. **安装 GCC**（GUI 需要）
   - 双击 `install_gcc.bat` 打开下载页面
   - 或访问：https://jmeubank.github.io/tdm-gcc/

3. **验证安装**
   - 双击 `setup_check.bat`

### 测试运行

```bash
# 测试 API（最简单）
test_api.bat

# 运行命令行版本
go run main.go

# 运行 GUI 版本
go run main_gui.go
```

## 功能特性

- 单个 exe 文件，无需额外依赖
- 现代化图形界面（基于 Fyne）
- 搜索和浏览涂装
- 按国家、载具类型筛选
- 查看热门内容（按点赞、下载、浏览排序）
- 详细信息查看
- 直接下载涂装文件
- 支持所有 War Thunder Live API 参数

## 开发环境

- Go 1.21+
- Windows 10/11

## 构建说明

### 方式 1: 使用批处理文件

```bash
# 构建 GUI 版本（推荐）
build-gui.bat

# 构建 GUI 版本（带控制台，用于调试）
build-gui-console.bat

# 构建命令行版本
build-console.bat
```

### 方式 2: 手动构建

```bash
# GUI 版本
go build -ldflags="-s -w -H windowsgui" -o warthunder-gui.exe main_gui.go

# 命令行版本
go build -ldflags="-s -w" -o warthunder-cli.exe main.go

# 进一步压缩（可选，需要安装 UPX）
upx --best --lzma warthunder-gui.exe
```

## API 参数说明

支持的搜索参数：
- `content`: 内容类型（camouflage, sight, model, image, controls）
- `sort`: 排序方式（created, likes, views, downloads）
- `vehicleCountry`: 国家筛选（usa, germany, ussr, britain, japan, china, italy, france, sweden, israel）
- `period`: 时间范围（天数）
- `searchString`: 搜索关键词
- `page`: 页码
- `featured`: 是否精选（0/1）

## 项目结构

```
warthunder-plugin/
├── main.go              # 命令行版本入口
├── main_gui.go          # GUI 版本入口
├── api/
│   └── warthunder.go    # API 客户端
├── gui/
│   └── mainwindow.go    # GUI 主窗口
├── go.mod               # Go 模块定义
├── build-gui.bat        # 构建 GUI 版本
├── build-gui-console.bat # 构建 GUI 版本（带控制台）
├── build-console.bat    # 构建命令行版本
└── README.md            # 说明文档
```

## 使用说明

### GUI 版本（推荐）

1. 双击运行 `warthunder-gui.exe`
2. 使用界面功能：
   - 输入关键词搜索
   - 选择国家筛选
   - 选择排序方式（最新/最多点赞/最多浏览/最多下载）
   - 选择时间范围
   - 点击"搜索"按钮
3. 查看结果列表
4. 点击"查看详情"查看完整信息
5. 点击"下载"保存涂装文件

### 命令行版本

1. 运行 `warthunder-cli.exe`
2. 按照菜单提示操作

## 注意事项

⚠️ 请确保：
- 以管理员权限运行
- 关闭 War Thunder 游戏后再安装
- 遵守游戏使用条款

## 开发计划

- [x] War Thunder Live API 集成
- [x] 搜索和筛选功能
- [x] 内容浏览和展示
- [x] 图形界面（Fyne）
- [ ] 文件下载功能
- [ ] 自动安装到游戏目录
- [ ] 涂装预览功能
- [ ] 收藏和管理功能

## 快速开始

### 如果你还没有安装 Go

请查看 [INSTALL.md](INSTALL.md) 获取详细的安装指南。

### 如果你已经安装了 Go

```bash
# 1. 测试 API（不需要 GUI）
go run test_api.go

# 2. 运行命令行版本
go run main.go

# 3. 运行 GUI 版本（需要 GCC）
go run main_gui.go
```

## 许可证

仅供学习和研究使用
