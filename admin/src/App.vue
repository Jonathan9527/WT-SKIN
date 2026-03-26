<template>
  <a-config-provider :locale="zhCN">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
</script>

<style>
/* 导入 Noto Sans 字体 - 支持完整的 Unicode 字符集 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap');

body {
  margin: 0;
  padding: 0;
  /* 使用 Noto Sans 作为主字体，确保 Unicode 字符正确显示 */
  font-family: 'Noto Sans', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* 确保特殊 Unicode 字符正确显示 */
* {
  font-feature-settings: normal;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 特别优化 War Thunder 特殊字符显示 */
.unicode-char,
.vehicle-name,
.skin-title {
  font-family: 'Noto Sans', 'Noto Sans SC', 'Segoe UI Symbol', 'Symbola', sans-serif;
  font-variant-ligatures: none;
}
</style>
