<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>仪表盘</h2>
      <a-space>
        <a-button @click="fetchData" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-switch v-model:checked="autoRefresh" checked-children="自动刷新" un-checked-children="手动刷新" @change="toggleAutoRefresh" />
      </a-space>
    </div>
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card>
          <a-statistic title="涂装总数" :value="stats.totalSkins" :loading="loading">
            <template #prefix><SkinOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="载具总数" :value="stats.totalVehicles" :loading="loading">
            <template #prefix><CarOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="总下载量" :value="stats.totalDownloads" :loading="loading">
            <template #prefix><DownloadOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="总浏览量" :value="stats.totalViews" :loading="loading">
            <template #prefix><EyeOutlined /></template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="最近涂装" style="margin-top: 16px">
      <template #extra>
        <a-button type="primary" @click="handleGenerateDataPack" :loading="generating">
          <template #icon><DatabaseOutlined /></template>
          生成数据包
        </a-button>
      </template>
      <a-table :columns="columns" :data-source="recentSkins" :loading="loading" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'image'">
            <a-image :src="record.image_url" :width="60" :height="40" style="object-fit: cover" />
          </template>
          <template v-if="column.key === 'vehicle_type'">
            <a-tag :color="getTypeColor(record.vehicle_type)">{{ getTypeName(record.vehicle_type) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { SkinOutlined, CarOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { getSkins, getStats, generateDataPack } from '../api'

const loading = ref(false)
const autoRefresh = ref(true)
const generating = ref(false)
let refreshTimer: any = null

const stats = ref({
  totalSkins: 0,
  totalVehicles: 0,
  totalDownloads: 0,
  totalViews: 0
})
const recentSkins = ref([])

const columns = [
  { title: '图片', key: 'image', width: 80 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '作者', dataIndex: 'author', width: 100 },
  { title: '类型', key: 'vehicle_type', width: 100 },
  { title: '下载', dataIndex: 'downloads', width: 80 },
  { title: '点赞', dataIndex: 'likes', width: 80 }
]

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    tank: 'green',
    aircraft: 'blue',
    helicopter: 'orange',
    ship: 'purple'
  }
  return colors[type] || 'default'
}

const getTypeName = (type: string) => {
  const names: Record<string, string> = {
    tank: '坦克',
    aircraft: '飞机',
    helicopter: '直升机',
    ship: '舰船'
  }
  return names[type] || type || '-'
}

const fetchData = async () => {
  loading.value = true
  try {
    // 获取统计数据
    try {
      const statsRes: any = await getStats()
      if (statsRes.status === 'OK') {
        stats.value.totalSkins = statsRes.data.totalSkins || 0
        stats.value.totalDownloads = statsRes.data.totalDownloads || 0
        stats.value.totalVehicles = statsRes.data.totalVehicles || 0
        stats.value.totalViews = statsRes.data.totalViews || 0
      }
    } catch (err) {
      console.error('获取统计数据失败:', err)
    }

    // 获取最近涂装
    const skinsRes: any = await getSkins({ page: 0, pageSize: 5 })
    if (skinsRes.status === 'OK') {
      recentSkins.value = skinsRes.data.list || []
      // 如果统计接口失败，至少显示涂装总数
      if (!stats.value.totalSkins) {
        stats.value.totalSkins = skinsRes.data.total || 0
      }
    }
  } finally {
    loading.value = false
  }
}

const toggleAutoRefresh = (checked: boolean) => {
  if (checked) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  refreshTimer = setInterval(() => {
    fetchData()
  }, 10000) // 每10秒刷新一次
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  fetchData()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

const handleGenerateDataPack = async () => {
  generating.value = true
  try {
    const res: any = await generateDataPack()
    if (res.status === 'OK') {
      message.success(`数据包生成成功！涂装: ${res.data.skin_count}, 载具: ${res.data.vehicle_count}, 大小: ${(res.data.size / 1048576).toFixed(1)} MB`)
    } else {
      message.error(res.error || '生成失败')
    }
  } catch (err: any) {
    message.error(err.message || '生成数据包失败')
  }
  generating.value = false
}

onUnmounted(() => {
  stopAutoRefresh()
})
</script>
