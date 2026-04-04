import { useMemo } from 'react';

const CENTER = 70;
const RADIUS_OUTER = 56;
const RADIUS_INNER = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS_INNER;

function getColor(score) {
  if (score >= 85) return '#00c2a8'; // Teal
  if (score >= 60) return '#ffc107'; // Yellow
  if (score >= 30) return '#f97316'; // Orange
  return '#ff5252'; // Red
}

export default function HealthGauge({ score = 0, size = 140, showLabel = true }) {
  const color  = getColor(score);
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100);
  const label  = score >= 85 ? 'Healthy' : score >= 60 ? 'Warning' : score >= 30 ? 'Degraded' : 'Critical';

  return (
    <div className="health-gauge-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 140 140"
          className="health-gauge-svg"
          role="img"
          aria-label={`Health score: ${score}%`}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Outer Dashed / Gear Ring */}
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS_OUTER}
            fill="none" stroke={color}
            strokeWidth="4"
            strokeDasharray="6 4"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{ opacity: 0.8 }}
          />

          {/* Background ring for Score arc */}
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS_INNER}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="6"
          />

          {/* Score arc (Solid Glowing) */}
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS_INNER}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            filter="url(#glow)"
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
          />

          {/* Text inside */}
          <text x={CENTER} y={CENTER - 6} textAnchor="middle" dominantBaseline="middle"
            fontSize="24" fontWeight="800" fill={color} fontFamily="'JetBrains Mono', monospace">
            {score}
          </text>
          <text x={CENTER} y={CENTER + 16} textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill={color} fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="1" style={{ opacity: 0.8 }}>
            HEALTH %
          </text>

          {/* HUD Deco elements */}
          <path d={`M ${CENTER - 15} ${CENTER + 25} L ${CENTER - 5} ${CENTER + 20} L ${CENTER + 5} ${CENTER + 25} L ${CENTER + 15} ${CENTER + 20}`} fill="none" stroke={color} strokeWidth="2" style={{ opacity: 0.5 }} />
        </svg>
      </div>
      
      {showLabel && (
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 600,
          color,
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
