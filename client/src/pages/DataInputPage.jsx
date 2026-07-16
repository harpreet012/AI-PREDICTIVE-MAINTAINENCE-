import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { equipmentAPI } from '../services/api';
import { API_URL } from '../config';
import PageTransition from '../components/PageTransition';
import toast from 'react-hot-toast';

export default function DataInputPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [sensorData, setSensorData] = useState({
    temperature: '',
    vibration: '',
    pressure: '',
    rpm: '',
    current: '',
    humidity: '',
    noiseLevel: '',
  });

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await equipmentAPI.getAll();
      setEquipment(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
      toast.error('Failed to load equipment list');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEquipment) {
      toast.error('Please select equipment');
      return;
    }

    const data = {
      equipmentId: selectedEquipment,
      temperature: parseFloat(sensorData.temperature) || 0,
      vibration: parseFloat(sensorData.vibration) || 0,
      pressure: parseFloat(sensorData.pressure) || 0,
      rpm: parseFloat(sensorData.rpm) || 0,
      current: parseFloat(sensorData.current) || 0,
      humidity: parseFloat(sensorData.humidity) || 50,
      noiseLevel: parseFloat(sensorData.noiseLevel) || 60,
    };

    setLoading(true);
    try {
      // Send data to backend for prediction using API_URL from config
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('pm_token')}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Data submitted successfully for prediction!');
        // Store dataset ID for future reference
        if (result.datasetId) {
          localStorage.setItem('datasetId', result.datasetId);
        }
        navigate('/');
      } else {
        toast.error(result.error || 'Failed to submit data');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast('You can add data later via the Data Import page');
    navigate('/');
  };

  return (
    <PageTransition>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-header-left">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📊</span>
            Data Input for Prediction
          </h2>
          <p>Enter real sensor data to enable AI-powered predictions</p>
        </div>
      </div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="card-header">
          <div>
            <div className="card-title">Sensor Data Entry</div>
            <div className="card-subtitle">Provide real-time sensor readings for accurate predictions</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
          {/* Equipment Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#e6edf3' }}>
              Select Equipment *
            </label>
            <select
              value={selectedEquipment || ''}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            >
              <option value="">Choose equipment...</option>
              {equipment.map((eq) => (
                <option key={eq._id} value={eq._id}>
                  {eq.name} ({eq.type}) - {eq.location}
                </option>
              ))}
            </select>
          </div>

          {/* Sensor Input Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                Temperature (°C) *
              </label>
              <input
                type="number"
                step="0.1"
                value={sensorData.temperature}
                onChange={(e) => setSensorData({ ...sensorData, temperature: e.target.value })}
                required
                placeholder="e.g., 65.5"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                Vibration (mm/s) *
              </label>
              <input
                type="number"
                step="0.1"
                value={sensorData.vibration}
                onChange={(e) => setSensorData({ ...sensorData, vibration: e.target.value })}
                required
                placeholder="e.g., 2.5"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                Pressure (bar) *
              </label>
              <input
                type="number"
                step="0.1"
                value={sensorData.pressure}
                onChange={(e) => setSensorData({ ...sensorData, pressure: e.target.value })}
                required
                placeholder="e.g., 100.0"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                RPM *
              </label>
              <input
                type="number"
                step="1"
                value={sensorData.rpm}
                onChange={(e) => setSensorData({ ...sensorData, rpm: e.target.value })}
                required
                placeholder="e.g., 3000"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                Current (A) *
              </label>
              <input
                type="number"
                step="0.1"
                value={sensorData.current}
                onChange={(e) => setSensorData({ ...sensorData, current: e.target.value })}
                required
                placeholder="e.g., 35.0"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                Humidity (%)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={sensorData.humidity}
                onChange={(e) => setSensorData({ ...sensorData, humidity: e.target.value })}
                placeholder="e.g., 50"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#e6edf3', fontSize: 13 }}>
                Noise Level (dB)
              </label>
              <input
                type="number"
                step="1"
                value={sensorData.noiseLevel}
                onChange={(e) => setSensorData({ ...sensorData, noiseLevel: e.target.value })}
                placeholder="e.g., 65"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: 8,
                background: loading ? 'rgba(0,210,255,0.3)' : '#00D2FF',
                border: 'none',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Processing...' : 'Submit for Prediction'}
            </motion.button>

            <motion.button
              type="button"
              onClick={handleSkip}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Skip for Now
            </motion.button>
          </div>
        </form>

        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#FACC15', fontWeight: 600, marginBottom: 4 }}>ℹ️ Important</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            Real sensor data is required for accurate AI predictions. The system uses this data to train models and detect anomalies. You can also import bulk data via the Data Import page.
          </div>
        </div>
      </motion.div>
    </PageTransition>
  );
}
