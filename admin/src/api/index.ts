import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 登录
export const login = (data: { username: string; password: string }) =>
  api.post('/login', data)

// 涂装相关
export const getSkins = (params: any) => api.get('/skins', { params })
export const getSkin = (id: number) => api.get(`/skins/${id}`)
export const deleteSkin = (id: number) => api.delete(`/skins/${id}`)

// 同步数据
export const syncSkins = (data: any) => api.post('/skins/sync', data)

// 用户相关
export const getUsers = (params?: any) => api.get('/admin/users', { params })
export const deleteUser = (id: number) => api.delete(`/admin/users/${id}`)

// 统计
export const getStats = () => api.get('/admin/stats')

// 载具相关
export const getVehicles = (params: any) => api.get('/vehicles', { params })
export const getVehiclesFromDB = (params: any) => api.get('/vehicles/db', { params })
export const syncVehicles = (data: any) => api.post('/vehicles/sync', data)
export const syncVehiclesFromJSON = () => api.post('/vehicles/sync-from-json')
export const refreshVehicleCounts = (params: any) => api.post('/vehicles/refresh-counts', null, { params })
export const getRemoteStats = () => api.get('/vehicles/remote-stats')

// 同步任务相关
export const startSync = (data: any) => api.post('/sync/start', data)
export const getSyncStatus = (sessionId: string) => api.get('/sync/status', { params: { session_id: sessionId } })
export const getSyncSessions = (limit = 10) => api.get('/sync/sessions', { params: { limit } })

// 数据包相关
export const generateDataPack = () => api.post('/datapack/generate', null, { timeout: 120000 })
export const getDataPacks = () => api.get('/datapack/list')
export const publishDataPack = (version: string) => api.post('/datapack/publish', { version })
export const deleteDataPack = (version: string) => api.delete(`/datapack/${version}`)

export default api
