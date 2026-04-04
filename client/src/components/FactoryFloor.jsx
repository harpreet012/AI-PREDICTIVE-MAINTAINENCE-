import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = { 
  healthy: '#00FF41', 
  warning: '#FACC15', 
  critical: '#FF003C', 
  offline: '#6e7681',
  maintenance: '#8b5cf6' 
};

export default function FactoryFloor({ equipment, compact = false }) {
  const navigate = useNavigate();

  // Group equipment by type to simulate production lines
  const lines = equipment.reduce((acc, eq) => {
    if (!acc[eq.type]) acc[eq.type] = [];
    acc[eq.type].push(eq);
    return acc;
  }, {});

  return (
    <div className={`factory-floor-container ${compact ? 'compact' : ''}`}>
      {Object.entries(lines).map(([type, machines], lineIndex) => (
        <div key={type} className="factory-line">
          <div className="factory-line-label">
            <span className="text-mono">{type.toUpperCase()} LINE</span>
          </div>
          
          <div className="factory-line-grid">
            {machines.map((machine, i) => {
              const status = machine.status || 'healthy';
              const color = STATUS_COLORS[status];
              const health = machine.healthScore ?? 100;

              return (
                <motion.div
                  key={machine._id}
                  className={`factory-node ${status}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${color}66` }}
                  transition={{ delay: i * 0.05 + lineIndex * 0.1 }}
                  onClick={() => navigate(`/equipment/${machine._id}`)}
                  style={{
                    borderColor: `${color}88`,
                    background: `linear-gradient(135deg, ${color}11, transparent)`,
                  }}
                >
                  {/* Status Indicator */}
                  <div className="node-status-light" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                  
                  <div className="node-info">
                    <div className="node-name">{machine.name}</div>
                    <div className="text-mono node-health" style={{ color }}>{health}%</div>
                  </div>
                  
                  {/* Connecting lines for aesthetics */}
                  {!compact && i < machines.length - 1 && (
                    <div className="node-connector" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
