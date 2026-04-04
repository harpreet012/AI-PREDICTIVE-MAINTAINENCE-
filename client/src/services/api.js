import axios from 'axios';
import { BACKEND_URL } from '../config';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  login:    (email, password)       => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  me:       ()                      => api.get('/auth/me'),
  logout:   ()                      => api.post('/auth/logout'),
};

// Equipment
export const equipmentAPI = {
  getAll:   (params)  => api.get('/equipment', { params }),
  getById:  (id)      => api.get(`/equipment/${id}`),
  getStats: (id)      => api.get(`/equipment/${id}/stats`),
  create:   (data)    => api.post('/equipment', data),
  update:   (id, data)=> api.put(`/equipment/${id}`, data),
  delete:   (id)      => api.delete(`/equipment/${id}`),
};

// Sensors
export const sensorAPI = {
  getReadings:  (id, params) => api.get(`/sensors/${id}`, { params }),
  getLatestAll: ()           => api.get('/sensors/latest/all'),
  getStats:     (id, params) => api.get(`/sensors/${id}/stats`, { params }),
  ingest:       (data)       => api.post('/sensors', data),
};

// Alerts
export const alertAPI = {
  getAll:          (params) => api.get('/alerts', { params }),
  getUnreadCount:  ()       => api.get('/alerts/count/unread'),
  acknowledge:     (id)     => api.patch(`/alerts/${id}/acknowledge`),
  acknowledgeAll:  ()       => api.patch('/alerts/acknowledge/all'),
  resolve:         (id)     => api.patch(`/alerts/${id}/resolve`),
  delete:          (id)     => api.delete(`/alerts/${id}`),
};

// Analytics
export const analyticsAPI = {
  getOverview:    ()        => api.get('/analytics/overview'),
  getHealthTrend: (params)  => api.get('/analytics/health-trend', { params }),
  getRiskMatrix:  ()        => api.get('/analytics/risk-matrix'),
  getAnomalies:   (params)  => api.get('/analytics/anomalies', { params }),
  getCorrelation: (id, params) => api.get(`/analytics/correlation/${id}`, { params }),
};

// Maintenance
export const maintenanceAPI = {
  getAll:      (params) => api.get('/maintenance', { params }),
  getUpcoming: ()       => api.get('/maintenance/upcoming'),
  getCostStats:()       => api.get('/maintenance/stats/cost'),
  getById:     (id)     => api.get(`/maintenance/${id}`),
  create:      (data)   => api.post('/maintenance', data),
  update:      (id, data)=> api.put(`/maintenance/${id}`, data),
  delete:      (id)     => api.delete(`/maintenance/${id}`),
};

// Anomalies
export const anomalyAPI = {
  getAll: (params) => api.get('/anomalies', { params }),
};

export default api;
