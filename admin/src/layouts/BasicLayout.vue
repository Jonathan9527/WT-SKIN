<template>
  <a-layout class="layout">
    <a-layout-sider v-model:collapsed="collapsed" collapsible theme="dark">
      <div class="logo">
        <span v-if="!collapsed">WT 涂装管理</span>
        <span v-else>WT</span>
      </div>
      <a-menu theme="dark" mode="inline" v-model:selectedKeys="selectedKeys">
        <a-menu-item key="dashboard" @click="$router.push('/dashboard')">
          <DashboardOutlined />
          <span>仪表盘</span>
        </a-menu-item>
        <a-menu-item key="skins" @click="$router.push('/skins')">
          <SkinOutlined />
          <span>涂装管理</span>
        </a-menu-item>
        <a-menu-item key="skin-stats" @click="$router.push('/skin-stats')">
          <BarChartOutlined />
          <span>涂装数据</span>
        </a-menu-item>
        <a-menu-item key="sync" @click="$router.push('/sync')">
          <SyncOutlined />
          <span>数据同步</span>
        </a-menu-item>
        <a-menu-item key="sync-vehicles" @click="$router.push('/sync-vehicles')">
          <CloudSyncOutlined />
          <span>载具同步</span>
        </a-menu-item>
        <a-menu-item key="users" @click="$router.push('/users')">
          <UserOutlined />
          <span>用户管理</span>
        </a-menu-item>
        <a-menu-item key="settings" @click="$router.push('/settings')">
          <SettingOutlined />
          <span>系统设置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    
    <a-layout>
      <a-layout-header class="header">
        <div class="header-right">
          <a-dropdown>
            <a-space>
              <UserOutlined />
              <span>{{ username }}</span>
            </a-space>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="logout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>
      
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  DashboardOutlined,
  SkinOutlined,
  BarChartOutlined,
  SyncOutlined,
  CloudSyncOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)

const selectedKeys = computed(() => {
  const path = route.path.split('/')[1] || 'dashboard'
  return [path]
})

const username = computed(() => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user).nickname || 'Admin' : 'Admin'
})

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
}
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.1);
}
.header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.header-right {
  cursor: pointer;
}
.content {
  margin: 24px;
  padding: 24px;
  background: #fff;
  min-height: 280px;
  border-radius: 8px;
}
</style>
