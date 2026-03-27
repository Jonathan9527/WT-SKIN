---
inclusion: fileMatch
fileMatchPattern: '**/vehicle**,**/skin**,**/App.vue,**/index.html'
---

# War Thunder 特殊字符处理规则

## 支持的特殊 Unicode 字符

| 字符 | Unicode | 含义 | 示例 |
|------|---------|------|------|
| ▄ | U+2584 | 俘获/租借/引进载具 | ▄Sho't Kal Dalet |
| ▃ | U+2583 | 外国载具（特殊改装） | ▃Grant I |
| ◍ | U+25CD | 特殊活动/限定载具 | ◍M1A1 HC |
| ␙ | U+2419 | 测试/特殊版本 | ␙M1A1 |

## 处理规则

1. 默认保留所有特殊字符，保持与 War Thunder Live 官方数据一致
2. API 提供 `clean=true` 参数可选清理特殊字符
3. 所有数据必须使用 UTF-8 编码
4. 数据库必须使用 utf8mb4 字符集

## 前端字体配置

确保使用支持 Unicode 的字体栈：
```css
font-family: 'Noto Sans', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif;
```

CSS 渲染优化：
```css
font-feature-settings: normal;
text-rendering: optimizeLegibility;
-webkit-font-smoothing: antialiased;
```

## 后端清理函数

```go
func cleanVehicleName(name string) string {
    replacements := []string{"▄", "▃", "◍", "␙"}
    result := name
    for _, char := range replacements {
        result = strings.Replace(result, char, "", -1)
    }
    return result
}
```

## 数据统计

当前数据集 3,083 个载具中约 270+ 个带特殊字符标记。
