import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSocialStore } from "../../store/useSocialStore";

export default function TabsLayout() {
  const hasSocialNotification = useSocialStore((state) => state.hasUnreadWhispers || state.hasFriendRequest);
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#020617",
          borderTopWidth: 1,
          borderTopColor: "rgba(251, 191, 36, 0.05)", // Subtle gold top border
          elevation: 20,
          shadowOpacity: 0.5,
          shadowRadius: 15,
          shadowColor: "#000",
          height: Platform.OS === "ios" ? 88 : 72,
          paddingBottom: Platform.OS === "ios" ? 32 : 12,
        },
        tabBarActiveTintColor: "#fbbf24", // Ancient Gold
        tabBarInactiveTintColor: "#475569", // Muted Slate
      }}
    >
      <Tabs.Screen
        name="adventure"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="crafting"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "hammer" : "hammer-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cart" : "cart-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={{ position: 'relative' }}>
              <Ionicons name={focused ? "people" : "people-outline"} size={26} color={color} />
              {hasSocialNotification && (
                <View 
                  style={{ position: 'absolute', right: -4, top: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e', borderWidth: 2, borderColor: '#020617' }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
