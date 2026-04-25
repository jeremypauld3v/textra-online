import "./global.css";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast, { BaseToast, ErrorToast, InfoToast } from "react-native-toast-message";
import React, { useEffect, memo } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useGameStore } from "../store/useGameStore";
import { SocketProvider, useSocket } from "../context/SocketContext";
import { CustomAlert } from "../components/CustomAlert";
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

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(tabs)/adventure");
    }
  }, [token, segments, router, navigationState?.key]);

  if (!navigationState?.key) return null;

  return <>{children}</>;
}

const RootLayoutNav = () => {
  return (
    <NavigationGuard>
      <SocketProvider>
        <Stack 
          screenOptions={{ 
            headerShown: false, 
            contentStyle: { backgroundColor: "#000000" } 
          }} 
        />
        <GlobalUI />
        <Toast config={toastConfig} />
      </SocketProvider>
    </NavigationGuard>
  );
};

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);
  const fetchMetadata = useGameStore((state) => state.fetchMetadata);

  useEffect(() => {
    hydrate();
    fetchMetadata();
  }, [hydrate, fetchMetadata]);

  useEffect(() => {
    if (!isLoadingSession) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingSession]);

  if (isLoadingSession) {
    return null;
  }

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <RootLayoutNav />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
