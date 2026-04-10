import "./global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useGameStore } from "../store/useGameStore";
import { SocketProvider } from "../context/SocketContext";

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
      // If we're not logged in and not in the auth group, redirect to login
      // Wrap in timeout to ensure navigation bridge is ready
      const timer = setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1);
      return () => clearTimeout(timer);
    } else if (token && inAuthGroup) {
      // If we are logged in but in the auth group, redirect to the adventure tab
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
        <Toast />
      </SocketProvider>
    </SafeAreaProvider>
  );
}
