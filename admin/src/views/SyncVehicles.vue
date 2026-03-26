<template>
  <div>
    <h2>载具涂装同步</h2>
    
    <!-- 历史会话列表 -->
    <a-card v-if="sessions.length > 0 && !currentSessionId" title="历史同步记录" style="margin-bottom: 16px">
      <a-list :data-source="sessions" size="small">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <span>{{ getVehicleTypeText(item.vehicle_type) }}</span>
                <span v-if="item.vehicle_country"> - {{ getCountryText(item.vehicle_country) }}</span>
                <span v-if="item.vehicle_class"> - {{ getClassText(item.vehicle_class) }}</span>
                <a-tag :color="getStatusColor(item.status)" style="margin-left: 8px">
                  {{ getStatusText(item.status) }}
                </a-tag>
              </template>
              <template #description>
                开始时间: {{ formatTime(item.started_at) }}
                <span v-if="item.status === 'completed'"> | 完成时间: {{ formatTime(item.completed_at) }}</span>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a @click="loadSession(item.session_id)">查看日志</a>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
    
    <a-card title="根据载具列表同步涂装" style="margin-bottom: 24px">
      <a-form layout="inline">
        <a-form-item label="载具类型">
          <a-select 
            v-model:value="filters.type" 
            @change="onTypeChange"
            style="width: 150px"
            :disabled="syncing"
          >
            <a-select-option value="">请选择</a-select-option>
            <a-select-option value="tank">坦克</a-select-option>
            <a-select-option value="aircraft">飞机</a-select-option>
            <a-select-option value="helicopter">直升机</a-select-option>
            <a-select-option value="ship">舰船</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="国家">
          <a-select 
            v-model:value="filters.country" 
            style="width: 150px"
            :disabled="!filters.type || syncing"
          >
            <a-select-option value="">全部</a-select-option>
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
        </a-form-item>
        
        <a-form-item label="载具子类型">
          <a-select 
            v-model:value="filters.class" 
            style="width: 180px"
            :disabled="!filters.type || syncing"
          >
            <a-select-option value="">全部</a-select-option>
            <template v-if="filters.type === 'tank'">
              <a-select-option value="light_tank">轻型坦克</a-select-option>
              <a-select-option value="medium_tank">中型坦克</a-select-option>
              <a-select-option value="heavy_tank">重型坦克</a-select-option>
              <a-select-option value="tank_destroyer">坦克歼击车</a-select-option>
              <a-select-option value="spaa">自行防空炮</a-select-option>
            </template>
            <template v-else-if="filters.type === 'aircraft'">
              <a-select-option value="fighter">战斗机</a-select-option>
              <a-select-option value="jet_fighter">喷气战斗机</a-select-option>
              <a-select-option value="attacker">攻击机</a-select-option>
              <a-select-option value="bomber">轰炸机</a-select-option>
            </template>
            <template v-else-if="filters.type === 'helicopter'">
              <a-select-option value="attack_helicopter">攻击直升机</a-select-option>
              <a-select-option value="utility_helicopter">通用直升机</a-select-option>
            </template>
            <template v-else-if="filters.type === 'ship'">
              <a-select-option value="destroyer">驱逐舰</a-select-option>
              <a-select-option value="light_cruiser">轻巡洋舰</a-select-option>
              <a-select-option value="heavy_cruiser">重巡洋舰</a-select-option>
              <a-select-option value="battleship">战列舰</a-select-option>
            </template>
          </a-select>
        </a-form-item>
        
        <a-form-item>
          <a-button 
            type="primary" 
            @click="startSync" 
            :loading="syncing"
            :disabled="!filters.type || syncing"
          >
            <SyncOutlined /> 开始同步
          </a-button>
        </a-form-item>
        
        <a-form-item>
          <a-button 
            type="primary" 
            danger
            @click="showSyncAllConfirm" 
            :loading="syncing"
            :disabled="syncing"
          >
            <SyncOutlined /> 全部同步
          </a-button>
        </a-form-item>
      </a-form>
      
      <!-- 进度显示 -->
      <div v-if="progress.total > 0" style="margin-top: 16px">
        <a-progress 
          :percent="Math.round((progress.current / progress.total) * 100)" 
          :status="syncing ? 'active' : 'success'"
        />
        <div style="margin-top: 8px; color: #666;">
          进度: {{ progress.current }} / {{ progress.total }} 
          | 新增: {{ progress.newCount }} 
          | 已存在: {{ progress.existCount }}
        </div>
      </div>
    </a-card>

    <!-- 同步日志 -->
    <a-card title="同步日志">
      <template #extra>
        <a-space>
          <a-button 
            size="small" 
            @click="refreshLogs" 
            :loading="refreshing"
            :disabled="!currentSessionId"
          >
            <ReloadOutlined /> 刷新
          </a-button>
          <a-button size="small" @click="clearLogs">清空</a-button>
        </a-space>
      </template>
      
      <div 
        ref="logContainer" 
        style="
          height: 500px; 
          overflow-y: auto; 
          background: #000; 
          color: #0f0; 
          padding: 16px; 
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.6;
        "
      >
        <div v-for="(log, index) in logs" :key="index" :style="getLogStyle(log)">
          <span style="color: #666;">[{{ formatLogTime(log.created_at) }}]</span>
          <span :style="{ color: getLogColor(log.type) }">{{ log.message }}</span>
          <div v-if="log.url" style="color: #888; margin-left: 20px; word-break: break-all;">
            URL: {{ log.url }}
          </div>
        </div>
        <div v-if="logs.length === 0" style="color: #666; text-align: center; padding: 50px;">
          {{ currentSessionId ? '暂无日志' : '请选择同步参数并开始同步' }}
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { SyncOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { createVNode } from 'vue'
import { startSync as apiStartSync, getSyncStatus, getSyncSessions } from '../api'

const syncing = ref(false)
const refreshing = ref(false)
const logs = ref<any[]>([])
const sessions = ref<any[]>([])
const logContainer = ref<HTMLElement>()
const currentSessionId = ref('')
let pollingTimer: any = null

const filters = reactive({
  type: '',
  country: '',
  class: ''
})

const progress = reactive({
  total: 0,
  current: 0,
  newCount: 0,
  existCount: 0
})

// 类型改变
const onTypeChange = () => {
  filters.country = ''
  filters.class = ''
}

// 显示全部同步确认对话框
const showSyncAllConfirm = () => {
  Modal.confirm({
    title: '确认全部同步',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color: #ff4d4f;' }, [
      createVNode('p', null, '此操作将遍历数据库中所有载具，同步每个载具的涂装数据。'),
      createVNode('p', { style: 'margin-top: 8px;' }, '载具总数较多时，同步过程可能需要很长时间。'),
      createVNode('p', { style: 'margin-top: 12px; font-weight: bold;' }, '确定要继续吗？'),
    ]),
    okText: '确认同步',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      startSyncAll()
    },
  })
}

