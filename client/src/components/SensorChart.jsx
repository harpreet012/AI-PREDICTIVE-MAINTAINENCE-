import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { format } from 'date-fns';

const SENSOR_CONFIG = {
  temperature: { color: '#ef4444', unit: '°C',   label: 'Temperature' },
  vibration:   { color: '#f97316', unit: 'mm/s', label: 'Vibration' },
  pressure:    { color: '#3b82f6', unit: 'bar',  label: 'Pressure' },
  rpm:         { color: '#8b5cf6', unit: 'RPM',  label: 'RPM' },
  current:     { color: '#06b6d4', unit: 'A',    label: 'Current' },
  healthScore: { color: '#10b981', unit: '%',    label: 'Health Score' },
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#101929',
      border: '1px solid rgba(99,179,237,0.15)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: '#64748b', marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
          {SENSOR_CONFIG[p.dataKey]?.label || p.dataKey}: {
            typeof p.value === 'number' ? p.value.toFixed(2) : p.value
          } {SENSOR_CONFIG[p.dataKey]?.unit || ''}
        </div>
      ))}
    </div>
  );
}

export default function SensorChart({
  data = [],
  sensors = ['temperature'],
  type = 'line',
  height = 200,
  anomalyThreshold = null,
  title,
  compact = false,
}) {
  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5e78' }}>
        No data available
      </div>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    time: d.timestamp
      ? format(new Date(d.timestamp), compact ? 'HH:mm' : 'HH:mm:ss')
      : d.time,
  }));

  const ChartComp  = type === 'area' ? AreaChart : LineChart;
  const DataComp   = type === 'area' ? Area      : Line;

  return (
    <div className="chart-container">
      {title && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>{title}</div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComp data={formatted} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {sensors.map(s => (
              <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={SENSOR_CONFIG[s]?.color || '#3b82f6'} stopOpacity={0.4} />
                <stop offset="95%" stopColor={SENSOR_CONFIG[s]?.color || '#3b82f6'} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 210, 255, 0.05)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#6e7681', fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6e7681', fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          {sensors.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#e6edf3' }}
              formatter={(val) => SENSOR_CONFIG[val]?.label || val}
            />
          )}
          {anomalyThreshold && (
            <ReferenceLine
              y={anomalyThreshold}
              stroke="#FF003C"
              strokeDasharray="6 4"
              strokeOpacity={0.8}
              label={{ value: 'Threshold', fill: '#FF003C', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
          )}
          {sensors.map(s => (
            <DataComp
              key={s}
              type="natural"
              dataKey={s}
              stroke={SENSOR_CONFIG[s]?.color || '#3b82f6'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#fff', stroke: SENSOR_CONFIG[s]?.color, strokeWidth: 2 }}
              fill={type === 'area' ? `url(#grad-${s})` : undefined}
              isAnimationActive={false}
              style={{ filter: 'url(#neonGlow)' }}
            />
          ))}
        </ChartComp>
      </ResponsiveContainer>
    </div>
  );
}
