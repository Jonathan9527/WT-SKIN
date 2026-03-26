<template>
  <div>
    <h2>用户管理</h2>
    <a-table :columns="columns" :data-source="users" :loading="loading" row-key="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'avatar'">
          <a-avatar :src="record.avatar" :size="40">
            <template #icon><UserOutlined /></template>
          </a-avatar>
        </template>
        <template v-if="column.key === 'created_at'">
          {{ formatDate(record.created_at) }}
        </template>
        <template v-if="column.key === 'action'">
          <a-popconfirm title="确定删除该用户?" @confirm="handleDelete(record.id)">
            <a-button type="link" danger size="small">删除</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { UserOutlined } from '@ant-design/icons-vue'
import { getUsers, deleteUser } from '../api'

const loading = ref(false)
const users = ref<any[]>([])

const columns = [
  { title: '头像', key: 'avatar', width: 80 },
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '用户名', dataIndex: 'username', width: 150 },
  { title: '昵称', dataIndex: 'nickname', width: 150 },
  { title: '注册时间', key: 'created_at', width: 180 },
  { title: '操作', key: 'action', width: 100 }
]

const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getUsers()
    if (res.status === 'OK') {
      users.value = res.data || []
    }
  } catch {
    // 接口可能不存在
    users.value = []
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await deleteUser(id)
    message.success('删除成功')
    fetchData()
  } catch {
    message.error('删除失败')
  }
}

onMounted(fetchData)
</script>
