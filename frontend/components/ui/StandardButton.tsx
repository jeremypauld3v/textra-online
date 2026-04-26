import { Pressable, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export type ButtonVariant = "primary" | "success" | "danger" | "warning" | "secondary" | "outline" | "ghost";

interface StandardButtonProps {
  label?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function StandardButton({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  className = "",
  size = "md",
}: StandardButtonProps) {
  const scale = useSharedValue(1);

  const getVariantStyles = () => {
    switch (variant) {
      case "primary": return "bg-white border-white";
      case "success": return "bg-emerald-600 border-emerald-500";
      case "danger": return "bg-rose-600 border-rose-500";
      case "warning": return "bg-amber-600 border-amber-500";
      case "secondary": return "bg-slate-800 border-slate-700";
      case "outline": return "bg-transparent border-white";
      case "ghost": return "bg-transparent border-transparent";
      default: return "bg-white border-white";
    }
  };

  const getLabelStyles = () => {
    if (variant === "primary") return "text-black";
    if (variant === "outline") return "text-white";
    if (variant === "ghost") return "text-slate-400";
    return "text-white";
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm": return "py-2 px-4 rounded-xl";
      case "lg": return "py-5 px-8 rounded-[24px]";
      default: return "py-3 px-6 rounded-2xl";
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const getWrapperStyles = () => {
    const styles = [];
    if (className.includes("flex-1")) styles.push("flex-1");
    if (className.includes("w-full")) styles.push("w-full");
    if (className.includes("w-")) {
        const wClass = className.split(" ").find(c => c.startsWith("w-"));
        if (wClass) styles.push(wClass);
    }
    return styles.join(" ");
  };

  return (
    <Animated.View style={animatedStyle} className={getWrapperStyles()}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        className={`flex-row items-center justify-center border ${getVariantStyles()} ${getSizeStyles()} ${disabled ? "opacity-40" : ""} ${className}`}
        style={({ pressed }) => ({
          elevation: variant === "ghost" ? 0 : 2
        })}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variant === "primary" ? "#000000" : "#FFFFFF"} />
        ) : (
          <>
            {icon && (
              <Ionicons 
                name={icon} 
                size={size === "sm" ? 14 : 18} 
                color={variant === "primary" ? "#000000" : "white"} 
                style={label ? { marginRight: 8 } : {}} 
              />
            )}
            {label && (
              <Text className={`uppercase tracking-wider font-pixel-bold text-center leading-none ${size === "sm" ? "text-[8px]" : "text-[9px]"} ${getLabelStyles()}`}>
                {label}
              </Text>
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
