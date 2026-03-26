import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/',
      component: () => import('../layouts/BasicLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue'),
          meta: { title: '仪表盘', icon: 'dashboard' }
        },
        {
          path: 'skins',
          name: 'Skins',
          component: () => import('../views/Skins.vue'),
          meta: { title: '涂装管理', icon: 'skin' }
        },
        {
          path: 'skin-stats',
          name: 'SkinStats',
          component: () => import('../views/SkinStats.vue'),
          meta: { title: '涂装数据', icon: 'bar-chart' }
        },
        {
          path: 'sync',
          name: 'Sync',
          component: () => import('../views/Sync.vue'),
          meta: { title: '数据同步', icon: 'sync' }
        },
        {
          path: 'sync-vehicles',
          name: 'SyncVehicles',
          component: () => import('../views/SyncVehicles.vue'),
          meta: { title: '载具同步', icon: 'cloud-sync' }
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('../views/Users.vue'),
          meta: { title: '用户管理', icon: 'user' }
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('../views/Settings.vue'),
          meta: { title: '系统设置', icon: 'setting' }
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
