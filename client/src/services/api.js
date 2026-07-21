import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({ baseURL: API_URL, timeout: 20000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pm_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
let refreshPromise;
api.interceptors.response.use(response => response, async error => {
  const request = error.config;
  if (error.response?.status !== 401 || request?._retry || request?.url?.includes('/auth/')) return Promise.reject(error);
  request._retry = true;
  const refreshToken = localStorage.getItem('pm_refresh_token');
  if (!refreshToken) return Promise.reject(error);
  try {
    refreshPromise ||= axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    const { data } = await refreshPromise;
    localStorage.setItem('pm_access_token', data.accessToken);
    localStorage.setItem('pm_refresh_token', data.refreshToken);
    request.headers.Authorization = `Bearer ${data.accessToken}`;
    return api(request);
  } catch (refreshError) {
    localStorage.removeItem('pm_access_token');
    localStorage.removeItem('pm_refresh_token');
    window.location.hash = '#/login';
    return Promise.reject(refreshError);
  } finally { refreshPromise = undefined; }
});
export const authAPI = { login: (email,password) => api.post('/auth/login',{email,password}), register:(name,email,password)=>api.post('/auth/register',{name,email,password}), me:()=>api.get('/auth/me'), logout:(refreshToken)=>api.post('/auth/logout',{refreshToken}), logoutAll:()=>api.post('/auth/logout-all') };
export const equipmentAPI = { getAll:p=>api.get('/equipment',{params:p}), getById:id=>api.get(`/equipment/${id}`), getStats:id=>api.get(`/equipment/${id}/stats`), create:d=>api.post('/equipment',d), update:(id,d)=>api.put(`/equipment/${id}`,d), delete:id=>api.delete(`/equipment/${id}`) };
export const sensorAPI = { getReadings:(id,p)=>api.get(`/sensors/${id}`,{params:p}), getLatestAll:()=>api.get('/sensors/latest/all'), getStats:(id,p)=>api.get(`/sensors/${id}/stats`,{params:p}), ingest:d=>api.post('/import/reading',d) };
export const alertAPI = { getAll:p=>api.get('/alerts',{params:p}), getUnreadCount:()=>api.get('/alerts/count/unread'), acknowledge:id=>api.patch(`/alerts/${id}/acknowledge`), acknowledgeAll:()=>api.patch('/alerts/acknowledge/all'), resolve:id=>api.patch(`/alerts/${id}/resolve`), delete:id=>api.delete(`/alerts/${id}`) };
export const analyticsAPI = { getOverview:()=>api.get('/analytics/overview'), getHealthTrend:p=>api.get('/analytics/health-trend',{params:p}), getRiskMatrix:()=>api.get('/analytics/risk-matrix'), getAnomalies:p=>api.get('/analytics/anomalies',{params:p}), getCorrelation:(id,p)=>api.get(`/analytics/correlation/${id}`,{params:p}), getCalendar:(days=15)=>api.get('/analytics/calendar',{params:{days}}) };
export const maintenanceAPI = { getAll:p=>api.get('/maintenance',{params:p}), getUpcoming:()=>api.get('/maintenance/upcoming'), getCostStats:()=>api.get('/maintenance/stats/cost'), getById:id=>api.get(`/maintenance/${id}`), create:d=>api.post('/maintenance',d), update:(id,d)=>api.put(`/maintenance/${id}`,d), delete:id=>api.delete(`/maintenance/${id}`) };
export const anomalyAPI = { getAll:p=>api.get('/anomalies',{params:p}) };
export const userAPI = { getAll:()=>api.get('/users'), create:data=>api.post('/users', data), update:(id,data)=>api.patch(`/users/${id}`, data), delete:id=>api.delete(`/users/${id}`) };
export const importAPI = { preview:file => { const form = new FormData(); form.append('file', file); return api.post('/import/preview', form); }, import:(file, factoryData) => { const form = new FormData(); form.append('file', file); if (factoryData) { Object.keys(factoryData).forEach(key => form.append(key, factoryData[key])); } return api.post('/import/equipment', form); } };
export const datasetAPI = { getAll:p=>api.get('/datasets',{params:p}), getById:id=>api.get(`/datasets/${id}`), getStats:id=>api.get(`/datasets/${id}/stats`), create:d=>api.post('/datasets',d), update:(id,d)=>api.put(`/datasets/${id}`,d), delete:id=>api.delete(`/datasets/${id}`), updateStatus:(id,status)=>api.patch(`/datasets/${id}/status`,{status}) };
export default api;