// 全部同步
const startSyncAll = async () => {
  try {
    syncing.value = true
    
    // 同步所有类型
    const res = await apiStartSync({
      vehicleType: 'all',
      vehicleCountry: '',
      vehicleClass: ''
    })

    currentSessionId.value = res.session_id
    logs.value = []
    progress.total = 0
    progress.current = 0
    progress.newCount = 0
    progress.existCount = 0

    message.success('全部同步任务已启动')

    // 开始轮询
    startPolling()
  } catch (error: any) {
    message.error(error.message || '启动全部同步失败')
    syncing.value = false
  }
}

// 开始同步
const startSync = async () => {
  if (!filters.type) {
    message.warning('请先选择载具类型')
    return
  }

  try {
    syncing.value = true
    const res = await apiStartSync({
      vehicleType: filters.type,
      vehicleCountry: filters.country || '',
      vehicleClass: filters.class || ''
    })

    currentSessionId.value = res.session_id
    logs.value = []
    progress.total = 0
    progress.current = 0
    progress.newCount = 0
    progress.existCount = 0

    message.success('同步任务已启动')

    // 开始轮询
    startPolling()
  } catch (error: any) {
    message.error(error.message || '启动同步失败')
    syncing.value = false
  }
}

// 开始轮询
const startPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
  }

  // 立即刷新一次
  refreshLogs()

  // 每秒刷新一次
  pollingTimer = setInterval(() => {
    refreshLogs()
  }, 1000)
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 刷新日志
const refreshLogs = async () => {
  if (!currentSessionId.value) return

  try {
    refreshing.value = true
    const res = await getSyncStatus(currentSessionId.value)

    // 更新进度
    progress.total = res.session.total || 0
    progress.current = res.session.current || 0
    progress.newCount = res.session.new_count || 0
    progress.existCount = res.session.exist_count || 0

    // 更新日志
    logs.value = res.logs || []

    // 自动滚动到底部
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })

    // 检查是否完成
    if (res.session.status === 'completed' || res.session.status === 'error') {
      syncing.value = false
      stopPolling()
      
      if (res.session.status === 'completed') {
        message.success('同步完成!')
      } else {
        message.error('同步出错')
      }
    }
  } catch (error: any) {
    console.error('刷新日志失败:', error)
  } finally {
    refreshing.value = false
  }
}

