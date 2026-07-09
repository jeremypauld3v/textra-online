import { View, Text } from "react-native";

interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  color?: "rose" | "indigo" | "emerald" | "amber" | "fuchsia" | "mystic" | "gold" | "verdant" | "crimson";
  size?: "xs" | "sm" | "md" | "lg";
  showValues?: boolean;
  hideLabel?: boolean;
  className?: string;
}

export default function ProgressBar({
  current,
  max,
  label,
  color = "indigo",
  size = "md",
  showValues = true,
  hideLabel = false,
  className = "",
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  const getHeight = () => {
    switch (size) {
      case "xs": return "h-[2px]";
      case "sm": return "h-1";
      case "lg": return "h-4";
      default: return "h-2";
    }
  };

  const getColorStyles = () => {
    switch (color) {
      case "rose": return "bg-rose-500";
      case "emerald": return "bg-emerald-500";
      case "amber": return "bg-amber-500";
      case "fuchsia": return "bg-fuchsia-500";
      case "mystic": return "bg-mystic";
      case "gold": return "bg-gold";
      case "verdant": return "bg-verdant";
      case "crimson": return "bg-crimson";
      default: return "bg-white";
    }
  };

  return (
    <View className={`w-full ${className}`}>
      {!hideLabel && (label || showValues) && (
        <View className="flex-row justify-between mb-1.5 px-0.5">
          {label && (
            <Text className="uppercase text-[8px] font-pixel-bold tracking-[2px] text-white/30">
              {label}
            </Text>
          )}
          {showValues && (
            <Text className="text-white/25 text-[8px] font-pixel-bold">
              {Math.floor(current)} / {max}
            </Text>
          )}
        </View>
      )}

      <View className={`${getHeight()} bg-white/[0.08] rounded-full overflow-hidden`}>
        <View 
          className={`h-full rounded-full ${getColorStyles()}`}
          style={{ width: `${percentage}%` }} 
        />
      </View>
    </View>
  );
}
