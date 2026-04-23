<template>
  <div>
    <h2>载具数据管理</h2>

    <!-- 载具统计 -->
    <a-row :gutter="16" style="margin-bottom: 16px;">
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="载具总数" :value="stats.total" :loading="loadingStats" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="坦克" :value="stats.tank" :loading="loadingStats" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="飞机" :value="stats.aircraft" :loading="loadingStats" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="直升机 / 舰船" :value="`${stats.helicopter} / ${stats.ship}`" :loading="loadingStats" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 同步载具数据 -->
    <a-card title="同步载具数据" style="margin-bottom: 16px;">
      <a-alert
        message="从 JSON 文件同步载具数据到数据库，包含 3,083 个载具及其涂装数量统计。"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />
      <a-space>
        <a-button type="primary" :loading="syncingVehicles" @click="handleSyncVehicles" size="large">
          <template #icon><DatabaseOutlined /></template>
          同步载具数据
        </a-button>
        <a-button :loading="refreshingCounts" @click="handleRefreshCounts">
          <template #icon><ReloadOutlined /></template>
          刷新远程涂装数
        </a-button>
      </a-space>
    </a-card>

    <!-- 载具列表 -->
    <a-card title="载具列表">
      <template #extra>
        <a-space>
          <a-select v-model:value="filters.type" style="width: 100px" @change="fetchVehicles">
            <a-select-option value="">全部类型</a-select-option>
            <a-select-option value="tank">坦克</a-select-option>
            <a-select-option value="aircraft">飞机</a-select-option>
            <a-select-option value="helicopter">直升机</a-select-option>
            <a-select-option value="ship">舰船</a-select-option>
          </a-select>
          <a-select v-model:value="filters.country" style="width: 100px" @change="fetchVehicles">
            <a-select-option value="">全部国家</a-select-option>
            <a-select-option value="usa">美国</a-select-option>
            <a-select-option value="germany">德国</a-select-option>
            <a-select-option value="ussr">苏联</a-select-option>
            <a-select-option value="britain">英国</a-select-option>
            <a-select-option value="japan">日本</a-select-option>
            <a-select-option value="china">中国</a-select-option>
            <a-select-option value="france">法国</a-select-option>
            <a-select-option value="italy">意大利</a-select-option>
            <a-select-option value="sweden">瑞典</a-select-option>
            <a-select-option value="israel">以色列</a-select-option>
          </a-select>
          <a-input-search v-model:value="filters.search" placeholder="搜索载具" style="width: 160px" @search="fetchVehicles" @pressEnter="fetchVehicles" />
        </a-space>
      </template>
      <a-table :columns="columns" :data-source="vehicleList" :loading="loadingList" size="small"
        :pagination="{ pageSize: 20, showTotal: (t: number) => `共 ${t} 个载具` }" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="typeColor[record.type] || 'default'">{{ typeName[record.type] || record.type }}</a-tag>
          </template>
          <template v-if="column.key === 'country'">
            {{ countryName[record.country] || record.country }}
          </template>
          <template v-if="column.key === 'skin_count'">
            <span :style="{ color: record.skin_count !== record.remote_skin_count ? '#f5222d' : record.skin_count > 0 ? '#52c41a' : '#999', fontWeight: record.skin_count !== record.remote_skin_count ? 'bold' : 'normal' }">{{ record.skin_count }}</span>
          </template>
          <template v-if="column.key === 'remote_skin_count'">
            <span :style="{ fontWeight: record.remote_skin_count > 100 ? 'bold' : 'normal' }">{{ record.remote_skin_count }}</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 操作日志 -->
    <a-card title="操作日志" style="margin-top: 16px" v-if="logs.length > 0">
      <a-timeline>
        <a-timeline-item v-for="(log, index) in logs" :key="index" :color="log.success ? 'green' : 'red'">
          <p>{{ log.time }} - {{ log.message }}</p>
        </a-timeline-item>
      </a-timeline>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { DatabaseOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { syncVehiclesFromJSON, getVehiclesFromDB, refreshVehicleCounts } from '../api'

const syncingVehicles = ref(false)
const refreshingCounts = ref(false)
const loadingStats = ref(false)
const loadingList = ref(false)
const vehicleList = ref<any[]>([])
const logs = ref<any[]>([])

const stats = reactive({ total: 0, tank: 0, aircraft: 0, helicopter: 0, ship: 0 })
const filters = reactive({ type: '', country: '', search: '' })

const columns = [
  { title: 'ID', dataIndex: 'wt_live_id', width: 160, ellipsis: true },
  { title: '名称', dataIndex: 'name', width: 200, ellipsis: true },
  { title: '类型', key: 'type', width: 80 },
  { title: '国家', key: 'country', width: 80 },
  { title: '子类型', dataIndex: 'class', width: 120, ellipsis: true },
  { title: '本地涂装数', key: 'skin_count', dataIndex: 'skin_count', width: 100, sorter: (a: any, b: any) => a.skin_count - b.skin_count },
  { title: '远程涂装数', key: 'remote_skin_count', dataIndex: 'remote_skin_count', width: 100, sorter: (a: any, b: any) => a.remote_skin_count - b.remote_skin_count },
]

const typeName: Record<string, string> = { tank: '坦克', aircraft: '飞机', helicopter: '直升机', ship: '舰船' }
const typeColor: Record<string, string> = { tank: 'green', aircraft: 'blue', helicopter: 'orange', ship: 'purple' }
const countryName: Record<string, string> = {
  usa: '美国', germany: '德国', ussr: '苏联', britain: '英国', japan: '日本',
  china: '中国', france: '法国', italy: '意大利', sweden: '瑞典', israel: '以色列',
}

const addLog = (success: boolean, msg: string) => {
  logs.value.unshift({ time: new Date().toLocaleString(), success, message: msg })
  if (logs.value.length > 10) logs.value.pop()
}

const fetchVehicles = async () => {
  loadingList.value = true
  try {
    const params: any = {}
    if (filters.type) params.type = filters.type
    if (filters.country) params.country = filters.country
    if (filters.search) params.search = filters.search
    const res: any = await getVehiclesFromDB(params)
    if (res.status === 'OK') {
      vehicleList.value = res.data || []
    }
  } catch (e) {
    console.error(e)
  }
  loadingList.value = false
}

const fetchStats = async () => {
  loadingStats.value = true
  try {
    const res: any = await getVehiclesFromDB({})
    if (res.status === 'OK') {
      const list = res.data || []
      stats.total = list.length
      stats.tank = list.filter((v: any) => v.type === 'tank').length
      stats.aircraft = list.filter((v: any) => v.type === 'aircraft').length
      stats.helicopter = list.filter((v: any) => v.type === 'helicopter').length
      stats.ship = list.filter((v: any) => v.type === 'ship').length
    }
  } catch (e) {
    console.error(e)
  }
  loadingStats.value = false
}

const handleSyncVehicles = async () => {
  syncingVehicles.value = true
  try {
    const res: any = await syncVehiclesFromJSON()
    if (res.status === 'OK') {
      message.success(res.message || '同步成功')
      addLog(true, `载具数据同步完成，共 ${res.count || 0} 个`)
      fetchVehicles()
      fetchStats()
    } else {
      message.error(res.error || '同步失败')
      addLog(false, res.error || '同步失败')
    }
  } catch (e: any) {
    message.error('同步失败')
    addLog(false, e.message || '同步失败')
  }
  syncingVehicles.value = false
}

const handleRefreshCounts = async () => {
  refreshingCounts.value = true
  try {
    const res: any = await refreshVehicleCounts({})
    if (res.status === 'OK') {
      message.success('涂装数量刷新完成')
      addLog(true, '涂装数量刷新完成')
      fetchVehicles()
    } else {
      message.error(res.error || '刷新失败')
    }
  } catch (e: any) {
    message.error('刷新失败')
  }
  refreshingCounts.value = false
}

onMounted(() => {
  fetchStats()
  fetchVehicles()
})
</script>
