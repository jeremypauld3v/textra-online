import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

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
  hasPendingRequest: boolean;
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
  hasPendingRequest: false,
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
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
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
     if (hasPendingRequest) {
        Toast.show({ type: 'error', text1: 'Trade Pending', text2: 'You already have an active trade request.' });
        return;
     }
     socket.emit("trade_request", targetUserId);
     setHasPendingRequest(true);
     Toast.show({
        type: 'info',
        text1: 'Trade Request Sent',
        text2: 'Waiting for response (10s)...',
     });
  }, [socket, currentUserId, hasPendingRequest]);

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
      setHasPendingRequest(false);
    });

    newSocket.on('presence_update', (data: { onlineUserIds: string[] }) => {
      setOnlineUserIds(data.onlineUserIds);
    });

    // --- GLOBAL TRADE LISTENERS ---
    newSocket.on("trade_invite", (data: { fromUserId: string, fromName: string }) => {
       showAlert({
          title: "⚔️ Trade Invitation",
          message: `${data.fromName} wants to trade with you!\nThis request expires in 10s.`,
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
       setHasPendingRequest(false);
       setTradeWith(data.partnerUserId); // store partner ID so trade.tsx can read it
       hideAlert();
       // Navigate to dedicated trade screen (avoids NavigationContainer issues from inside a Modal)
       router.push('/trade');
    });

    newSocket.on("trade_declined", (data: { fromUserId?: string, message?: string }) => {
       setHasPendingRequest(false);
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

    // ⏰ Trade request expired (from backend 10s timeout)
    newSocket.on("trade_expired", (data: { message?: string }) => {
       setHasPendingRequest(false);
       hideAlert(); // Close invite modal if shown on receiver side
       Toast.show({
          type: 'info',
          text1: 'Trade Request Expired',
          text2: data.message || 'The trade invitation timed out.',
       });
    });

    // 🚫 Trade request blocked (already pending/busy)
    newSocket.on("trade_request_blocked", (data: { message?: string }) => {
       setHasPendingRequest(false);
       Toast.show({
          type: 'error',
          text1: 'Request Blocked',
          text2: data.message || 'Your trade request was blocked.',
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
       hasPendingRequest,
       alertConfig,
       hideAlert,
       showAlert
    }}>
      {children}
    </SocketContext.Provider>
  );
};
