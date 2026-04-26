import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withDelay,
  Easing
} from "react-native-reanimated";
import { useEffect, memo } from "react";

interface ItemIconProps {
  emoji: string;
  quantity?: number;
  isEquipped?: boolean;
  rarity?: string;
  size?: "sm" | "md" | "lg" | "full";
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
      case "full": return "w-full h-full";
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
      case "UNCOMMON": return { border: "border-emerald-600/40", bg: "bg-emerald-950/30" };
      case "RARE": return { border: "border-blue-600/50", bg: "bg-blue-950/30" };
      case "EPIC": return { border: "border-purple-600/60", bg: "bg-purple-950/40" };
      case "LEGENDARY": return { border: "border-amber-500", bg: "bg-amber-950/50" };
      case "MYTHICAL": return { border: "border-rose-600", bg: "bg-rose-950/60" };
      default: return { border: "border-slate-800", bg: "bg-slate-900/80" };
    }
  };

  const rStyles = getRarityStyles();
  
  // 🎇 SHINE ANIMATION LOGIC
  const shineX = useSharedValue(-100);
  
  useEffect(() => {
    const isRarePlus = ["RARE", "EPIC", "LEGENDARY", "MYTHICAL"].includes(rarity);
    if (!isRarePlus) return;

    let duration = 1500;
    let delay = 3000;

    if (rarity === "EPIC") delay = 2000;
    if (rarity === "LEGENDARY") { delay = 1000; duration = 1200; }
    if (rarity === "MYTHICAL") { delay = 500; duration = 1000; }

    shineX.value = withRepeat(
      withSequence(
        withTiming(150, { duration, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withDelay(delay, withTiming(-100, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [rarity, shineX]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineX.value }, { rotate: '25deg' }],
    opacity: rarity === "MYTHICAL" ? 0.6 : rarity === "LEGENDARY" ? 0.4 : 0.25,
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
      <View className={`${getContainerStyles()} border-2 ${rStyles.border} ${rStyles.bg} items-center justify-center rounded-lg overflow-hidden`}>
        
        {/* 🏛️ CORNER BRACKETS */}
        <View className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/20" />
        <View className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/20" />
        <View className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/20" />
        <View className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/20" />

        <Text className={getEmojiSize()}>{emoji}</Text>
        
        {isEquipped && (
          <View className="absolute -top-2 -right-2 bg-indigo-600 w-5 h-5 rounded-md items-center justify-center border border-indigo-400 z-10">
            <Ionicons name="shield-checkmark" size={10} color="white" />
          </View>
        )}

        {quantity && quantity > 1 && (
          <View className="absolute -bottom-1 -right-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-700 z-10">
             <Text className="text-[8px] text-amber-500 font-pixel-bold">{quantity}</Text>
          </View>
        )}

        {/* ✨ MMORPG SHINE EFFECT */}
        {["RARE", "EPIC", "LEGENDARY", "MYTHICAL"].includes(rarity) && (
          <Animated.View 
            style={[
              StyleSheet.absoluteFill,
              { width: '200%', height: '200%', top: '-50%', left: '-50%' },
              shineStyle
            ]}
          >
            <View className="w-8 h-full bg-white/40 blur-xl" />
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
});
