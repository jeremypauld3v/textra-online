import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import Toast from 'react-native-toast-message';

interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'trade';
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  onlineUserIds: string[];
  tradeWith: string | null;
  setTradeWith: (val: string | null) => void;
  requestTrade: (targetUserId: string) => void;
  alertConfig: AlertConfig;
  hideAlert: () => void;
  showAlert: (config: Omit<AlertConfig, 'visible'>) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  onlineUserIds: [],
  tradeWith: null,
  setTradeWith: () => {},
  requestTrade: () => {},
  alertConfig: { visible: false, title: '', message: '' },
  hideAlert: () => {},
  showAlert: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [tradeWith, setTradeWith] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
  });

  const token = useAuthStore((state) => state.token);
  const currentUserId = useAuthStore((state) => state.userId);

  const hideAlert = useCallback(() => setAlertConfig(prev => ({ ...prev, visible: false })), []);
  const showAlert = useCallback((config: Omit<AlertConfig, 'visible'>) => {
    setAlertConfig({ ...config, visible: true });
  }, []);

  const requestTrade = useCallback((targetUserId: string) => {
     if (!socket || targetUserId === currentUserId) return;
     socket.emit("trade_request", targetUserId);
     Toast.show({
        type: 'info',
        text1: 'Trade Request',
        text2: 'Invitation sent. Waiting for response...',
     });
  }, [socket, currentUserId]);

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

    // --- GLOBAL TRADE LISTENERS ---
    newSocket.on("trade_invite", (data: { fromUserId: string, fromName: string }) => {
       showAlert({
          title: "Trade Invitation",
          message: `${data.fromName} wants to trade with you!`,
          type: 'trade',
          onConfirm: () => {
             newSocket.emit("trade_respond", { targetUserId: data.fromUserId, accepted: true });
             hideAlert();
          },
          onCancel: () => {
             newSocket.emit("trade_respond", { targetUserId: data.fromUserId, accepted: false });
             hideAlert();
          }
       });
    });

    newSocket.on("trade_start", (data: { partnerUserId: string }) => {
       setTradeWith(data.partnerUserId);
       hideAlert();
    });

    newSocket.on("trade_declined", (data: { fromUserId?: string, message?: string }) => {
       showAlert({
          title: "Trade Declined",
          message: data.message || "The player declined your trade request.",
          type: 'error',
          onConfirm: hideAlert
       });
    });

    newSocket.on("trade_cancelled", (data: { message?: string }) => {
       setTradeWith(null);
       Toast.show({
          type: 'error',
          text1: 'Trade Cancelled',
          text2: data.message || 'The trade session was closed.',
       });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <SocketContext.Provider value={{ 
       socket, 
       connected, 
       onlineUserIds, 
       tradeWith, 
       setTradeWith, 
       requestTrade,
       alertConfig,
       hideAlert,
       showAlert
    }}>
      {children}
    </SocketContext.Provider>
  );
};
