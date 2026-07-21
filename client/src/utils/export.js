/**
 * Export utilities for CSV and Excel export
 */

/**
 * Convert array of objects to CSV string
 */
export const arrayToCSV = (data, headers) => {
  if (!data || data.length === 0) return '';

  const headerKeys = headers || Object.keys(data[0]);
  const headerRow = headerKeys.join(',');
  
  const rows = data.map(item => 
    headerKeys.map(key => {
      const value = item[key];
      // Handle nested objects, arrays, and special characters
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headerRow, ...rows].join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (data, filename, headers) => {
  const csv = arrayToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export equipment data
 */
export const exportEquipment = (equipment) => {
  const headers = [
    'name',
    'type',
    'location',
    'manufacturer',
    'model',
    'serialNumber',
    'status',
    'healthScore',
    'failureProbability',
    'operatingHours',
    'createdAt',
  ];
  
  downloadCSV(equipment, 'equipment-export', headers);
};

/**
 * Export alerts data
 */
export const exportAlerts = (alerts) => {
  const headers = [
    'equipmentId',
    'type',
    'severity',
    'message',
    'acknowledged',
    'resolved',
    'healthScore',
    'anomalyScore',
    'createdAt',
  ];
  
  downloadCSV(alerts, 'alerts-export', headers);
};

/**
 * Export sensor readings
 */
export const exportSensorReadings = (readings) => {
  const headers = [
    'equipmentId',
    'timestamp',
    'temperature',
    'vibration',
    'pressure',
    'rpm',
    'current',
    'humidity',
    'noiseLevel',
    'healthScore',
    'isAnomaly',
  ];
  
  downloadCSV(readings, 'sensor-readings-export', headers);
};

/**
 * Export maintenance logs
 */
export const exportMaintenanceLogs = (logs) => {
  const headers = [
    'equipmentId',
    'type',
    'description',
    'scheduledDate',
    'completedDate',
    'status',
    'cost',
    'technician',
    'createdAt',
  ];
  
  downloadCSV(logs, 'maintenance-logs-export', headers);
};
