<template>
  <div>
    <h2>标签管理</h2>
    
    <a-row :gutter="16">
      <a-col :span="16">
        <a-card title="所有标签">
          <div class="tags-cloud">
            <a-tag
              v-for="tag in tags"
              :key="tag.id"
              :color="getTagColor(tag.count)"
              :style="{ fontSize: getTagSize(tag.count) + 'px', cursor: 'pointer' }"
              @click="viewTagSkins(tag)"
            >
              #{{ tag.name }} ({{ tag.count }})
            </a-tag>
          </div>
        </a-card>
      </a-col>
      
      <a-col :span="8">
        <a-card title="标签统计">
          <a-statistic title="标签总数" :value="tags.length" style="margin-bottom: 16px" />
          <a-divider />
          <h4>热门标签 Top 10</h4>
          <a-list :data-source="topTags" size="small">
            <template #renderItem="{ item, index }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    <a-tag color="blue">#{{ item.name }}</a-tag>
                  </template>
                  <template #avatar>
                    <a-avatar :style="{ backgroundColor: getRankColor(index) }">{{ index + 1 }}</a-avatar>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <span>{{ item.count }} 次</span>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <a-modal v-model:open="skinModalVisible" :title="'标签: #' + selectedTag?.name" width="900px" :footer="null">
      <a-table :columns="skinColumns" :data-source="tagSkins" :loading="loadingSkins" row-key="id" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'image'">
            <a-image :src="record.image_url" :width="60" :height="40" style="object-fit: cover" />
          </template>
          <template v-if="column.key === 'title'">
            <div>{{ record.title }}</div>
            <div style="font-size: 12px; color: #999">{{ record.author }}</div>
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const tags = ref<any[]>([])
const loading = ref(false)
const skinModalVisible = ref(false)
const selectedTag = ref<any>(null)
const tagSkins = ref<any[]>([])
const loadingSkins = ref(false)

const topTags = computed(() => {
  return [...tags.value].sort((a, b) => b.count - a.count).slice(0, 10)
})

const skinColumns = [
  { title: '图片', key: 'image', width: 80 },
  { title: '标题', key: 'title' },
  { title: '作者', dataIndex: 'author', width: 120 },
  { title: '下载', dataIndex: 'downloads', width: 80 },
  { title: '点赞', dataIndex: 'likes', width: 80 }
]

const getTagColor = (count: number) => {
  if (count >= 10) return 'red'
  if (count >= 5) return 'orange'
  if (count >= 3) return 'blue'
  return 'default'
}

const getTagSize = (count: number) => {
  const base = 12
  const max = 20
  return Math.min(base + count * 0.5, max)
}

const getRankColor = (index: number) => {
  const colors = ['#f5222d', '#fa8c16', '#fadb14', '#52c41a', '#1890ff']
  return colors[index] || '#999'
}

const fetchTags = async () => {
  loading.value = true
  try {
    const res: any = await api.get('/tags?limit=200')
    if (res.status === 'OK') {
      tags.value = res.data || []
    }
  } finally {
    loading.value = false
  }
}

const viewTagSkins = async (tag: any) => {
  selectedTag.value = tag
  skinModalVisible.value = true
  loadingSkins.value = true
  
  try {
    const res: any = await api.get(`/tags/${tag.name}`)
    if (res.status === 'OK') {
      tagSkins.value = res.data.skins || []
    }
  } finally {
    loadingSkins.value = false
  }
}

onMounted(fetchTags)
</script>

<style scoped>
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tags-cloud .ant-tag {
  margin: 0;
  padding: 4px 8px;
}
</style>
