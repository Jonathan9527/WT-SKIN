import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8080/client' });

export interface Skin {
  id: number; wt_live_id: number; lang_group: number; title: string;
  description: string; author: string; author_id: number; author_avatar: string;
  vehicle_type: string; vehicle_country: string; vehicle_class: string; vehicle_name: string;
  image_url: string; images: string; file_url: string; file_name: string;
  file_size: number; file_type: string; likes: number; views: number;
  downloads: number; comments: number; featured: boolean; pbr_ready: boolean;
}

export interface Vehicle {
  wt_live_id: string; name: string; type: string; country: string;
  vehicle_class: string; skin_count: number;
}

const electronAPI = window.electronAPI;

// 带缓存的数据请求
async function cachedGet(endpoint: string, params: Record<string, any>) {
  // 尝试读缓存
  if (electronAPI) {
    const cached = await electronAPI.cacheGetData(endpoint, params);
    if (cached) return cached;
  }

  // 请求网络
  const res = await api.get(endpoint, { params });
  const data = res.data;

  // 写缓存 + 缓存图片
  if (electronAPI && data?.status === 'OK') {
    electronAPI.cacheSetData(endpoint, params, data);
    // 异步缓存图片，不阻塞返回
    cacheSkinsImages(data.data?.list);
  }

  return data;
}

// 异步批量缓存涂装图片
async function cacheSkinsImages(skins?: Skin[]) {
  if (!electronAPI || !skins?.length) return;
  const urls = skins.map(s => s.image_url).filter(Boolean);
  if (urls.length === 0) return;
  try {
    const mapping = await electronAPI.cacheImages(urls);
    // 替换 skin 对象中的 image_url 为本地路径
    skins.forEach(s => {
      if (s.image_url && mapping[s.image_url]) {
        s.image_url = mapping[s.image_url];
      }
    });
  } catch {}
}

// 获取单个涂装的缓存图片 URL
export async function getCachedImageUrl(url: string): Promise<string> {
  if (!electronAPI || !url) return url;
  try {
    const mapping = await electronAPI.cacheImages([url]);
    return mapping[url] || url;
  } catch {
    return url;
  }
}

export const getSkins = (params: Record<string, any>) => cachedGet('/skins', params);
export const getSkinDetail = (id: number) => api.get(`/skins/${id}`).then(r => r.data);
export const getVehicles = (params: Record<string, string>) => cachedGet('/vehicles', params);
