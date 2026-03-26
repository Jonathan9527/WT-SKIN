<template>
  <div>
    <h2>数据同步</h2>
    <a-card title="从 War Thunder Live 同步涂装数据">
      <a-form :model="syncForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item label="载具类型">
              <a-select v-model:value="syncForm.vehicleType" @change="onVehicleTypeChange">
                <a-select-option value="any">全部</a-select-option>
                <a-select-option value="tank">坦克</a-select-option>
                <a-select-option value="aircraft">飞机</a-select-option>
                <a-select-option value="helicopter">直升机</a-select-option>
                <a-select-option value="ship">舰船</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="国家">
              <a-select v-model:value="syncForm.vehicleCountry" @change="onCountryChange">
                <a-select-option value="any">全部</a-select-option>
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
          </a-col>
          <a-col :span="6">
            <a-form-item label="载具子类型">
              <a-select v-model:value="syncForm.vehicleClass" @change="onClassChange" :disabled="syncForm.vehicleType === 'any'">
                <a-select-option value="any">全部</a-select-option>
                <template v-if="syncForm.vehicleType === 'tank'">
                  <a-select-option value="light_tank">轻型坦克</a-select-option>
                  <a-select-option value="medium_tank">中型坦克</a-select-option>
                  <a-select-option value="heavy_tank">重型坦克</a-select-option>
                  <a-select-option value="tank_destroyer">坦克歼击车</a-select-option>
                  <a-select-option value="spaa">自行防空炮</a-select-option>
                </template>
                <template v-else-if="syncForm.vehicleType === 'aircraft'">
                  <a-select-option value="fighter">战斗机</a-select-option>
                  <a-select-option value="attacker">攻击机</a-select-option>
                  <a-select-option value="bomber">轰炸机</a-select-option>
                </template>
                <template v-else-if="syncForm.vehicleType === 'ship'">
                  <a-select-option value="fleet">舰队</a-select-option>
                  <a-select-option value="coastal">沿海</a-select-option>
                </template>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="具体载具">
              <a-select 
                v-model:value="syncForm.vehicle" 
                :disabled="syncForm.vehicleType === 'any' || loadingVehicles"
                :loading="loadingVehicles"
                show-search
                :filter-option="filterVehicle"
                @change="fetchData"
              >
                <a-select-option value="any">全部载具</a-select-option>
                <a-select-option v-for="v in vehicleList" :key="v.id" :value="v.id">
                  {{ v.name }} ({{ v.count }})
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item label="时间范围(天)">
              <a-select v-model:value="syncForm.period">
                <a-select-option :value="7">最近7天</a-select-option>
                <a-select-option :value="30">最近30天</a-select-option>
                <a-select-option :value="90">最近90天</a-select-option>
                <a-select-option :value="0">全部时间</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="页码">
              <a-input-number v-model:value="syncForm.page" :min="0" :max="100" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item>
          <a-space>
            <a-button type="primary" :loading="syncing" @click="handleSync">
              <SyncOutlined /> 开始同步涂装
            </a-button>
            <a-button :loading="batchSyncing" @click="handleBatchSync">
              <CloudDownloadOutlined /> 批量同步涂装 (前10页)
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="载具数据同步" style="margin-top: 16px">
      <a-alert
        message="载具数据同步说明"
        description="将 JSON 文件中的 3,083 个载具数据（包含涂装数量）同步到数据库中，方便后续查询和统计。"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />
      <a-button 
        type="primary" 
        :loading="syncingVehicles" 
        @click="handleSyncVehicles"
        size="large"
      >
        <DatabaseOutlined /> 同步载具数据到数据库
      </a-button>
    </a-card>

    <a-card title="同步日志" style="margin-top: 16px">
      <a-timeline>
        <a-timeline-item v-for="(log, index) in syncLogs" :key="index" :color="log.success ? 'green' : 'red'">
          <p>{{ log.time }} - {{ log.message }}</p>
          <p v-if="log.count !== undefined" style="color: #666">新增 {{ log.count }} 条记录</p>
        </a-timeline-item>
        <a-timeline-item v-if="syncLogs.length === 0" color="gray">
          暂无同步记录
        </a-timeline-item>
      </a-timeline>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SyncOutlined, CloudDownloadOutlined, DatabaseOutlined } from '@ant-design/icons-vue'
