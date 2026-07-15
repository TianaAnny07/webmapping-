import { createContext, useContext, useRef, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '../services/api';

interface AlertContextValue {
  alertMessage: string | null;
  dismissAlert: () => void;
  startTracking: (userId: string, routeGeometry: [number, number][]) => void;
  sendPosition: (lat: number, lon: number) => void;
  stopTracking: () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const routeRef = useRef<[number, number][]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const startTracking = useCallback((userId: string, routeGeometry: [number, number][]) => {
    routeRef.current = routeGeometry;
    if (!socketRef.current) {
      socketRef.current = io(`${WS_BASE_URL}/alerts`, { transports: ['websocket'] });
      socketRef.current.on('user-alert', (payload: { message: string }) => {
        setAlertMessage(payload.message);
      });
    }
  }, []);

  const sendPosition = useCallback((lat: number, lon: number) => {
    socketRef.current?.emit('track-position', {
      userId: 'mobile-user',
      lat,
      lon,
      routeGeometry: routeRef.current,
      deviationThresholdMeters: 300,
    });
  }, []);

  const stopTracking = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    routeRef.current = [];
    setAlertMessage(null);
  }, []);

  return (
    <AlertContext.Provider value={{ alertMessage, dismissAlert: () => setAlertMessage(null), startTracking, sendPosition, stopTracking }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts doit être utilisé dans <AlertProvider>');
  return ctx;
}
