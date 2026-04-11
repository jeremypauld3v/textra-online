import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ItemIconProps {
  emoji: string;
  quantity?: number;
  isEquipped?: boolean;
  rarity?: string;
  size?: "sm" | "md" | "lg";
  onPress?: () => void;
  className?: string;
}

export default function ItemIcon({
  emoji,
  quantity,
  isEquipped = false,
  rarity = "COMMON",
  size = "md",
  onPress,
  className = "",
}: ItemIconProps) {
  const getContainerStyles = () => {
    switch (size) {
      case "lg": return "w-20 h-20 rounded-[32px]";
      case "md": return "w-16 h-16 rounded-[28px]";
      default: return "w-14 h-14 rounded-[24px]";
    }
  };

  const getEmojiSize = () => {
    switch (size) {
      case "lg": return "text-4xl";
      case "md": return "text-3xl";
      default: return "text-2xl";
    }
  };

  const getRarityBorder = () => {
    if (isEquipped) return "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20";
    switch (rarity) {
      case "RARE": return "border-amber-500/40 bg-amber-500/5";
      case "UNCOMMON": return "border-emerald-500/40 bg-emerald-500/5";
      case "EPIC": return "border-purple-500/40 bg-purple-500/5";
      case "LEGENDARY": return "border-orange-500/40 bg-orange-500/5";
      case "MYTHIC": return "border-rose-500/40 bg-rose-500/5";
      default: return "border-slate-800 bg-slate-900";
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      className={`${getContainerStyles()} border items-center justify-center ${getRarityBorder()} ${className || ""}`}
    >
      <Text className={getEmojiSize()}>{emoji}</Text>
      
      {isEquipped && (
        <View className="absolute -top-1.5 -right-1.5 bg-indigo-500 w-5 h-5 rounded-full items-center justify-center border-2 border-slate-950">
          <Ionicons name="checkmark" size={10} color="white" />
        </View>
      )}

      {quantity && quantity > 1 && (
        <View className="absolute bottom-1 right-1 bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-700">
          <Text className="text-[8px] font-bold text-white font-sans">{quantity}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
