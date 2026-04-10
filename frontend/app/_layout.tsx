import "./global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast, { BaseToast, ErrorToast, InfoToast } from "react-native-toast-message";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useGameStore } from "../store/useGameStore";
import { SocketProvider, useSocket } from "../context/SocketContext";
import { CustomAlert } from "../components/CustomAlert";
import DirectTradeModal from "../components/DirectTradeModal";

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10b981', backgroundColor: '#1e293b', height: 70 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}
      text2Style={{ color: '#94a3b8', fontSize: 14 }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#ef4444', backgroundColor: '#1e293b', height: 70 }}
      text1Style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}
      text2Style={{ color: '#94a3b8', fontSize: 14 }}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{ borderLeftColor: '#6366f1', backgroundColor: '#1e293b', height: 70 }}
      text1Style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}
      text2Style={{ color: '#94a3b8', fontSize: 14 }}
    />
  )
};

function GlobalUI() {
  const { tradeWith, setTradeWith, alertConfig } = useSocket();

  return (
    <>
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
      {tradeWith && (
        <DirectTradeModal 
          visible={!!tradeWith}
          targetUserId={tradeWith}
          onClose={() => setTradeWith(null)}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const hydrate = useAuthStore((state) => state.hydrate);
  const fetchMetadata = useGameStore((state) => state.fetchMetadata);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
    fetchMetadata();
  }, [hydrate, fetchMetadata]);

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      const timer = setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1);
      return () => clearTimeout(timer);
    } else if (token && inAuthGroup) {
      const timer = setTimeout(() => {
        router.replace("/(tabs)/adventure");
      }, 1);
      return () => clearTimeout(timer);
    }
  }, [token, segments, router]);

  return (
    <SafeAreaProvider>
      <SocketProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <GlobalUI />
        <Toast config={toastConfig} />
      </SocketProvider>
    </SafeAreaProvider>
  );
}
