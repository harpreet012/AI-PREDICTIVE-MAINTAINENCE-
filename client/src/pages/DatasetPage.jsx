import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Building2, MapPin, FileSpreadsheet, Calendar, Activity, 
  AlertTriangle, Wrench, Settings, ArrowLeft, BarChart3, 
  Factory, Cpu, TrendingUp, Shield, Info, Edit2, Trash2 
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { datasetAPI, equipmentAPI, alertAPI, maintenanceAPI, analyticsAPI } from '../services/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'machines', label: 'Machines', icon: Factory },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function DatasetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dataset, setDataset] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  const fetchDataset = useCallback(async () => {
    setLoading(true);
    try {
      const [datasetRes, statsRes] = await Promise.all([
        datasetAPI.getById(id),
        datasetAPI.getStats(id)
      ]);

      if (datasetRes.data.success) {
        setDataset(datasetRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to load dataset');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTabData = useCallback(async () => {
    try {
      switch (activeTab) {
        case 'machines':
          const eqRes = await equipmentAPI.getAll({ datasetId: id, limit: 50 });
          if (eqRes.data.success) setEquipment(eqRes.data.data);
          break;
        case 'alerts':
          const alertRes = await alertAPI.getAll({ datasetId: id, limit: 50 });
          if (alertRes.data.success) setAlerts(alertRes.data.data);
          break;
        case 'maintenance':
          const maintRes = await maintenanceAPI.getAll({ datasetId: id, limit: 50 });
          if (maintRes.data.success) setMaintenance(maintRes.data.data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Failed to load tab data:', error);
    }
  }, [activeTab, id]);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${dataset?.factoryName}"? This will delete all associated equipment, sensor readings, alerts, and maintenance logs.`)) {
      return;
    }

    try {
      await datasetAPI.delete(id);
      toast.success('Dataset deleted successfully');
      navigate('/asset-library');
    } catch (error) {
      toast.error('Failed to delete dataset');
      console.error(error);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab dataset={dataset} stats={stats} />;
      case 'machines':
        return <MachinesTab equipment={equipment} datasetId={id} />;
      case 'analytics':
        return <AnalyticsTab datasetId={id} />;
      case 'alerts':
        return <AlertsTab alerts={alerts} datasetId={id} />;
      case 'maintenance':
        return <MaintenanceTab maintenance={maintenance} datasetId={id} />;
      case 'settings':
        return <SettingsTab dataset={dataset} onUpdate={fetchDataset} onDelete={handleDelete} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <motion.div
            style={{ fontSize: 48, marginBottom: 16 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            📊
          </motion.div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Loading dataset...</div>
          <p style={{ color: '#64748b' }}>Fetching dataset information</p>
        </div>
      </PageTransition>
    );
  }

  if (!dataset) {
    return (
      <PageTransition>
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Building2 size={64} style={{ color: '#4b5e78', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Dataset not found</h3>
          <p style={{ color: '#64748b', marginBottom: 24 }}>The dataset you're looking for doesn't exist or you don't have access to it.</p>
          <motion.button
            className="btn btn-primary"
            onClick={() => navigate('/asset-library')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            Back to Asset Library
          </motion.button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <motion.button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/asset-library')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} /> Back
          </motion.button>
          <h2>🏭 {dataset.factoryName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', fontSize: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} />
              {dataset.location}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={14} />
              {dataset.originalFileName}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} />
              {formatDate(dataset.uploadDate)}
            </span>
          </div>
        </div>
        <div style={{ 
          padding: '6px 14px', 
          borderRadius: 20, 
          fontSize: 12, 
          fontWeight: 700, 
          background: dataset.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
          color: dataset.status === 'active' ? '#10b981' : '#f59e0b',
          border: dataset.status === 'active' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)'
        }}>
          {dataset.status.toUpperCase()}
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-6" style={{ padding: '0' }}>
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          overflowX: 'auto'
        }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '16px 20px',
                  background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                  color: isActive ?('#3b82f6') : '#64748b',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                whileHover={{ background: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)' }}
              >
                <Icon size={16} />
                {tab.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
    </PageTransition>
  );
}

// Overview Tab
function OverviewTab({ dataset, stats }) {
  if (!dataset || !stats) return null;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Machines', value: stats.machineCount, icon: '🏭', color: '#3b82f6' },
          { label: 'Sensor Readings', value: stats.sensorCount, icon: '📡', color: '#8b5cf6' },
          { label: 'Alerts', value: stats.alertCount, icon: '⚠️', color: '#f59e0b' },
          { label: 'Maintenance Logs', value: stats.maintenanceCount, icon: '🔧', color: '#06b6d4' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Health Score */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} color="#10b981" />
          Fleet Health Score
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#64748b' }}>Overall Health</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: stats.avgHealth >= 80 ? '#10b981' : stats.avgHealth >= 50 ? '#f59e0b' : '#ef4444' }}>
                {stats.avgHealth}%
              </span>
            </div>
            <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
              <motion.div
                style={{ 
                  height: '100%', 
                  background: stats.avgHealth >= 80 ? '#10b981' : stats.avgHealth >= 50 ? '#f59e0b' : '#ef4444',
                  borderRadius: 6 
                }}
                initial={{ width: 0 }}
                animate={{ width: `${stats.avgHealth}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: stats.avgHealth >= 80 ? '#10b981' : stats.avgHealth >= 50 ? '#f59e0b' : '#ef4444' }}>
              {stats.avgHealth >= 80 ? '✓' : stats.avgHealth >= 50 ? '!' : '⚠'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {stats.avgHealth >= 80 ? 'Good' : stats.avgHealth >= 50 ? 'Fair' : 'Critical'}
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={18} color="#3b82f6" />
          Dataset Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {[
            { label: 'Factory Name', value: dataset.factoryName },
            { label: 'Location', value: dataset.location },
            { label: 'Original File', value: dataset.originalFileName },
            { label: 'File Size', value: formatFileSize(dataset.fileSize) },
            { label: 'Upload Date', value: formatDate(dataset.uploadDate) },
            { label: 'Last Updated', value: formatDate(dataset.lastUpdated) },
          ].map((item, i) => (
            <div key={i}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
        {dataset.description && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Description</div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{dataset.description}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Machines Tab
function MachinesTab({ equipment, datasetId }) {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Factory size={18} color="#3b82f6" />
          Equipment ({equipment.length})
        </h3>
      </div>

      {equipment.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Cpu size={48} style={{ color: '#4b5e78', marginBottom: 16 }} />
          <p style={{ color: '#64748b' }}>No equipment found in this dataset</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {equipment.map((eq) => (
            <motion.div
              key={eq._id}
              className="card"
              style={{ 
                padding: '16px 20px', 
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              whileHover={{ scale: 1.01, borderColor: '#3b82f6' }}
              onClick={() => navigate(`/equipment/${eq._id}`)}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{eq.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {eq.type} • {eq.location}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: eq.healthScore >= 80 ? '#10b981' : eq.healthScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {eq.healthScore}%
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Health</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Analytics Tab
function AnalyticsTab({ datasetId }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
      <BarChart3 size={64} style={{ color: '#4b5e78', marginBottom: 16 }} />
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Analytics Coming Soon</h3>
      <p style={{ color: '#64748b' }}>Detailed analytics for this dataset will be available soon.</p>
    </div>
  );
}

// Alerts Tab
function AlertsTab({ alerts, datasetId }) {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={18} color="#f59e0b" />
        Alerts ({alerts.length})
      </h3>

      {alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Shield size={48} style={{ color: '#10b981', marginBottom: 16 }} />
          <p style={{ color: '#64748b' }}>No alerts in this dataset</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {alerts.map((alert) => (
            <div key={alert._id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ 
                  padding: '4px 10px', 
                  borderRadius: 12, 
                  fontSize: 11, 
                  fontWeight: 700,
                  background: alert.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b'
                }}>
                  {alert.severity.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {formatDate(alert.createdAt)}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{alert.message}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{alert.type}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Maintenance Tab
function MaintenanceTab({ maintenance, datasetId }) {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Wrench size={18} color="#06b6d4" />
        Maintenance Logs ({maintenance.length})
      </h3>

      {maintenance.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <Wrench size={48} style={{ color: '#4b5e78', marginBottom: 16 }} />
          <p style={{ color: '#64748b' }}>No maintenance logs in this dataset</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {maintenance.map((log) => (
            <div key={log._id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{log.type}</div>
                <div style={{ 
                  padding: '4px 10px', 
                  borderRadius: 12, 
                  fontSize: 11, 
                  fontWeight: 700,
                  background: log.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: log.status === 'completed' ? '#10b981' : '#f59e0b'
                }}>
                  {log.status}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                Technician: {log.technician}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Scheduled: {formatDate(log.scheduledDate)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Settings Tab
function SettingsTab({ dataset, onUpdate, onDelete }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={18} color="#3b82f6" />
          Dataset Settings
        </h3>
        
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Factory Name</label>
            <div style={{ fontSize: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              {dataset?.factoryName}
            </div>
          </div>
          
          <div>
            <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Location</label>
            <div style={{ fontSize: 14, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              {dataset?.location}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>Status</label>
            <div style={{ 
              padding: '8px 12px', 
              background: dataset?.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', 
              borderRadius: 6,
              color: dataset?.status === 'active' ? '#10b981' : '#f59e0b',
              fontSize: 14,
              fontWeight: 600,
              display: 'inline-block'
            }}>
              {dataset?.status?.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', borderColor: 'rgba(239,68,68,0.3)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
          <Trash2 size={18} />
          Danger Zone
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          Deleting this dataset will permanently remove all associated equipment, sensor readings, alerts, and maintenance logs. This action cannot be undone.
        </p>
        <motion.button
          className="btn btn-danger"
          onClick={onDelete}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Delete Dataset
        </motion.button>
      </div>
    </div>
  );
}

// Helper functions
function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatFileSize(bytes) {
  if (!bytes) return 'N/A';
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
}
