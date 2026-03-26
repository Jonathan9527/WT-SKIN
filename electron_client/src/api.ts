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

export const getSkins = (params: Record<string, any>) => api.get('/skins', { params }).then(r => r.data);
export const getSkinDetail = (id: number) => api.get(`/skins/${id}`).then(r => r.data);
export const getVehicles = (params: Record<string, string>) => api.get('/vehicles', { params }).then(r => r.data);
