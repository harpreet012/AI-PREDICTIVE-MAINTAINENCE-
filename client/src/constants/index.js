// Equipment Types
export const EQUIPMENT_TYPES = [
  'Compressor',
  'Pump',
  'Motor',
  'Turbine',
  'Generator',
  'Conveyor',
  'CNC Machine',
  'Boiler',
];

// Equipment Status
export const EQUIPMENT_STATUS = ['healthy', 'warning', 'critical', 'offline', 'maintenance'];

// Alert Severity
export const ALERT_SEVERITY = ['critical', 'warning', 'info'];

// Alert Types
export const ALERT_TYPES = ['anomaly', 'degradation', 'threshold', 'prediction', 'scheduled'];

// User Roles
export const USER_ROLES = ['admin', 'operator', 'viewer'];

// Status Colors
export const STATUS_COLORS = {
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  offline: '#64748b',
  maintenance: '#8b5cf6',
};

// Severity Colors
export const SEVERITY_COLORS = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

// Status Glow Effects
export const STATUS_GLOW = {
  healthy: '0 0 20px rgba(16,185,129,0.15)',
  warning: '0 0 20px rgba(245,158,11,0.2)',
  critical: '0 0 24px rgba(239,68,68,0.25)',
  offline: 'none',
  maintenance: '0 0 20px rgba(139,92,246,0.2)',
};

// Status Border Colors
export const STATUS_BORDER = {
  healthy: 'rgba(16,185,129,0.3)',
  warning: 'rgba(245,158,11,0.35)',
  critical: 'rgba(239,68,68,0.45)',
  offline: 'rgba(100,116,139,0.2)',
  maintenance: 'rgba(139,92,246,0.35)',
};

// Equipment Type Icons
export const EQUIPMENT_TYPE_ICONS = {
  'Compressor': '🔵',
  'Motor': '⚡',
  'Pump': '💧',
  'Turbine': '🌀',
  'Generator': '🔋',
  'Conveyor': '📦',
  'CNC Machine': '⚙️',
  'Boiler': '🔥',
  'Extruder': '🏗️',
};

// Sensor Thresholds
export const SENSOR_THRESHOLDS = {
  temperature: {
    excellent: 60,
    normal: 75,
    warning: 85,
    critical: 90,
  },
  vibration: {
    excellent: 2.3,
    good: 4.5,
    acceptable: 7.1,
    critical: 10,
  },
  pressure: {
    normal: 120,
    warning: 145,
    critical: 150,
  },
  rpm: {
    warning: 3200,
    critical: 3600,
  },
  current: {
    warning: 45,
    critical: 58,
  },
};
