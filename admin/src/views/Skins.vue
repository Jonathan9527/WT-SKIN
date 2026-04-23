<template>
  <div>
    <div class="header-actions">
      <h2>涂装管理</h2>
      <a-space wrap>
        <a-select v-model:value="filters.vehicleType" style="width: 120px" @change="onVehicleTypeChange">
          <a-select-option value="any">全部类型</a-select-option>
          <a-select-option value="tank">坦克</a-select-option>
          <a-select-option value="aircraft">飞机</a-select-option>
          <a-select-option value="helicopter">直升机</a-select-option>
          <a-select-option value="ship">舰船</a-select-option>
        </a-select>
        <a-select v-model:value="filters.vehicleCountry" style="width: 120px" @change="onCountryChange">
          <a-select-option value="any">全部国家</a-select-option>
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
        <a-select v-model:value="filters.vehicleClass" style="width: 120px" @change="onClassChange" :disabled="filters.vehicleType === 'any'">
          <a-select-option value="any">全部子类型</a-select-option>
          <template v-if="filters.vehicleType === 'tank'">
            <a-select-option value="light_tank">轻型坦克</a-select-option>
            <a-select-option value="medium_tank">中型坦克</a-select-option>
            <a-select-option value="heavy_tank">重型坦克</a-select-option>
            <a-select-option value="tank_destroyer">坦克歼击车</a-select-option>
            <a-select-option value="spaa">自行防空炮</a-select-option>
          </template>
          <template v-else-if="filters.vehicleType === 'aircraft'">
            <a-select-option value="fighter">战斗机</a-select-option>
            <a-select-option value="attacker">攻击机</a-select-option>
            <a-select-option value="bomber">轰炸机</a-select-option>
          </template>
          <template v-else-if="filters.vehicleType === 'ship'">
            <a-select-option value="fleet">舰队</a-select-option>
            <a-select-option value="coastal">沿海</a-select-option>
          </template>
        </a-select>
        <a-select 
          v-model:value="filters.vehicle" 
          style="width: 200px"
          show-search
          :filter-option="filterVehicleOption"
          :disabled="filters.vehicleType === 'any'"
          :loading="vehiclesLoading"
          placeholder="选择具体载具"
          allow-clear
          @change="onVehicleChange"
        >
          <a-select-option value="any">全部载具</a-select-option>
          <a-select-option 
            v-for="vehicle in vehiclesList" 
            :key="vehicle.wt_live_id" 
            :value="vehicle.wt_live_id"
            :label="vehicle.name"
          >
            {{ vehicle.name }} ({{ vehicle.skin_count }})
          </a-select-option>
        </a-select>
        <a-input-search v-model:value="filters.search" placeholder="搜索标题/描述" style="width: 200px" @search="fetchData" @pressEnter="fetchData" />
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="skins"
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'image'">
          <a-image :src="record.image_url" :width="80" :height="50" style="object-fit: cover; border-radius: 4px" />
        </template>
        <template v-if="column.key === 'title'">
          <div class="title-cell">
            <div class="meta">ID: {{ record.wt_live_id }} | {{ record.author }}</div>
          </div>
        </template>
        <template v-if="column.key === 'description'">
          <div class="description-cell" v-html="stripHtml(record.description)"></div>
        </template>
        <template v-if="column.key === 'tags'">
          <div class="tags-cell">
            <template v-for="(tag, idx) in parseTags(record.tags).slice(0, 3)" :key="record.id + '-' + idx">
              <a-tag color="blue" size="small">#{{ tag }}</a-tag>
            </template>
            <a-tag v-if="parseTags(record.tags).length > 3" color="default">
              +{{ parseTags(record.tags).length - 3 }}
            </a-tag>
          </div>
        </template>
        <template v-if="column.key === 'vehicle_name'">
          <div style="font-size: 12px;">
            <div v-if="record.vehicle_name" class="vehicle-name" style="font-weight: 500; margin-bottom: 4px;">
              {{ record.vehicle_name }}
            </div>
            <div v-if="record.related_vehicles && record.related_vehicles.length > 0" style="color: #666;">
              <a-space wrap size="small">
                <a-tag v-for="vehicle in record.related_vehicles.slice(0, 3)" :key="vehicle.id" size="small" color="blue" class="vehicle-name">
                  {{ vehicle.name }}
                </a-tag>
                <a-tag v-if="record.related_vehicles.length > 3" size="small" color="default">
                  +{{ record.related_vehicles.length - 3 }}
                </a-tag>
              </a-space>
            </div>
            <span v-if="!record.vehicle_name && (!record.related_vehicles || record.related_vehicles.length === 0)" style="color: #999;">-</span>
          </div>
        </template>
        <template v-if="column.key === 'vehicle_country'">
          <a-space wrap>
            <a-tag v-for="(country, idx) in parseCountries(record.vehicle_countries).slice(0, 3)" :key="idx" size="small">
              {{ getCountryName(country) }}
            </a-tag>
            <a-tag v-if="parseCountries(record.vehicle_countries).length > 3" size="small" color="default">
              +{{ parseCountries(record.vehicle_countries).length - 3 }}
            </a-tag>
            <span v-if="parseCountries(record.vehicle_countries).length === 0" style="color: #999;">-</span>
          </a-space>
        </template>
        <template v-if="column.key === 'stats'">
          <a-space>
            <span>👍 {{ record.likes }}</span>
            <span>👁 {{ record.views }}</span>
            <span>⬇ {{ record.downloads }}</span>
          </a-space>
        </template>
        <template v-if="column.key === 'created_at'">
          <div style="font-size: 12px;">
            <div>{{ formatDate(record.created_at) }}</div>
            <div style="color: #999;">{{ formatTime(record.created_at) }}</div>
          </div>
        </template>
        <template v-if="column.key === 'wt_link'">
          <a 
            :href="`https://live.warthunder.com/post/${record.lang_group}/en/`" 
            target="_blank"
            style="color: #1890ff;"
          >
            查看原文
          </a>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="viewDetail(record)">查看</a-button>
            <a-popconfirm title="确定删除?" @confirm="handleDelete(record.id)">
              <a-button type="link" danger size="small">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="detailVisible" title="涂装详情" width="800px" :footer="null">
      <div v-if="currentSkin">
        <!-- 图片轮播 -->
        <div v-if="currentSkin.skinImages && currentSkin.skinImages.length > 0" style="margin-bottom: 16px;">
          <a-carousel arrows>
            <template #prevArrow>
              <div class="custom-slick-arrow" style="left: 10px; z-index: 1">
                <left-circle-outlined />
              </div>
            </template>
            <template #nextArrow>
              <div class="custom-slick-arrow" style="right: 10px">
                <right-circle-outlined />
              </div>
            </template>
            <div v-for="image in currentSkin.skinImages" :key="image.id">
              <a-image :src="image.url" :width="'100%'" style="max-height: 400px; object-fit: contain" />
            </div>
          </a-carousel>
        </div>
        <!-- 如果没有图片列表，显示主图片 -->
        <a-image v-else :src="currentSkin.image_url" :width="'100%'" style="max-height: 300px; object-fit: contain; margin-bottom: 16px;" />
        
        <a-descriptions bordered :column="2" style="margin-top: 16px">
          <a-descriptions-item label="标题" :span="2">{{ currentSkin.title }}</a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">
            <div v-html="currentSkin.description" class="detail-description" style="max-width: 680px;"></div>
          </a-descriptions-item>
          <a-descriptions-item label="作者">{{ currentSkin.author || '(未知)' }}</a-descriptions-item>
          <a-descriptions-item label="WT Live ID">{{ currentSkin.wt_live_id }}</a-descriptions-item>
          
          <a-descriptions-item label="载具信息" :span="2">
            <a-space direction="vertical" size="small" style="width: 100%;">
              <div>
                <span style="color: #666;">名称：</span>
                <span class="vehicle-name" style="font-weight: 500;">{{ currentSkin.vehicle_name || '(未知载具)' }}</span>
              </div>
              <div>
                <span style="color: #666;">类型：</span>
                <a-tag :color="getTypeColor(currentSkin.vehicle_type)">{{ getTypeName(currentSkin.vehicle_type) }}</a-tag>
                <span style="margin-left: 8px; color: #666;">子类型：</span>
                <a-tag color="default">{{ getClassName(currentSkin.vehicle_class) }}</a-tag>
              </div>
              <div>
                <span style="color: #666;">国家：</span>
                <a-space wrap>
                  <a-tag v-for="(country, idx) in parseCountries(currentSkin.vehicle_countries)" :key="idx" color="blue">
                    {{ getCountryName(country) }}
                  </a-tag>
                  <span v-if="parseCountries(currentSkin.vehicle_countries).length === 0" style="color: #999;">-</span>
                </a-space>
              </div>
            </a-space>
          </a-descriptions-item>
          
          <a-descriptions-item label="关联载具" :span="2" v-if="currentSkin.relatedVehicles && currentSkin.relatedVehicles.length > 0">
            <a-space wrap>
              <a-tag v-for="vehicle in currentSkin.relatedVehicles" :key="vehicle.id" color="blue" class="vehicle-name">
                {{ vehicle.name }}
              </a-tag>
            </a-space>
          </a-descriptions-item>
          
          <a-descriptions-item label="点赞">
            <span style="color: #1890ff;">👍 {{ currentSkin.likes }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="浏览">
            <span style="color: #52c41a;">👁 {{ currentSkin.views }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="下载">
            <span style="color: #fa8c16;">⬇ {{ currentSkin.downloads }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="评论">
            <span style="color: #722ed1;">💬 {{ currentSkin.comments }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="文件信息" :span="2">
            <a-space direction="vertical" size="small" style="width: 100%;">
              <div>
                <span style="color: #666;">大小：</span>
                <span style="font-weight: 500;">{{ formatFileSize(currentSkin.file_size) }}</span>
              </div>
              <div>
                <span style="color: #666;">类型：</span>
                <span>{{ currentSkin.file_type || '-' }}</span>
              </div>
              <div>
                <span style="color: #666;">PBR 支持：</span>
                <a-tag :color="currentSkin.pbr_ready ? 'green' : 'default'">{{ currentSkin.pbr_ready ? '是' : '否' }}</a-tag>
                <span v-if="currentSkin.featured" style="margin-left: 8px;">
                  <a-tag color="gold">⭐ 精选</a-tag>
                </span>
              </div>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间" :span="2">
            {{ formatDate(currentSkin.created_at) }} {{ formatTime(currentSkin.created_at) }}
          </a-descriptions-item>
          <a-descriptions-item label="War Thunder Live" :span="2">
            <a :href="`https://live.warthunder.com/post/${currentSkin.lang_group}/en/`" target="_blank">
              https://live.warthunder.com/post/{{ currentSkin.lang_group }}/en/
            </a>
          </a-descriptions-item>
          <a-descriptions-item label="标签" :span="2">
            <div class="detail-tags">
              <template v-for="(tag, idx) in parseTags(currentSkin.tags)" :key="'detail-' + idx">
                <a-tag color="blue">#{{ tag }}</a-tag>
              </template>
              <span v-if="parseTags(currentSkin.tags).length === 0" style="color: #999">无标签</span>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="下载链接" :span="2">
            <a :href="currentSkin.file_url" target="_blank">{{ currentSkin.file_name }}</a>
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { LeftCircleOutlined, RightCircleOutlined } from '@ant-design/icons-vue'
import { getSkins, getSkin, deleteSkin, getVehiclesFromDB } from '../api'

const loading = ref(false)
const skins = ref<any[]>([])
const detailVisible = ref(false)
const currentSkin = ref<any>(null)
const vehiclesList = ref<any[]>([])
const vehiclesLoading = ref(false)

const filters = reactive({
  vehicleType: 'any',
  vehicleCountry: 'any',
  vehicleClass: 'any',
  vehicle: 'any',
  search: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 从数据库加载载具列表
const loadVehicles = async () => {
  if (filters.vehicleType === 'any') {
    vehiclesList.value = []
    return
  }
  
  vehiclesLoading.value = true
  try {
    const res: any = await getVehiclesFromDB({
      type: filters.vehicleType,
      country: filters.vehicleCountry,
      class: filters.vehicleClass
    })
    if (res.status === 'OK') {
      vehiclesList.value = res.data || []
    }
  } catch (error) {
    console.error('加载载具列表失败:', error)
    vehiclesList.value = []
  } finally {
    vehiclesLoading.value = false
  }
}

// 载具搜索过滤
const filterVehicleOption = (input: string, option: any) => {
  const label = option.label || ''
  return label.toLowerCase().includes(input.toLowerCase())
}

const columns = [
  { title: '图片', key: 'image', width: 100 },
  { title: '标题', key: 'title', width: 150 },
  { title: '描述', key: 'description', width: 200 },
  { title: '标签', key: 'tags', width: 150 },
  { title: '载具', key: 'vehicle_name', width: 120 },
  { title: '国家', key: 'vehicle_country', width: 80 },
  { title: '统计', key: 'stats', width: 150 },
  { title: '创建时间', key: 'created_at', width: 150 },
  { title: 'WT链接', key: 'wt_link', width: 100 },
  { title: '操作', key: 'action', width: 100 }
]

const parseTags = (tagsStr: string): string[] => {
  if (!tagsStr || tagsStr === 'null' || tagsStr === '') return []
  try {
    const parsed = JSON.parse(tagsStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// 解析国家列表
const parseCountries = (countriesStr: string): string[] => {
  if (!countriesStr || countriesStr === 'null' || countriesStr === '') return []
  try {
    const parsed = JSON.parse(countriesStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// 移除 HTML 标签，只保留纯文本
const stripHtml = (html: string): string => {
  if (!html) return '-'
  // 创建临时 div 来解析 HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const text = tmp.textContent || tmp.innerText || ''
  // 截取前100个字符
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = { tank: 'green', aircraft: 'blue', helicopter: 'orange', ship: 'purple' }
  return colors[type] || 'default'
}

const getTypeName = (type: string) => {
  const names: Record<string, string> = { tank: '坦克', aircraft: '飞机', helicopter: '直升机', ship: '舰船', any: '全部' }
  return names[type] || type || '-'
}

const getCountryName = (country: string) => {
  const names: Record<string, string> = {
    usa: '美国', germany: '德国', ussr: '苏联', britain: '英国', japan: '日本',
    china: '中国', france: '法国', italy: '意大利', sweden: '瑞典', israel: '以色列', any: '全部'
  }
  return names[country] || country || '-'
}

const getClassName = (cls: string) => {
  const names: Record<string, string> = {
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
    battleship: '战列舰',
    fleet: '舰队',
    coastal: '沿海'
  }
  return names[cls] || cls || '-'
}

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getSkins({
      page: pagination.current - 1,
      pageSize: pagination.pageSize,
      vehicleType: filters.vehicleType,
      vehicleCountry: filters.vehicleCountry,
      vehicleClass: filters.vehicleClass,
      vehicle: filters.vehicle,
      search: filters.search
    })
    if (res.status === 'OK') {
      skins.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (e) {
    console.error('获取涂装列表失败:', e)
  } finally {
    loading.value = false
  }
}

// 载具类型改变时重置后续筛选
const onVehicleTypeChange = () => {
  filters.vehicleClass = 'any'
  filters.vehicle = 'any'
  pagination.current = 1
  loadVehicles()
  fetchData()
}

// 国家改变时重置载具
const onCountryChange = () => {
  filters.vehicle = 'any'
  pagination.current = 1
  loadVehicles()
  fetchData()
}

// 子类型改变时重置载具
const onClassChange = () => {
  filters.vehicle = 'any'
  pagination.current = 1
  loadVehicles()
  fetchData()
}

// 载具改变时刷新
const onVehicleChange = () => {
  pagination.current = 1
  fetchData()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  fetchData()
}

const viewDetail = (record: any) => {
  currentSkin.value = record
  detailVisible.value = true
  
  // 获取完整的涂装详情（包含关联载具和图片）
  getSkin(record.id).then((res: any) => {
    if (res.status === 'OK') {
      currentSkin.value = res.data
      // 保存关联载具信息
      currentSkin.value.relatedVehicles = res.vehicles || []
      // 保存图片列表
      currentSkin.value.skinImages = res.images || []
    }
  }).catch(err => {
    console.error('获取涂装详情失败:', err)
  })
}

const handleDelete = async (id: number) => {
  try {
    await deleteSkin(id)
    message.success('删除成功')
    fetchData()
  } catch {
    message.error('删除失败')
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 格式化时间
const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.title-cell .title {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}
.title-cell .meta {
  font-size: 12px;
  color: #999;
}
.description-cell {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.tags-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tags-cell .ant-tag {
  margin: 0;
  font-size: 11px;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.custom-slick-arrow {
  width: 40px;
  height: 40px;
  font-size: 40px;
  color: #fff;
  background-color: rgba(31, 45, 61, 0.11);
  opacity: 0.3;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  border-radius: 50%;
}
.custom-slick-arrow:hover {
  opacity: 0.5;
}
.detail-description {
  max-height: 150px;
  overflow-y: auto;
  overflow-x: hidden;
  word-break: break-word;
  max-width: 100%;
}
.detail-description img {
  max-width: 100% !important;
  height: auto !important;
  display: block;
}
</style>