import { syncSkins, getVehicles, syncVehiclesFromJSON } from '../api'

const syncing = ref(false)
const batchSyncing = ref(false)
const syncingVehicles = ref(false)
const syncLogs = ref<any[]>([])
const loadingVehicles = ref(false)
const vehicleList = ref<any[]>([])

const syncForm = reactive({
  vehicleType: 'any',
  vehicleCountry: 'any',
  vehicleClass: 'any',
  vehicle: 'any',
  period: 7,
  page: 0
})

const addLog = (success: boolean, msg: string, count?: number) => {
  syncLogs.value.unshift({
    time: new Date().toLocaleString(),
    success,
    message: msg,
    count
  })
  if (syncLogs.value.length > 20) {
    syncLogs.value.pop()
  }
}

const handleSync = async () => {
  syncing.value = true
  try {
    const res: any = await syncSkins(syncForm)
    if (res.status === 'OK') {
      message.success(`同步成功，新增 ${res.count} 条记录`)
      addLog(true, `同步 ${syncForm.vehicleType}/${syncForm.vehicleCountry} 第 ${syncForm.page} 页`, res.count)
    } else {
      message.error(res.error || '同步失败')
      addLog(false, res.error || '同步失败')
    }
  } catch (e: any) {
    message.error('同步失败')
    addLog(false, e.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

const handleBatchSync = async () => {
  batchSyncing.value = true
  let totalCount = 0
  
  try {
    for (let page = 0; page < 10; page++) {
      const res: any = await syncSkins({
        ...syncForm,
        page
      })
      if (res.status === 'OK') {
        totalCount += res.count || 0
        addLog(true, `批量同步第 ${page + 1}/10 页`, res.count)
      }
      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    message.success(`批量同步完成，共新增 ${totalCount} 条记录`)
  } catch (e: any) {
    message.error('批量同步失败')
    addLog(false, e.message || '批量同步失败')
  } finally {
    batchSyncing.value = false
  }
}

// 载具类型改变时重置子类型和载具
const onVehicleTypeChange = () => {
  syncForm.vehicleClass = 'any'
  syncForm.vehicle = 'any'
  vehicleList.value = []
  if (syncForm.vehicleType !== 'any') {
    loadVehicles()
  }
}

// 国家改变时重新加载载具列表
const onCountryChange = () => {
  syncForm.vehicle = 'any'
  if (syncForm.vehicleType !== 'any') {
    loadVehicles()
  }
}

// 子类型改变时重新加载载具列表
const onClassChange = () => {
  syncForm.vehicle = 'any'
  if (syncForm.vehicleType !== 'any') {
    loadVehicles()
  }
}

// 加载载具列表
const loadVehicles = async () => {
  if (syncForm.vehicleType === 'any') return
  
  loadingVehicles.value = true
  try {
    const params: any = {
      type: syncForm.vehicleType
    }
    if (syncForm.vehicleCountry !== 'any') {
      params.country = syncForm.vehicleCountry
    }
    if (syncForm.vehicleClass !== 'any') {
      params.class = syncForm.vehicleClass
    }
    
    const res: any = await getVehicles(params)
    if (res.status === 'OK') {
      vehicleList.value = res.data || []
    }
  } catch (e) {
    console.error('加载载具列表失败', e)
  } finally {
    loadingVehicles.value = false
  }
}

// 同步载具数据到数据库
const handleSyncVehicles = async () => {
  syncingVehicles.value = true
  try {
    const res: any = await syncVehiclesFromJSON()
    if (res.status === 'OK') {
      message.success(res.message || `同步成功，共 ${res.count} 个载具`)
      addLog(true, `载具数据同步到数据库`, res.count)
    } else {
      message.error(res.error || '同步失败')
      addLog(false, res.error || '载具数据同步失败')
    }
  } catch (e: any) {
    message.error('同步失败')
    addLog(false, e.message || '载具数据同步失败')
  } finally {
    syncingVehicles.value = false
  }
}

// 载具搜索过滤
const filterVehicle = (input: string, option: any) => {
  const text = option.children?.[0]?.children || ''
  return text.toLowerCase().includes(input.toLowerCase())
}

onMounted(() => {
  // 初始化
})
</script>
