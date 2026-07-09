import "./global.css";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast, { BaseToast, ErrorToast, InfoToast } from "react-native-toast-message";
import React, { useEffect } from "react";
import { StatusBar, ActivityIndicator, View } from "react-native";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { useFonts } from "expo-font";
import { Silkscreen_400Regular, Silkscreen_700Bold } from "@expo-google-fonts/silkscreen";
import { useAuthStore } from "../store/useAuthStore";
import { useGameStore } from "../store/useGameStore";
import { useCharacterStore } from "../store/useCharacterStore";
import { SocketProvider, useSocket } from "../context/SocketContext";
import { CustomAlert } from "../components/CustomAlert";
import * as SplashScreen from "expo-splash-screen";

// Suppress Reanimated strict-mode warnings about shared value access during render
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

SplashScreen.preventAutoHideAsync();

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#ffffff', borderLeftWidth: 3, backgroundColor: '#050505', borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)', height: 'auto', minHeight: 50, paddingVertical: 8 }}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      text1Style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}
      text2Style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}
      text2NumberOfLines={0}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: 'rgba(255,255,255,0.25)', borderLeftWidth: 3, backgroundColor: '#050505', borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)', height: 'auto', minHeight: 50, paddingVertical: 8 }}
      text1Style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}
      text2Style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}
      text2NumberOfLines={0}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{ borderLeftColor: 'rgba(255,255,255,0.6)', borderLeftWidth: 3, backgroundColor: '#050505', borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)', height: 'auto', minHeight: 50, paddingVertical: 8 }}
      text1Style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}
      text2Style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}
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

function StatusPoller() {
  const token = useAuthStore((state) => state.token);
  const fetchStatus = useCharacterStore((state) => state.fetchStatus);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000); // Poll every 5 seconds for encounters
    return () => clearInterval(interval);
  }, [token, fetchStatus]);

  return null;
}

const RootLayoutNav = () => {
  return (
    <SocketProvider>
      <StatusPoller />
      <Stack 
        screenOptions={{ 
          headerShown: false, 
          contentStyle: { backgroundColor: "#000000" },
          animation: 'fade_from_bottom',
          animationDuration: 200,
        }} 
      />
      <GlobalUI />
    </SocketProvider>
  );
};

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);
  const fetchMetadata = useGameStore((state) => state.fetchMetadata);

  const [fontsLoaded] = useFonts({
    'Silkscreen': Silkscreen_400Regular,
    'Silkscreen-Bold': Silkscreen_700Bold,
  });

  useEffect(() => {
    hydrate();
    fetchMetadata();
  }, [hydrate, fetchMetadata]);

  useEffect(() => {
    if (!isLoadingSession && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingSession, fontsLoaded]);

  if (isLoadingSession || !fontsLoaded) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator color="#A78BFA" size="large" />
      </View>
    );
  }

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <StatusBar hidden />
        <NavigationGuard>
          <RootLayoutNav />
        </NavigationGuard>
        <Toast config={toastConfig} autoHide={true} visibilityTime={3000} />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
