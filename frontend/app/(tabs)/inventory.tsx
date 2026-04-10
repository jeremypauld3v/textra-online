import { View, Text } from "react-native";

export default function InventoryScreen() {
  return (
    <View className="flex-1 bg-slate-950 justify-center items-center px-6">
      <Text className="text-3xl font-black text-indigo-400 mb-2 font-serif">Inventory</Text>
      <Text className="text-slate-400 text-center">Your gathered materials, consumables, and gear will be organized here.</Text>
    </View>
  );
}
