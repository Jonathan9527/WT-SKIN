<template>
  <div>
    <h2>涂装数据统计</h2>
    
    <!-- 本地数据统计 -->
    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col :span="24">
        <a-card title="本地数据" size="small">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic
                title="总载具数"
                :value="stats.totalVehicles"
                :value-style="{ color: '#3f8600' }"
              >
                <template #prefix>
                  <CarOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="总涂装数"
                :value="stats.totalSkins"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix>
                  <SkinOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="平均涂装数"
                :value="stats.avgSkins"
                :precision="1"
                :value-style="{ color: '#cf1322' }"
              >
                <template #prefix>
                  <BarChartOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="最高涂装数"
                :value="stats.maxSkins"
                :value-style="{ color: '#faad14' }"
              >
                <template #prefix>
                  <TrophyOutlined />
                </template>
              </a-statistic>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>

    <!-- War Thunder Live 远程数据 -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="24">
        <a-card size="small">
          <template #title>
            <span>War Thunder Live 数据</span>
            <a-button 
              type="link" 
              size="small" 
              @click="loadRemoteStats" 
              :loading="remoteLoading"
              style="margin-left: 8px"
            >
              <SyncOutlined /> 刷新
            </a-button>
          </template>
          <a-row :gutter="16" v-if="remoteStats">
            <a-col :span="8">
              <a-statistic
                title="远程载具数"
                :value="remoteStats.totalVehicles"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix>
                  <CarOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="8">
              <a-statistic
                title="远程涂装总数"
                :value="remoteStats.totalSkins"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix>
                  <SkinOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="8">
              <a-statistic
                title="数据更新时间"
                :value="remoteStats.updateTime"
                :value-style="{ color: '#666', fontSize: '14px' }"
              />
            </a-col>
          </a-row>
          <a-empty v-else description="点击刷新按钮获取 War Thunder Live 数据" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 四级分类筛选 -->
    <a-card title="涂装数据查询" style="margin-bottom: 24px">
      <a-form layout="inline">
        <a-form-item label="载具类型">
          <a-select 
            v-model:value="filters.type" 
            @change="onTypeChange"
            style="width: 150px"
          >
            <a-select-option value="">全部</a-select-option>
            <a-select-option value="tank">坦克</a-select-option>
            <a-select-option value="aircraft">飞机</a-select-option>
            <a-select-option value="helicopter">直升机</a-select-option>
            <a-select-option value="ship">舰船</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="国家">
          <a-select 
            v-model:value="filters.country" 
            @change="onCountryChange"
            style="width: 150px"
            :disabled="!filters.type"
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
            @change="onClassChange"
            style="width: 180px"
            :disabled="!filters.type"
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
          <a-button type="primary" @click="loadData" :loading="loading">
            <SearchOutlined /> 查询
          </a-button>
        </a-form-item>
        
        <a-form-item>
          <a-button @click="resetFilters">
            <ReloadOutlined /> 重置
          </a-button>
        </a-form-item>
        
        <a-form-item>
          <a-button type="default" @click="refreshCounts" :loading="refreshing" :disabled="!filters.type">
            <SyncOutlined /> 刷新数据
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 刷新结果弹窗 -->
    <a-modal
      v-model:open="refreshModalVisible"
      title="数据刷新结果"
      width="800px"
      :footer="null"
    >
      <div v-if="refreshResult">
        <a-descriptions bordered :column="2" style="margin-bottom: 16px">
          <a-descriptions-item label="检查载具数">
            {{ refreshResult.totalChecked }}
          </a-descriptions-item>
          <a-descriptions-item label="变化载具数">
            <a-tag :color="refreshResult.totalChanged > 0 ? 'orange' : 'green'">
              {{ refreshResult.totalChanged }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="涂装增加">
            <a-tag color="green">{{ refreshResult.totalIncreased }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="涂装减少">
            <a-tag color="red">{{ refreshResult.totalDecreased }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <div v-if="refreshResult.changes && refreshResult.changes.length > 0">
          <h4>变化详情：</h4>
          <a-table
            :columns="changeColumns"
            :data-source="refreshResult.changes"
            :pagination="{ pageSize: 10 }"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'difference'">
                <a-tag :color="record.difference > 0 ? 'green' : 'red'">
                  {{ record.difference > 0 ? '+' : '' }}{{ record.difference }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'type'">
                <a-tag color="blue">{{ getTypeLabel(record.type) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'country'">
                <a-tag color="green">{{ getCountryLabel(record.country) }}</a-tag>
              </template>
            </template>
          </a-table>
        </div>
        <div v-else>
          <a-empty description="没有检测到数据变化" />
        </div>
      </div>
    </a-modal>

    <!-- 数据表格 -->
    <a-card title="载具涂装统计">
      <a-table 
        :columns="columns" 
        :data-source="vehicles" 
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        :scroll="{ x: 1000 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span :style="{ fontWeight: record.count > 300 ? 'bold' : 'normal' }">
              {{ record.name }}
            </span>
          </template>
          <template v-else-if="column.key === 'count'">
            <a-tag :color="getCountColor(record.count)">
              {{ record.count }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag color="blue">{{ getTypeLabel(record.type) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'country'">
            <a-tag color="green">{{ getCountryLabel(record.country) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'class'">
            <a-tag color="orange">{{ getClassLabel(record.class) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { 
  SearchOutlined, 
  ReloadOutlined, 
  CarOutlined, 
  SkinOutlined, 
  BarChartOutlined,
  TrophyOutlined,
  SyncOutlined
} from '@ant-design/icons-vue'
import { getVehicles, refreshVehicleCounts, getRemoteStats } from '../api'

const loading = ref(false)
const refreshing = ref(false)
const remoteLoading = ref(false)
const refreshModalVisible = ref(false)
const refreshResult = ref<any>(null)
const remoteStats = ref<any>(null)
const vehicles = ref<any[]>([])
const allVehicles = ref<any[]>([])
const totalVehiclesData = ref<any[]>([]) // 存储所有载具数据，用于本地数据统计

const filters = reactive({
  type: '',
  country: '',
  class: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条记录`
})

const columns = [
  {
    title: '序号',
    key: 'index',
    width: 80,
    customRender: ({ index }: any) => {
      return (pagination.current - 1) * pagination.pageSize + index + 1
    }
  },
  {
    title: '载具名称',
    dataIndex: 'name',
    key: 'name',
    width: 250,
    ellipsis: true
  },
  {
    title: '载具ID',
    dataIndex: 'id',
    key: 'id',
    width: 200,
    ellipsis: true
  },
  {
    title: '涂装数量',
    dataIndex: 'count',
    key: 'count',
    width: 120,
    sorter: (a: any, b: any) => a.count - b.count,
    defaultSortOrder: 'descend'
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 120
  },
  {
    title: '国家',
    dataIndex: 'country',
    key: 'country',
    width: 120
  },
  {
    title: '子类型',
    dataIndex: 'class',
    key: 'class',
    width: 150
  }
]

// 变化表格列定义
const changeColumns = [
  {
    title: '载具名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    ellipsis: true
  },
  {
    title: '载具ID',
    dataIndex: 'id',
    key: 'id',
    width: 150,
    ellipsis: true
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100
  },
  {
    title: '国家',
    dataIndex: 'country',
    key: 'country',
    width: 100
  },
  {
    title: '原数量',
    dataIndex: 'oldCount',
    key: 'oldCount',
    width: 100
  },
  {
    title: '新数量',
    dataIndex: 'newCount',
    key: 'newCount',
    width: 100
  },
  {
    title: '变化',
    dataIndex: 'difference',
    key: 'difference',
    width: 100,
    sorter: (a: any, b: any) => Math.abs(b.difference) - Math.abs(a.difference)
  }
]

// 统计数据（使用全部载具数据）
const stats = computed(() => {
  const total = totalVehiclesData.value.length
  const totalSkins = totalVehiclesData.value.reduce((sum, v) => sum + v.count, 0)
  const avgSkins = total > 0 ? totalSkins / total : 0
  const maxSkins = total > 0 ? Math.max(...totalVehiclesData.value.map(v => v.count)) : 0
  
  return {
    totalVehicles: total,
    totalSkins,
    avgSkins,
    maxSkins
  }
})

// 加载数据
const loadData = async () => {
  if (!filters.type) {
    message.warning('请先选择载具类型')
    return
  }
  
  loading.value = true
  try {
    const params: any = {
      type: filters.type
    }
    if (filters.country) {
      params.country = filters.country
    }
    if (filters.class) {
      params.class = filters.class
    }
    
    const res: any = await getVehicles(params)
    if (res.status === 'OK') {
      allVehicles.value = res.data || []
      
      // 不需要添加类型、国家、子类型信息，因为后端已经返回了
      // 后端从 vehicles_complete.json 读取数据时，已经包含了这些信息
      
      // 按涂装数量降序排序
      allVehicles.value.sort((a, b) => b.count - a.count)
      
      pagination.total = allVehicles.value.length
      updateDisplayData()
      
      message.success(`加载成功，共 ${allVehicles.value.length} 个载具`)
    }
  } catch (e: any) {
    message.error('加载失败: ' + (e.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 更新显示数据
const updateDisplayData = () => {
  const start = (pagination.current - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  vehicles.value = allVehicles.value.slice(start, end)
}

// 刷新数据
const refreshCounts = async () => {
  if (!filters.type) {
    message.warning('请先选择载具类型')
    return
  }
  
  refreshing.value = true
  try {
    const params: any = {
      type: filters.type
    }
    if (filters.country) {
      params.country = filters.country
    }
    if (filters.class) {
      params.class = filters.class
    }
    
    const res: any = await refreshVehicleCounts(params)
    if (res.status === 'OK') {
      refreshResult.value = res.data
      refreshModalVisible.value = true
      
      if (res.data.totalChanged > 0) {
        message.success(`检测到 ${res.data.totalChanged} 个载具的涂装数量发生变化`)
      } else {
        message.info('所有载具的涂装数量都没有变化')
      }
    }
  } catch (e: any) {
    message.error('刷新失败: ' + (e.message || '未知错误'))
  } finally {
    refreshing.value = false
  }
}

// 表格变化处理
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  updateDisplayData()
}

// 加载远程统计数据
const loadRemoteStats = async () => {
  remoteLoading.value = true
  try {
    const res: any = await getRemoteStats()
    if (res.status === 'OK') {
      remoteStats.value = res.data
      message.success('War Thunder Live 数据加载成功')
    }
  } catch (e: any) {
    message.error('加载远程数据失败: ' + (e.message || '未知错误'))
  } finally {
    remoteLoading.value = false
  }
}

// 类型改变
const onTypeChange = () => {
  filters.country = ''
  filters.class = ''
  allVehicles.value = []
  vehicles.value = []
}

// 国家改变
const onCountryChange = () => {
  filters.class = ''
}

// 子类型改变
const onClassChange = () => {
  // 可以在这里添加额外逻辑
}

// 重置筛选
const resetFilters = () => {
  filters.type = ''
  filters.country = ''
  filters.class = ''
  allVehicles.value = []
  vehicles.value = []
  pagination.current = 1
}

// 获取涂装数量颜色
const getCountColor = (count: number) => {
  if (count >= 500) return 'red'
  if (count >= 300) return 'orange'
  if (count >= 100) return 'blue'
  return 'default'
}

// 获取类型标签
const getTypeLabel = (type: string) => {
  const labels: any = {
    tank: '坦克',
    aircraft: '飞机',
    helicopter: '直升机',
    ship: '舰船'
  }
  return labels[type] || type
}

// 获取国家标签
const getCountryLabel = (country: string) => {
  const labels: any = {
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
  return labels[country] || country
}

// 获取子类型标签
const getClassLabel = (cls: string) => {
  const labels: any = {
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
  return labels[cls] || cls
}

// 加载所有载具数据（用于本地数据统计）
const loadTotalVehiclesData = async () => {
  try {
    // 获取所有类型的载具数据
    const types = ['tank', 'aircraft', 'helicopter', 'ship']
    let allData: any[] = []
    
    for (const type of types) {
      const res: any = await getVehicles({ type })
      if (res.status === 'OK' && res.data) {
        allData = allData.concat(res.data)
      }
    }
    
    totalVehiclesData.value = allData
  } catch (e: any) {
    console.error('加载全部载具数据失败:', e)
  }
}

onMounted(() => {
  // 页面加载时自动加载全部载具数据，用于本地数据统计
  loadTotalVehiclesData()
})
</script>

<style scoped>
.ant-statistic {
  text-align: center;
}
</style>
