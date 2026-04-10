import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  onlineUserIds: string[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  onlineUserIds: [],
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
    const newSocket = io(apiUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
      setOnlineUserIds([]);
    });

    newSocket.on('presence_update', (data: { onlineUserIds: string[] }) => {
      setOnlineUserIds(data.onlineUserIds);
    });

    newSocket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
};
