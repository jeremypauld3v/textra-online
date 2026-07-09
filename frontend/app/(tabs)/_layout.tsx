import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSocialStore } from "../../store/useSocialStore";
import { useCharacterStore } from "../../store/useCharacterStore";

export default function TabsLayout() {
  const hasSocialNotification = useSocialStore((state) => state.hasUnreadWhispers || state.hasFriendRequest);
  const statPoints = useCharacterStore((state) => state.character?.statPoints ?? 0);
  const hasPendingEncounter = useCharacterStore((state) => !!state.character?.pendingEncounter);
  const screensaverActive = useCharacterStore((state) => state.screensaverActive);
  
  const NotificationDot = () => (
    <View 
      style={{ position: 'absolute', right: -4, top: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: '#000' }}
    />
  );
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          display: screensaverActive ? 'none' : 'flex',
          backgroundColor: "#000000",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.06)",
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === "ios" ? 82 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
        },
        tabBarActiveTintColor: "#A78BFA",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.15)",
      }}
    >
      <Tabs.Screen
        name="adventure"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons name={focused ? "compass" : "compass-outline"} size={24} color={color} />
              {hasPendingEncounter && !focused && <NotificationDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
              {statPoints > 0 && <NotificationDot />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="crafting"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "hammer" : "hammer-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cart" : "cart-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
              {hasSocialNotification && <NotificationDot />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
