import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useEffect, memo } from "react";

interface ItemIconProps {
  emoji: string;
  quantity?: number;
  isEquipped?: boolean;
  rarity?: string;
  size?: "sm" | "md" | "lg";
  onPress?: () => void;
  className?: string;
}

export default memo(function ItemIcon({
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
      case "lg": return "w-20 h-20";
      case "md": return "w-16 h-16";
      default: return "w-14 h-14";
    }
  };

  const getEmojiSize = () => {
    switch (size) {
      case "lg": return "text-4xl";
      case "md": return "text-3xl";
      default: return "text-2xl";
    }
  };

  const getRarityStyles = () => {
    switch (rarity) {
      case "UNCOMMON": return { border: "border-emerald-600/40", glow: "shadow-emerald-500/20", bg: "bg-emerald-950/30" };
      case "RARE": return { border: "border-blue-600/50", glow: "shadow-blue-500/30", bg: "bg-blue-950/30" };
      case "EPIC": return { border: "border-purple-600/60", glow: "shadow-purple-500/40", bg: "bg-purple-950/40" };
      case "LEGENDARY": return { border: "border-amber-500", glow: "shadow-amber-500/50", bg: "bg-amber-950/50" };
      case "MYTHIC": return { border: "border-rose-600", glow: "shadow-rose-500/60", bg: "bg-rose-950/60" };
      default: return { border: "border-slate-800", glow: "shadow-transparent", bg: "bg-slate-900/80" };
    }
  };

  const rStyles = getRarityStyles();
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (["EPIC", "LEGENDARY", "MYTHIC"].includes(rarity)) {
      glowScale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 2000 }), withTiming(1, { duration: 2000 })),
        -1, true
      );
    } else {
      glowScale.value = 1;
    }
  }, [rarity, glowScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    shadowOpacity: rarity === "COMMON" ? 0 : 0.6,
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={className}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Animated.View style={animatedStyle}>
        <View className={`${getContainerStyles()} border-2 ${rStyles.border} ${rStyles.bg} items-center justify-center rounded-lg`}>
          
          {/* 🏛️ CORNER BRACKETS (Simulated) */}
          <View className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
          <View className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />
          <View className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20" />
          <View className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />

          <Text className={getEmojiSize()}>{emoji}</Text>
          
          {isEquipped && (
            <View className="absolute -top-2 -right-2 bg-indigo-600 w-6 h-6 rounded-md items-center justify-center border border-indigo-400">
              <Ionicons name="shield-checkmark" size={12} color="white" />
            </View>
          )}

          {quantity && quantity > 1 && (
            <View className="absolute -bottom-1 -right-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700">
               <Text className="text-[9px] text-amber-500 font-pixel-bold">{quantity}</Text>
            </View>
          )}

          {/* ⚔️ RARITY SHINE (Animated subtle overlay could go here) */}
          {["LEGENDARY", "MYTHIC"].includes(rarity) && (
            <View className="absolute inset-0 opacity-10 bg-white/20 rounded-lg" />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});
