import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, FileSpreadsheet, Calendar, Activity, AlertTriangle, Wrench, Trash2, Eye, Download, Search, Plus, Filter } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { datasetAPI } from '../services/api';

const STATUS_COLORS = {
  processing: '#f59e0b',
  active: '#10b981',
  archived: '#64748b',
  error: '#ef4444'
};

const STATUS_LABELS = {
  processing: 'Processing',
  active: 'Active',
  archived: 'Archived',
  error: 'Error'
};

export default function AssetLibrary() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'All') params.status = statusFilter;
      
      const { data } = await datasetAPI.getAll(params);
      if (data.success) {
        setDatasets(data.data);
        setTotalPages(data.pages);
        setTotalCount(data.total);
      }
    } catch (error) {
      toast.error('Failed to load datasets');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleDelete = async (id, factoryName) => {
    if (!window.confirm(`Are you sure you want to delete "${factoryName}"? This will delete all associated equipment, sensor readings, alerts, and maintenance logs.`)) {
      return;
    }

    try {
      await datasetAPI.delete(id);
      toast.success('Dataset deleted successfully');
      fetchDatasets();
    } catch (error) {
      toast.error('Failed to delete dataset');
      console.error(error);
    }
  };

  const handleArchive = async (id) => {
    try {
      await datasetAPI.updateStatus(id, 'archived');
      toast.success('Dataset archived');
      fetchDatasets();
    } catch (error) {
      toast.error('Failed to archive dataset');
      console.error(error);
    }
  };

  const handleActivate = async (id) => {
    try {
      await datasetAPI.updateStatus(id, 'active');
      toast.success('Dataset activated');
      fetchDatasets();
    } catch (error) {
      toast.error('Failed to activate dataset');
      console.error(error);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <PageTransition>
      <div className="page-header">
        <div className="page-header-left">
          <h2>🏭 Asset Library</h2>
          <p>{totalCount} datasets registered (Page {page} of {totalPages})</p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={() => navigate('/data-import')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <Plus size={16} />
          Import New Dataset
        </motion.button>
      </div>

      {/* Filters */}
      <div className="card mb-6" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4b5e78' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search by factory name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} style={{ color: '#4b5e78' }} />
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="processing">Processing</option>
              <option value="archived">Archived</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dataset Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 40px' }}>
          <motion.div
            style={{ fontSize: 48, marginBottom: 16 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            📊
          </motion.div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Loading datasets...</div>
          <p style={{ color: '#64748b' }}>Fetching your asset library</p>
        </div>
      ) : datasets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Building2 size={64} style={{ color: '#4b5e78', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No datasets found</h3>
          <p style={{ color: '#64748b', marginBottom: 24 }}>
            {search || statusFilter !== 'All' 
              ? 'Try adjusting your search or filters' 
              : 'Import your first dataset to get started'}
          </p>
          {!search && statusFilter === 'All' && (
            <motion.button
              className="btn btn-primary"
              onClick={() => navigate('/data-import')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{ gap: 8 }}
            >
              <Plus size={16} /> Import Dataset
            </motion.button>
          )}
        </div>
      ) : (
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 20
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence>
            {datasets.map((dataset, index) => (
              <motion.div
                key={dataset._id}
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: `1px solid ${dataset.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}`
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ 
                  scale: 1.02, 
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                  borderColor: dataset.status === 'active' ? 'rgba(16,185,129,0.5)' : 'rgba(59,130,246,0.3)'
                }}
                onClick={() => navigate(`/dataset/${dataset._id}`)}
              >
                {/* Header */}
                <div style={{ 
                  padding: '16px 20px', 
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Building2 size={18} color="#3b82f6" />
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                        {dataset.factoryName}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                      <MapPin size={12} />
                      {dataset.location}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    background: `${STATUS_COLORS[dataset.status]}15`,
                    color: STATUS_COLORS[dataset.status],
                    border: `1px solid ${STATUS_COLORS[dataset.status]}30`
                  }}>
                    {STATUS_LABELS[dataset.status]}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Machines', value: dataset.machineCount, icon: '🏭', color: '#3b82f6' },
                      { label: 'Sensors', value: dataset.sensorCount, icon: '📡', color: '#8b5cf6' },
                      { label: 'Alerts', value: dataset.alertCount, icon: '⚠️', color: '#f59e0b' },
                      { label: 'Maintenance', value: dataset.maintenanceCount, icon: '🔧', color: '#06b6d4' },
                    ].map((stat, i) => (
                      <div key={i} style={{ 
                        padding: '10px', 
                        background: `${stat.color}08`, 
                        borderRadius: 8, 
                        border: `1px solid ${stat.color}15`,
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{stat.icon}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Health Score */}
                  <div style={{ marginTop: 16, padding: '12px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>Fleet Health</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{dataset.healthScore}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(16,185,129,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', background: '#10b981', borderRadius: 3 }}
                        initial={{ width: 0 }}
                        animate={{ width: `${dataset.healthScore}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ 
                  padding: '12px 20px', 
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  color: '#64748b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileSpreadsheet size={12} />
                    {dataset.originalFileName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={12} />
                    {formatDate(dataset.uploadDate)}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ 
                  padding: '12px 20px', 
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  gap: 8
                }}>
                  <motion.button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dataset/${dataset._id}`);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Eye size={12} /> View
                  </motion.button>
                  
                  {dataset.status === 'active' ? (
                    <motion.button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(dataset._id);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Archive
                    </motion.button>
                  ) : dataset.status === 'archived' ? (
                    <motion.button
                      className="btn btn-success btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivate(dataset._id);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Activate
                    </motion.button>
                  ) : null}
                  
                  <motion.button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dataset._id, dataset.factoryName);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Trash2 size={12} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 8, 
          marginTop: 24,
          padding: '16px'
        }}>
          <motion.button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            whileHover={{ scale: page === 1 ? 1 : 1.05 }}
            whileTap={{ scale: page === 1 ? 1 : 0.95 }}
            style={{ opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </motion.button>
          
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            fontSize: 13, 
            color: '#64748b' 
          }}>
            Page {page} of {totalPages}
          </span>
          
          <motion.button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            whileHover={{ scale: page === totalPages ? 1 : 1.05 }}
            whileTap={{ scale: page === totalPages ? 1 : 0.95 }}
            style={{ opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </motion.button>
        </div>
      )}
    </PageTransition>
  );
}
