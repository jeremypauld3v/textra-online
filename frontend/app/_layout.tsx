import "./global.css";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast, { BaseToast, ErrorToast, InfoToast } from "react-native-toast-message";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useGameStore } from "../store/useGameStore";
import { SocketProvider, useSocket } from "../context/SocketContext";
import { CustomAlert } from "../components/CustomAlert";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10b981', backgroundColor: '#000', height: 'auto', minHeight: 60, paddingVertical: 10 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}
      text2Style={{ color: '#94a3b8', fontSize: 13 }}
      text2NumberOfLines={0}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#ef4444', backgroundColor: '#000', height: 'auto', minHeight: 60, paddingVertical: 10 }}
      text1Style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}
      text2Style={{ color: '#94a3b8', fontSize: 13 }}
      text2NumberOfLines={0}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{ borderLeftColor: '#6366f1', backgroundColor: '#000', height: 'auto', minHeight: 60, paddingVertical: 10 }}
      text1Style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}
      text2Style={{ color: '#94a3b8', fontSize: 13 }}
      text2NumberOfLines={0}
    />
  )
};

function GlobalUI() {
  const { alertConfig } = useSocket();

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
    </>
  );
}

export default function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const hydrate = useAuthStore((state) => state.hydrate);
  const fetchMetadata = useGameStore((state) => state.fetchMetadata);
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  const [fontsLoaded] = useFonts({
    "Silkscreen-Regular": require("../assets/fonts/Silkscreen-Regular.ttf"),
    "Silkscreen-Bold": require("../assets/fonts/Silkscreen-Bold.ttf"),
  });

  useEffect(() => {
    hydrate();
    fetchMetadata();
  }, [hydrate, fetchMetadata]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // If navigation isn't ready, don't try to redirect yet
    if (!rootNavigationState?.key) return;

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
  }, [token, segments, router, rootNavigationState?.key]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SocketProvider>
        <Stack screenOptions={{ 
            headerShown: false, 
            contentStyle: { backgroundColor: "#000000" } 
        }} />
        <GlobalUI />
        <Toast config={toastConfig} />
      </SocketProvider>
    </SafeAreaProvider>
  );
}
