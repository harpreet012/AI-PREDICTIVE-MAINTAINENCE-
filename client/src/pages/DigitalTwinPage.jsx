import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { equipmentAPI } from '../services/api';
import FactoryFloor from '../components/FactoryFloor';
import PageTransition from '../components/PageTransition';

export default function DigitalTwinPage() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const { liveReadings } = useSocket();

  useEffect(() => {
    let mounted = true;
    const fetchEquipment = async () => {
      try {
        const res = await equipmentAPI.getAll({ limit: 1000 });
        if (mounted) setEquipment(res.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch equipment:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchEquipment();
    return () => { mounted = false };
  }, []);

  const equipmentWithLive = equipment.map(e => {
    const live = liveReadings[e._id];
    return live ? { ...e, status: live.status, healthScore: live.healthScore } : e;
  });

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <PageTransition
      className="digital-twin-page"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div className="page-header-left">
          <h2>🌐 Digital Twin — Factory Floor Layout</h2>
          <p>Live spatial clustering, asset mapping & hardware connectivity</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="live-badge"><span className="live-dot" />Live Updates</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-bright)' }}>
        <div className="card-header" style={{ padding: '20px 20px 0', marginBottom: 16 }}>
          <div>
            <div className="card-title" style={{ color: 'var(--accent-cyan)' }}>Production Lines Overview</div>
            <div className="card-subtitle">Click on any live node to navigate directly to telemetry</div>
          </div>
        </div>
        <FactoryFloor equipment={equipmentWithLive} />
      </div>
    </PageTransition>
  );
}
