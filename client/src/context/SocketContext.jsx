import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket]             = useState(null);
  const [connected, setConnected]       = useState(false);
  const [liveReadings, setLiveReadings] = useState({});    // keyed by equipmentId
  const [fleetSummary, setFleetSummary] = useState(null);
  const [liveAlerts, setLiveAlerts]     = useState([]);
  const alertCallbacksRef               = useRef([]);

  useEffect(() => {
    const socketUrl = BACKEND_URL || window.location.origin;
    const s = io(socketUrl, { transports: ['websocket', 'polling'] });

    s.on('connect',    () => { setSocket(s); setConnected(true);  console.log('🔌 Socket connected'); });
    s.on('disconnect', () => {               setConnected(false); console.log('❌ Socket disconnected'); });

    s.on('sensorData', (data) => {
      setLiveReadings(prev => ({ ...prev, [data.equipmentId]: data }));
    });

    s.on('fleetSummary', (summary) => {
      setFleetSummary(summary);
    });

    s.on('newAlert', (alert) => {
      setLiveAlerts(prev => [alert, ...prev].slice(0, 50));
      alertCallbacksRef.current.forEach(cb => cb(alert));
    });

    return () => s.disconnect();
  }, []);

  const onNewAlert = (cb) => {
    alertCallbacksRef.current.push(cb);
    return () => {
      alertCallbacksRef.current = alertCallbacksRef.current.filter(f => f !== cb);
    };
  };

  const subscribeToEquipment = (equipmentId) => {
    if (socket) socket.emit('subscribe:equipment', equipmentId);
  };

  return (
    <SocketContext.Provider value={{
      socket, connected, liveReadings, fleetSummary, liveAlerts,
      subscribeToEquipment, onNewAlert,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
