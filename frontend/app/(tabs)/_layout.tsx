import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopWidth: 1,
          borderTopColor: "#111111",
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          height: Platform.OS === "ios" ? 85 + insets.bottom : 65 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#555555",
        tabBarLabelStyle: {
          fontFamily: "Silkscreen-Regular",
          fontSize: 9,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="adventure"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: "Hero",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Bag",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Market",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="crafting"
        options={{
          title: "Forge",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hammer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Social",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
