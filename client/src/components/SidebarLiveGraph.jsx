import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { useSocket } from '../context/SocketContext';

export default function SidebarLiveGraph() {
  const { fleetSummary, connected } = useSocket();
  const [data, setData] = useState(Array.from({ length: 20 }, (_, i) => ({ time: i, health: 100 })));

  useEffect(() => {
    if (fleetSummary && fleetSummary.avgHealthScore) {
      setData(prev => {
        const newData = [...prev.slice(1), { time: Date.now(), health: fleetSummary.avgHealthScore }];
        return newData;
      });
    }
  }, [fleetSummary]);

  if (!connected) return null;

  return (
    <div style={{ padding: '0 15px', marginTop: '10px', marginBottom: '10px' }}>
      <div style={{
        fontSize: '10px', color: '#00c2a8', textTransform: 'uppercase', letterSpacing: '1px',
        marginBottom: '5px', fontWeight: 600, display: 'flex', justifyContent: 'space-between'
      }}>
        <span>Fleet Health (Live)</span>
        <span>{Math.round(data[data.length - 1].health)}%</span>
      </div>
      <div style={{ height: '60px', width: '100%', position: 'relative' }}>
        {/* HUD grid background effect */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundSize: '10px 10px',
          backgroundImage: 'linear-gradient(to right, rgba(0, 194, 168, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 194, 168, 0.05) 1px, transparent 1px)'
        }} />
        
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00c2a8" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#00c2a8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis domain={[0, 100]} hide />
            <Area
              type="monotone"
              dataKey="health"
              stroke="#00c2a8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorHealth)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