// 加载历史会话
const loadSession = async (sessionId: string) => {
  currentSessionId.value = sessionId
  logs.value = []
  await refreshLogs()
}

// 加载会话列表
const loadSessions = async () => {
  try {
    const res = await getSyncSessions()
    sessions.value = res.sessions || []
  } catch (error) {
    console.error('加载会话列表失败:', error)
  }
}

// 清空日志
const clearLogs = () => {
  logs.value = []
  progress.total = 0
  progress.current = 0
  progress.newCount = 0
  progress.existCount = 0
  currentSessionId.value = ''
  stopPolling()
  message.success('日志已清空')
}

// 格式化时间
const formatTime = (timestamp: string) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', { hour12: false })
}

// 格式化日志时间
const formatLogTime = (timestamp: string) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

// 获取日志颜色
const getLogColor = (type: string) => {
  switch (type) {
    case 'error':
      return '#f00'
    case 'progress':
      return '#0ff'
    case 'complete':
      return '#0f0'
    case 'info':
      return '#0f0'
    default:
      return '#0f0'
  }
}

// 获取日志样式
const getLogStyle = (log: any) => {
  return {
    marginBottom: '4px',
    opacity: log.type === 'progress' ? 0.8 : 1
  }
}

// 获取状态颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'running':
      return 'blue'
    case 'completed':
      return 'green'
    case 'error':
      return 'red'
    default:
      return 'default'
  }
}

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'running':
      return '进行中'
    case 'completed':
      return '已完成'
    case 'error':
      return '出错'
    default:
      return status
  }
}

// 获取载具类型文本
const getVehicleTypeText = (type: string) => {
  const map: any = {
    tank: '坦克',
    aircraft: '飞机',
    helicopter: '直升机',
    ship: '舰船'
  }
  return map[type] || type
}

// 获取国家文本
const getCountryText = (country: string) => {
  const map: any = {
    usa: '美国',
    germany: '德国',
    ussr: '苏联',
    britain: '英国',
    japan: '日本',
    china: '中国',
    france: '法国',
    italy: '意大利',
    sweden: '瑞典',
    israel: '以色列'
  }
  return map[country] || country
}

// 获取子类型文本
const getClassText = (cls: string) => {
  const map: any = {
    light_tank: '轻型坦克',
    medium_tank: '中型坦克',
    heavy_tank: '重型坦克',
    tank_destroyer: '坦克歼击车',
    spaa: '自行防空炮',
    fighter: '战斗机',
    jet_fighter: '喷气战斗机',
    attacker: '攻击机',
    bomber: '轰炸机',
    attack_helicopter: '攻击直升机',
    utility_helicopter: '通用直升机',
    destroyer: '驱逐舰',
    light_cruiser: '轻巡洋舰',
    heavy_cruiser: '重巡洋舰',
    battleship: '战列舰'
  }
  return map[cls] || cls
}

// 组件挂载
onMounted(() => {
  loadSessions()
})

// 组件卸载
onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #0f0;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #0c0;
}
</style>
