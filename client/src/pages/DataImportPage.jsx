import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Eye, Trash2, Download } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { API_URL, ML_URL } from '../config';

const SAMPLE_DATA = [
  { UID: 1, ProductType: 'Extruder',         Humidity: 5.88,  Temperature: 66.17, Age: 13, Quantity: 39764, MTTF: 69  },
  { UID: 2, ProductType: 'Pressure Control', Humidity: 42.76, Temperature: 40.29, Age: 4,  Quantity: 45181, MTTF: 532 },
  { UID: 3, ProductType: 'Motor',             Humidity: 18.3,  Temperature: 72.50, Age: 7,  Quantity: 22000, MTTF: 245 },
  { UID: 4, ProductType: 'Pump',              Humidity: 33.1,  Temperature: 58.00, Age: 2,  Quantity: 18500, MTTF: 800 },
];

function StepBadge({ step, label, active, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <motion.div
        style={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
          background: done ? '#10b981' : active ? '#3b82f6' : 'rgba(255,255,255,0.06)',
          color: done || active ? '#fff' : '#4b5e78',
          border: active ? '2px solid rgba(59,130,246,0.5)' : '2px solid transparent',
          boxShadow: active ? '0 0 12px rgba(59,130,246,0.4)' : done ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
        }}
        animate={active ? { scale: [1, 1.06, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {done ? <CheckCircle size={14} /> : step}
      </motion.div>
      <span style={{ fontSize: 12, color: done ? '#10b981' : active ? '#f0f6ff' : '#4b5e78', fontWeight: active ? 600 : 400 }}>
        {label}
      </span>
    </div>
  );
}

export default function DataImportPage() {
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [total,      setTotal]      = useState(0);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const { token } = useAuth();

  const step = result ? 3 : preview ? 2 : file ? 1.5 : 1;

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      console.log('Previewing file:', f.name);
      const { data } = await axios.post(`${API_URL}/import/preview`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setPreview(data.rows);
      setTotal(data.total);
      console.log('Parsed rows:', data.total, 'Sample:', data.rows?.[0]);
      toast.success(`Parsed ${data.total} rows successfully!`);
    } catch (err) {
      toast.error('Could not parse file: ' + (err?.response?.data?.error || err.message));
      setFile(null);
    } finally {
      setPreviewing(false);
    }
  }, [token]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      console.log('Uploading file to:', `${API_URL}/import/equipment`);
      const { data } = await axios.post(`${API_URL}/import/equipment`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      console.log('Import success:', data);
      setResult(data);
      toast.success(`✅ Import complete! ${data.created} created, ${data.updated} updated.`);

      // Call ML service with a sample of the parsed data for anomaly prediction
      try {
        const sampleRow = preview?.[0];
        if (sampleRow) {
          console.log('Calling ML service with sample:', sampleRow);
          const mlRes = await fetch(`${ML_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sampleRow),
          });
          const mlData = await mlRes.json();
          console.log('ML Predictions:', mlData);
        }
      } catch (mlErr) {
        console.warn('ML service call failed (non-critical):', mlErr.message);
      }
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(err?.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setTotal(0); };

  const columns = preview?.[0] ? Object.keys(preview[0]) : [];

  // Download sample CSV
  const downloadSample = () => {
    const headers = ['UID', 'ProductType', 'Humidity', 'Temperature', 'Age', 'Quantity', 'MTTF'];
    const rows = SAMPLE_DATA.map(r => headers.map(h => r[h]).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sample_equipment_data.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded!');
  };

  return (
    <PageTransition>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>📂 Data Import</h2>
          <p>Upload Excel (.xlsx, .xls) or CSV files to import machine data</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button
            className="btn btn-secondary"
            onClick={downloadSample}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{ gap: 8 }}
          >
            <Download size={14} /> Download Sample CSV
          </motion.button>
          
          <motion.button
            className="btn btn-primary"
            onClick={file && !previewing && !loading ? handleImport : open}
            disabled={loading || previewing}
            style={{ opacity: (loading || previewing) ? 0.6 : 1, gap: 8, padding: '8px 20px', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}
            whileHover={{ scale: 1.04, boxShadow: '0 0 25px rgba(59,130,246,0.5)' }}
            whileTap={{ scale: 0.96 }}
          >
            <Upload size={14} /> {loading ? 'Importing...' : 'Import Data'}
          </motion.button>
        </div>
      </div>

      {/* ── Progress Steps ── */}
      <motion.div
        className="card mb-6"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <StepBadge step={1} label="Upload File"    active={step === 1}   done={step >= 1.5} />
          <div style={{ flex: 1, height: 1, background: step >= 1.5 ? '#10b981' : 'rgba(255,255,255,0.06)', minWidth: 20, transition: 'background 0.5s' }} />
          <StepBadge step={2} label="Preview Data"   active={step === 1.5 || step === 2} done={step === 3} />
          <div style={{ flex: 1, height: 1, background: step === 3 ? '#10b981' : 'rgba(255,255,255,0.06)', minWidth: 20, transition: 'background 0.5s' }} />
          <StepBadge step={3} label="Import & Done"  active={step === 3}   done={step === 3} />
        </div>
      </motion.div>

      {/* ── Format Guide ── */}
      <motion.div className="card mb-6"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-header">
          <div>
            <div className="card-title">📋 Expected File Format</div>
            <div className="card-subtitle">Any tabular data is supported. The system will dynamically read columns and predict outcomes.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['CSV', 'XLSX', 'XLS'].map(fmt => (
              <span key={fmt} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                .{fmt.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {['UID','ProductType','Humidity','Temperature','Age','Quantity','MTTF'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_DATA.slice(0, 2).map((row, i) => (
                <tr key={i}>
                  <td>{row.UID}</td>
                  <td>{row.ProductType}</td>
                  <td>{row.Humidity}</td>
                  <td>{row.Temperature}</td>
                  <td>{row.Age}</td>
                  <td>{row.Quantity}</td>
                  <td>{row.MTTF}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Column descriptions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 16 }}>
          {[
            { col: 'UID',          desc: 'Unique machine ID (optional)',    req: false },
            { col: 'ProductType',  desc: 'Machine type/name (optional)',    req: false },
            { col: 'Humidity',     desc: 'Ambient humidity (%)',            req: false },
            { col: 'Temperature',  desc: 'Operating temp (°C)',             req: false },
            { col: 'Dynamic Data', desc: 'Any numeric column will be used for ML predictions', req: false },
          ].map(item => (
            <div key={item.col} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <code style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '1px 5px', borderRadius: 4 }}>{item.col}</code>
                {item.req && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>REQUIRED</span>}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Drop Zone & Action Bar ── */}
      <AnimatePresence mode="wait">
        {!file && !previewing && !result && (
          <motion.div
            key="dropzone"
            {...getRootProps()}
            className={`import-dropzone ${isDragActive ? 'active' : ''}`}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ delay: 0.15 }}
            whileHover={{ scale: 1.01, borderColor: '#3b82f6' }}
          >
            <input {...getInputProps()} />
            <div className="import-dropzone-content">
              <motion.div
                className="import-dropzone-icon"
                animate={isDragActive
                  ? { scale: 1.3, rotate: [0, -10, 10, 0] }
                  : { scale: [1, 1.05, 1], rotate: 0 }
                }
                transition={isDragActive
                  ? { duration: 0.4 }
                  : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                }
              >
                <FileSpreadsheet size={56} color={isDragActive ? '#3b82f6' : '#4b5e78'} />
              </motion.div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 6px' }}>
                {isDragActive ? '🎯 Release to upload!' : 'Drop your file here'}
              </h3>
              <p style={{ color: '#64748b', marginBottom: 16 }}>
                Supports .xlsx, .xls, .csv — max 10MB
              </p>
              <motion.button className="btn btn-primary" style={{ gap: 8 }} whileHover={{ scale: 1.05 }} onClick={open}>
                <Upload size={14} /> Browse Files
              </motion.button>
            </div>
          </motion.div>
        )}

        {previewing && (
          <motion.div
            key="parsing"
            className="card" style={{ textAlign: 'center', padding: '60px 40px', marginBottom: 24 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div style={{ fontSize: 48, marginBottom: 16 }} animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              📊
            </motion.div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Parsing file…</div>
            <p style={{ color: '#64748b' }}>Analyzing columns and validating data</p>
          </motion.div>
        )}

        {file && !previewing && !result && (
          <motion.div
            key="ready"
            className="card"
            style={{ 
              background: 'rgba(16,185,129,0.06)', 
              borderColor: '#10b981', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '20px 24px',
              marginBottom: '24px'
            }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
               <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <FileSpreadsheet size={24} color="#10b981" />
               </div>
               <div>
                 <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={16} /> Ready to Import
                 </h3>
                 <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: 13 }}>
                   {file.name} • {total} rows detected
                 </p>
               </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <motion.button className="btn btn-secondary" onClick={reset} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                Cancel
              </motion.button>
              <motion.button
                onClick={handleImport}
                disabled={loading}
                whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(16,185,129,0.4)' }}
                whileTap={{ scale: 0.96 }}
                style={{ 
                  background: '#10b981', color: '#fff', border: 'none', 
                  padding: '10px 20px', borderRadius: 6, fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
                }}
              >
                {loading ? (
                  <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>⟳</motion.span> Importing…</>
                ) : (
                  <><Upload size={16} /> Import Data</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preview Table ── */}
      <AnimatePresence>
        {preview && !previewing && (
          <motion.div
            className="card mb-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Eye size={16} color="#3b82f6" />
                  Preview — Data Sample
                </div>
                <div className="card-subtitle">
                  Showing first {preview.length} of <strong style={{ color: '#f0f6ff' }}>{total}</strong> rows
                  · {columns.length} columns detected
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Rows',  value: total,           color: '#3b82f6', icon: '📄' },
                { label: 'Columns',    value: columns.length,  color: '#8b5cf6', icon: '📊' },
                { label: 'File Size',  value: `${(file.size/1024).toFixed(1)} KB`, color: '#06b6d4', icon: '💾', raw: true },
              ].map(s => (
                <div key={s.label} style={{ padding: '12px 16px', background: `${s.color}0d`, border: `1px solid ${s.color}22`, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.raw ? s.value : s.value}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ position: 'relative', width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: '#0d1117' }}>
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '300px' }}>
                <table className="data-table" style={{ width: 'max-content', minWidth: '100%', tableLayout: 'fixed' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#121821', zIndex: 10 }}>
                    <tr>{columns.map(c => <th key={c} style={{ whiteSpace: 'nowrap', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                      >
                        {columns.map(c => <td key={c} style={{ whiteSpace: 'nowrap', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', padding: '10px 16px' }}>{String(row[c] ?? '')}</td>)}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Import Result ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="card"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220 }}
            style={{ border: '1px solid rgba(16,185,129,0.3)', background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(14,30,51,1) 70%)' }}
          >
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <motion.div
                  style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                >
                  <CheckCircle size={20} color="#10b981" />
                </motion.div>
                <div>
                  <div className="card-title" style={{ color: '#10b981' }}>Import Complete!</div>
                  <div className="card-subtitle">Equipment data has been saved to the database</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Total Rows', value: result.total,    color: '#3b82f6', icon: '📄' },
                { label: 'Created',    value: result.created,  color: '#10b981', icon: '✅' },
                { label: 'Updated',    value: result.updated,  color: '#f59e0b', icon: '🔄' },
                { label: 'Readings',   value: result.readings, color: '#8b5cf6', icon: '📡' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  style={{ padding: '16px', background: `${s.color}0d`, border: `1px solid ${s.color}25`, borderRadius: 12, textAlign: 'center' }}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
                </motion.div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button className="btn btn-secondary" onClick={reset} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                📂 Import Another File
              </motion.button>
              <motion.a className="btn btn-primary" href="/" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                🏭 View Dashboard →
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </PageTransition>
  );
}
