---
inclusion: fileMatch
fileMatchPattern: 'electron_client/**/*.tsx'
---

# ScrollArea 规则

在 electron_client 项目中，所有需要滚动的区域必须使用 shadcn ScrollArea 组件，禁止使用原生 `overflow-auto` 或 `overflow-scroll`。

组件路径：`@/components/ui/scroll-area`

用法：
```tsx
import { ScrollArea } from '@/components/ui/scroll-area';

<ScrollArea className="h-[400px]">
  {/* 内容 */}
</ScrollArea>
```

参考文档：https://ui.shadcn.com/docs/components/radix/scroll-area
