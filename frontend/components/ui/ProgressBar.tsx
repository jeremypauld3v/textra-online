import { View, Text } from "react-native";

interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  color?: "rose" | "indigo" | "emerald" | "amber" | "fuchsia";
  size?: "sm" | "md" | "lg";
  showValues?: boolean;
  className?: string;
}

export default function ProgressBar({
  current,
  max,
  label,
  color = "indigo",
  size = "md",
  showValues = true,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));

  const getColorStyles = () => {
    switch (color) {
      case "rose": return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
      case "emerald": return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
      case "amber": return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
      case "fuchsia": return "bg-fuchsia-500 shadow-[0_0_8px_rgba(192,38,211,0.4)]";
      default: return "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]";
    }
  };

  const getHeight = () => {
    switch (size) {
      case "sm": return "h-1";
      case "lg": return "h-3";
      default: return "h-1.5";
    }
  };

  const getTextColor = () => {
    switch (color) {
      case "rose": return "text-rose-400";
      case "emerald": return "text-emerald-400";
      case "amber": return "text-amber-400";
      case "fuchsia": return "text-fuchsia-400";
      default: return "text-indigo-400";
    }
  };

  return (
    <View className={`w-full ${className}`}>
      {(label || showValues) && (
        <View className="flex-row justify-between mb-1.5 px-1">
          {label && (
            <Text className={`font-black uppercase text-[10px] tracking-widest ${getTextColor()} font-sans`}>
              {label}
            </Text>
          )}
          {showValues && (
            <Text className="text-slate-500 font-bold text-[9px] uppercase font-sans">
              {Math.floor(current)} / {max}
            </Text>
          )}
        </View>
      )}
      <View className={`${getHeight()} bg-slate-900 rounded-full overflow-hidden border border-slate-800/50`}>
        <View 
          className={`h-full rounded-full ${getColorStyles()}`} 
          style={{ width: `${percentage}%` }} 
        />
      </View>
    </View>
  );
}
