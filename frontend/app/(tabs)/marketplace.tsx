import { View, Text } from "react-native";

export default function MarketplaceScreen() {
  return (
    <View className="flex-1 bg-slate-950 px-6 pt-16">
      <Text className="text-3xl font-black text-amber-500 mb-2 font-serif">Marketplace</Text>
      <Text className="text-slate-400 mb-8">Asynchronous player-driven economy. Buy and sell your RNG-crafted gear here.</Text>
    </View>
  );
}
