<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h2>数据包管理</h2>
      <a-space>
        <a-button @click="fetchPacks" :loading="loadingList">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" @click="handleGenerate" :loading="generating">
          <template #icon><PlusOutlined /></template>
          生成新数据包
        </a-button>
      </a-space>
    </div>

    <!-- 已发布版本 -->
    <a-card title="当前已发布版本" style="margin-bottom: 16px;" size="small">
      <template v-if="publishedPack">
        <a-descriptions :column="3" size="small">
          <a-descriptions-item label="版本">
            <a-tag color="green">{{ publishedPack.version }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="涂装">{{ publishedPack.skin_count?.toLocaleString() }}</a-descriptions-item>
          <a-descriptions-item label="载具">{{ publishedPack.vehicle_count?.toLocaleString() }}</a-descriptions-item>
          <a-descriptions-item label="大小">{{ formatSize(publishedPack.size) }}</a-descriptions-item>
          <a-descriptions-item label="生成时间">{{ formatTime(publishedPack.created_at) }}</a-descriptions-item>
          <a-descriptions-item label="下载">
            <a :href="downloadUrl" target="_blank"><DownloadOutlined /> 下载</a>
          </a-descriptions-item>
        </a-descriptions>
      </template>
      <a-empty v-else description="暂无已发布的数据包，请生成后发布" :image-style="{ height: '40px' }" />
    </a-card>

    <!-- 数据包列表 -->
    <a-card title="所有数据包">
      <a-table :columns="columns" :data-source="packs" :loading="loadingList" :pagination="false"
        size="small" row-key="version">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'version'">
            <span style="font-family: monospace;">{{ record.version }}</span>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag v-if="record.published" color="green">已发布</a-tag>
            <a-tag v-else color="default">未发布</a-tag>
          </template>
          <template v-if="column.key === 'skin_count'">
            {{ record.skin_count?.toLocaleString() }}
          </template>
          <template v-if="column.key === 'vehicle_count'">
            {{ record.vehicle_count?.toLocaleString() }}
          </template>
          <template v-if="column.key === 'size'">
            {{ formatSize(record.size) }}
          </template>
          <template v-if="column.key === 'created_at'">
            {{ formatTime(record.created_at) }}
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button v-if="!record.published" type="primary" size="small" @click="handlePublish(record.version)"
                :loading="publishingVersion === record.version">
                <template #icon><SendOutlined /></template>
                发布
              </a-button>
              <a-tag v-else color="green">当前版本</a-tag>
              <a-popconfirm v-if="!record.published" title="确定删除此数据包？" @confirm="handleDelete(record.version)">
                <a-button danger size="small">
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ReloadOutlined, PlusOutlined, DownloadOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { generateDataPack, getDataPacks, publishDataPack, deleteDataPack } from '../api'

const downloadUrl = '/client/datapack/download'
const loadingList = ref(false)
const generating = ref(false)
const publishingVersion = ref('')
const packs = ref<any[]>([])

const publishedPack = computed(() => packs.value.find((p: any) => p.published))

const columns = [
  { title: '版本', key: 'version', width: 160 },
  { title: '状态', key: 'status', width: 90 },
  { title: '涂装', key: 'skin_count', width: 100 },
  { title: '载具', key: 'vehicle_count', width: 100 },
  { title: '大小', key: 'size', width: 100 },
  { title: '生成时间', key: 'created_at', width: 180 },
  { title: '操作', key: 'actions', width: 160 },
]

const formatSize = (bytes: number) => {
  if (!bytes) return '-'
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

const formatTime = (t: string) => {
  if (!t) return '-'
  return new Date(t).toLocaleString()
}

const fetchPacks = async () => {
  loadingList.value = true
  try {
    const res: any = await getDataPacks()
    if (res.status === 'OK') {
      packs.value = res.data || []
    }
  } catch (e) {
    console.error(e)
  }
  loadingList.value = false
}

const handleGenerate = async () => {
  generating.value = true
  try {
    const res: any = await generateDataPack()
    if (res.status === 'OK') {
      message.success(`数据包生成成功！涂装: ${res.data.skin_count?.toLocaleString()}, 载具: ${res.data.vehicle_count?.toLocaleString()}`)
      fetchPacks()
    } else {
      message.error(res.error || '生成失败')
    }
  } catch (e: any) {
    message.error(e.message || '生成失败')
  }
  generating.value = false
}

const handlePublish = async (version: string) => {
  publishingVersion.value = version
  try {
    const res: any = await publishDataPack(version)
    if (res.status === 'OK') {
      message.success(`版本 ${version} 已发布，客户端可以检测到更新`)
      fetchPacks()
    } else {
      message.error(res.error || '发布失败')
    }
  } catch (e: any) {
    message.error(e.message || '发布失败')
  }
  publishingVersion.value = ''
}

const handleDelete = async (version: string) => {
  try {
    const res: any = await deleteDataPack(version)
    if (res.status === 'OK') {
      message.success('已删除')
      fetchPacks()
    } else {
      message.error(res.error || '删除失败')
    }
  } catch (e: any) {
    message.error(e.message || '删除失败')
  }
}

onMounted(() => fetchPacks())
</script>
