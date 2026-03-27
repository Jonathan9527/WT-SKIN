---
inclusion: fileMatch
fileMatchPattern: 'electron_client/**/*.tsx,electron_client/**/*.ts'
---

# UI 组件规范 — Electron 客户端

## 规则

涉及 UI 变动时，优先使用 shadcn/ui 组件，禁止自行实现已有 shadcn 组件能覆盖的功能。

## 技术栈

- React 18 + TypeScript
- Tailwind CSS 3
- shadcn/ui（基于 Radix UI）
- lucide-react 图标库

## 已安装的 shadcn 组件

路径：`electron_client/src/components/ui/`

- `scroll-area.tsx` — 滚动区域（基于 @radix-ui/react-scroll-area）

## 已安装的 Radix UI 依赖

- @radix-ui/react-dialog
- @radix-ui/react-select
- @radix-ui/react-tooltip
- @radix-ui/react-scroll-area

## 添加新 shadcn 组件

项目未使用 shadcn CLI，手动添加组件：

1. 在 `electron_client/src/components/ui/` 下创建组件文件
2. 从 https://ui.shadcn.com/docs/components 参考实现
3. 使用 `cn()` 工具函数（位于 `@/lib/utils`）合并 class
4. 使用 `class-variance-authority`（已安装）做变体
5. 使用 `tailwind-merge`（已安装）处理 class 冲突

## 样式约定

- 使用 Tailwind CSS class，不写内联 style（除非动态计算值）
- 圆角统一用 `rounded-lg` 或 `rounded-xl`
- 间距用 Tailwind 的 spacing scale
- 颜色使用 slate 系列作为中性色，blue 作为主色
- 支持 dark mode（使用 `dark:` 前缀）
- 文字大小：标题 `text-sm`/`text-base`，正文 `text-xs`，辅助 `text-[10px]`/`text-[11px]`

## 自定义组件

以下为项目自定义组件，非 shadcn 标准组件：

- `components/TitleBar.tsx` — 自定义窗口标题栏
- `components/ImageCarousel.tsx` — 图片轮播（含缓存、loading）
