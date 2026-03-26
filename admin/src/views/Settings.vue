<template>
  <div>
    <h2>系统设置</h2>
    
    <a-card title="服务状态">
      <a-descriptions bordered :column="2">
        <a-descriptions-item label="API 服务">
          <a-badge :status="apiStatus ? 'success' : 'error'" :text="apiStatus ? '运行中' : '离线'" />
        </a-descriptions-item>
        <a-descriptions-item label="数据库">
          <a-badge :status="dbStatus ? 'success' : 'error'" :text="dbStatus ? '已连接' : '未连接'" />
        </a-descriptions-item>
        <a-descriptions-item label="API 地址">http://localhost:8080</a-descriptions-item>
        <a-descriptions-item label="数据库类型">MySQL 8.0</a-descriptions-item>
      </a-descriptions>
      <a-button type="primary" style="margin-top: 16px" @click="checkStatus">
        <ReloadOutlined /> 刷新状态
      </a-button>
    </a-card>

    <a-card title="缓存管理" style="margin-top: 16px">
      <a-space>
        <a-button @click="clearCache">
          <DeleteOutlined /> 清除缓存
        </a-button>
      </a-space>
    </a-card>

    <a-card title="关于" style="margin-top: 16px">
      <a-descriptions :column="1">
        <a-descriptions-item label="系统名称">War Thunder 涂装管理后台</a-descriptions-item>
        <a-descriptions-item label="版本">1.0.0</a-descriptions-item>
        <a-descriptions-item label="技术栈">Vue 3 + Ant Design Vue + Go + MySQL</a-descriptions-item>
        <a-descriptions-item label="数据来源">War Thunder Live</a-descriptions-item>
      </a-descriptions>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import api from '../api'

const apiStatus = ref(false)
const dbStatus = ref(false)

const checkStatus = async () => {
  try {
    const res = await api.get('/health')
    apiStatus.value = res.status === 'ok'
    dbStatus.value = res.status === 'ok'
  } catch {
    apiStatus.value = false
    dbStatus.value = false
  }
}

const clearCache = () => {
  localStorage.clear()
  message.success('缓存已清除')
}

onMounted(checkStatus)
</script>
