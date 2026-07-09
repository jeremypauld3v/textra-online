import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';
import { useCharacterStore } from '../store/useCharacterStore';
import Toast from 'react-native-toast-message';
import { router, useRootNavigationState } from 'expo-router';
import Constants from 'expo-constants';

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

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
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
  const navigationState = useRootNavigationState();
  const navStateRef = useRef(navigationState);

  useEffect(() => {
    navStateRef.current = navigationState;
  }, [navigationState]);

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

    const hostUri = Constants.expoConfig?.hostUri;
    const hostIp = hostUri ? hostUri.split(":")[0] : "localhost";
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || `http://${hostIp}:3000`;
    const newSocket = io(apiUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    });

    newSocket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err.message);
      if (err.message.includes('banned')) {
        showAlert({
          title: 'Account Banned',
          message: err.message,
          type: 'error',
          onConfirm: () => {
            hideAlert();
            useAuthStore.getState().logout();
          },
        });
      } else if (err.message.includes('Authentication error')) {
        useAuthStore.getState().logout();
      }
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
       if (navStateRef.current?.key) {
         router.push('/trade');
       }
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

    newSocket.on("friend_request_received", (data: { fromName: string, fromUserId: string }) => {
       useSocialStore.getState().setHasFriendRequest(true);
    });

    newSocket.on('character_updated', (data: any) => {
       console.log('🔄 Real-time character update received via socket');
       useCharacterStore.getState().setCharacter(data.character);
       useCharacterStore.getState().setBattleLogs(data.latestBattles);
    });

    newSocket.on("banned", (data: { reason?: string }) => {
      showAlert({
        title: 'You have been banned',
        message: data.reason || 'An admin has banned your account.',
        type: 'error',
        onConfirm: () => {
          hideAlert();
          useAuthStore.getState().logout();
        },
      });
    });

    newSocket.on("chat_message", (msg: any) => {
       if (msg.channel === "whispers") {
          // If we are the recipient and not currently viewing this chat in SocialScreen, mark as unread
          // Note: Since SocketContext doesn't know the current active tab easily without more state,
          // we'll set it to true, and SocialScreen will clear it if active.
          useSocialStore.getState().setHasUnreadWhispers(true);
       }
       if (msg.senderId === "SYSTEM" || msg.senderName === "[SYSTEM]") {
          Toast.show({
             type: 'info',
             text1: '🔔 SYSTEM ANNOUNCEMENT',
             text2: msg.message,
             visibilityTime: 6000
          });
       }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = React.useMemo(() => ({
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
  }), [socket, connected, onlineUserIds, tradeWith, requestTrade, hasPendingRequest, alertConfig, hideAlert, showAlert]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
