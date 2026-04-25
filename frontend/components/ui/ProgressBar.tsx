import { View, Text } from "react-native";

interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  color?: "rose" | "indigo" | "emerald" | "amber" | "fuchsia";
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

  const getColorStyles = () => {
    switch (color) {
      case "rose": return "bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.6)]"; // Health/Vitality
      case "emerald": return "bg-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.6)]"; // Experience
      case "amber": return "bg-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.6)]"; // Energy
      case "fuchsia": return "bg-fuchsia-600 shadow-[0_0_15px_rgba(192,38,211,0.6)]"; // Magic
      default: return "bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.6)]";
    }
  };

  const getFrameColor = () => {
    switch (color) {
      case "rose": return "border-rose-900/50";
      case "amber": return "border-amber-900/50";
      default: return "border-slate-800";
    }
  };

  const getHeight = () => {
    switch (size) {
      case "xs": return "h-1";
      case "sm": return "h-2";
      case "lg": return "h-5";
      default: return "h-3";
    }
  };

  return (
    <View className={`w-full ${className}`}>
      {!hideLabel && (label || showValues) && (
        <View className="flex-row justify-between mb-2 px-1">
          {label && (
            <Text className="uppercase text-[9px] font-pixel-bold tracking-[2px] text-slate-400">
              {label}
            </Text>
          )}
          {showValues && (
            <Text className="text-slate-500 text-[9px] font-pixel-bold">
              {Math.floor(current)} / {max}
            </Text>
          )}
        </View>
      )}

      {/* 🏛️ ORNATE METAL FRAME */}
      <View className={`p-[2px] rounded-lg bg-slate-900 border ${getFrameColor()} shadow-2xl`}>
         <View className={`${getHeight()} bg-black/40 rounded-md overflow-hidden`}>
            {/* 🌠 GLOWING PROGRESS FILL */}
            <View 
              className={`h-full rounded-md ${getColorStyles()}`} 
              style={{ width: `${percentage}%` }} 
            >
               {/* 🕯️ TIP GLOW */}
               {percentage > 0 && (
                 <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(255,255,255,0.3)' }} />
               )}
            </View>
         </View>
      </View>
    </View>
  );
}
