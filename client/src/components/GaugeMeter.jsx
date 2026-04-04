import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function GaugeMeter({ value = 0, size = 160, label = '', showValue = true }) {
  const [clampedVal, setClampedVal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClampedVal(Math.min(100, Math.max(0, value)));
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const cx = size / 2;
  const cy = size / 2;
  
  // Radius settings
  const rOuter = size * 0.42;
  const rInner = size * 0.35;
  const rCore = size * 0.28;

  const circInner = 2 * Math.PI * rInner;
  const offsetInner = circInner - (clampedVal / 100) * circInner;

  // Colors based on HUD image
  const colorTeal = "#00c2a8";
  const colorYellow = "#ffc107";
  const colorDarkTeal = "#004d40";

  return (
    <motion.div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
      whileHover={{ scale: 1.05 }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Outer Dashed / Gear Ring */}
          <circle
            cx={cx} cy={cy} r={rOuter}
            fill="none" stroke={colorTeal}
            strokeWidth={size * 0.04}
            strokeDasharray={`${size * 0.05} ${size * 0.04}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          
          {/* Outer Thin Ring */}
          <circle
            cx={cx} cy={cy} r={rOuter + size * 0.04}
            fill="none" stroke={colorTeal}
            strokeWidth={size * 0.01}
          />

          {/* Dots around the outer ring for HUD effect */}
          {[0, 60, 120, 180, 240, 300].map(angle => {
            const rad = angle * (Math.PI / 180);
            const dotR = rOuter + size * 0.08;
            return (
              <circle
                key={angle}
                cx={cx + dotR * Math.cos(rad)}
                cy={cy + dotR * Math.sin(rad)}
                r={size * 0.015}
                fill={colorYellow}
              />
            );
          })}

          {/* Inner Track (Dark) */}
          <circle
            cx={cx} cy={cy} r={rInner}
            fill="none" stroke="rgba(255, 193, 7, 0.15)"
            strokeWidth={size * 0.05}
          />

          {/* Active Value Arc (Yellow) */}
          <circle
            cx={cx} cy={cy} r={rInner}
            fill="none" stroke={colorYellow}
            strokeWidth={size * 0.05}
            strokeDasharray={circInner}
            strokeDashoffset={offsetInner}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
          
          {/* Innermost static thin rings */}
          <circle
            cx={cx} cy={cy} r={rCore}
            fill="none" stroke={colorTeal}
            strokeWidth={size * 0.005}
          />
          
          {/* Wavy line / decoration inside */}
          <path
            d={`M ${cx - size*0.15} ${cy + size*0.18} Q ${cx - size*0.07} ${cy + size*0.14} ${cx} ${cy + size*0.18} T ${cx + size*0.15} ${cy + size*0.18}`}
            fill="none"
            stroke={colorTeal}
            strokeWidth={size * 0.01}
          />
        </svg>

        {showValue && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', color: colorYellow,
            fontSize: size * 0.22, fontWeight: '700',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            letterSpacing: '1px',
            textShadow: `0 0 10px ${colorYellow}66`
          }}>
            {clampedVal}<span style={{ fontSize: size * 0.1, color: colorTeal }}>%</span>
          </div>
        )}
        
      </div>
      
      {label && (
        <div style={{
          fontSize: Math.max(11, size * 0.08), 
          color: colorTeal, 
          fontWeight: 600,
          textTransform: 'uppercase', 
          letterSpacing: '1px',
          textAlign: 'center'
        }}>
          {label}
        </div>
      )}
    </motion.div>
  );
}
