import { Redirect } from "expo-router";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const token = useAuthStore((state) => state.token);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isLoadingSession) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // Redirect to Adventure screen if logged in, else login screen
  return token ? <Redirect href="/(tabs)/adventure" /> : <Redirect href="/(auth)/login" />;
}
