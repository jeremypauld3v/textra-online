import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type StatType = "atk" | "def" | "str" | "agi" | "exp" | "hp" | "gold" | "points" | "level" | "luck" | "int" | "dex";

interface StatBadgeProps {
  label?: string;
  value: string | number;
  type: StatType;
  showIcon?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md";
}

export default function StatBadge({
  label,
  value,
  type,
  showIcon = true,
  className = "",
  size = "sm",
}: StatBadgeProps) {
  const getTheme = () => {
    switch (type) {
      case "atk": return { color: "#fb7185", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: "flash" };
      case "def": return { color: "#34d399", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "shield" };
      case "str": return { color: "#fbbf24", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "fitness" };
      case "agi": return { color: "#60a5fa", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "speedometer" };
      case "dex": return { color: "#4ade80", bg: "bg-green-500/10", border: "border-green-500/20", icon: "locate" };
      case "int": return { color: "#a78bfa", bg: "bg-violet-500/10", border: "border-violet-500/20", icon: "book" };
      case "luck": return { color: "#f472b6", bg: "bg-pink-500/10", border: "border-pink-500/20", icon: "sparkles" };
      case "gold": return { color: "#fbbf24", bg: "bg-amber-600/10", border: "border-amber-500/20", icon: "cash" };
      case "points": return { color: "#818cf8", bg: "bg-indigo-500/10", border: "border-indigo-500/20", icon: "star" };
      case "exp": return { color: "#6366f1", bg: "bg-indigo-600/10", border: "border-indigo-500/20", icon: "trending-up" };
      case "hp": return { color: "#f43f5e", bg: "bg-rose-600/10", border: "border-rose-500/20", icon: "heart" };
      case "level": return { color: "#ffffff", bg: "bg-indigo-600", border: "border-indigo-400", icon: "ribbon" };
      default: return { color: "#94a3b8", bg: "bg-slate-800/10", border: "border-slate-700/20", icon: "help" };
    }
  };

  const theme = getTheme();

  return (
    <View 
      className={`flex-row items-center border rounded-xl px-2.5 py-1 ${theme.bg} ${theme.border} ${className || ""}`}
    >
      {showIcon && (
        <Ionicons 
          name={theme.icon as any} 
          size={size === "xs" ? 8 : size === "sm" ? 10 : 12} 
          color={theme.color} 
          style={{ marginRight: 4 }} 
        />
      )}
      <View>
        <Text className="font-bold text-white text-[9px] uppercase leading-tight font-sans" style={{ color: theme.color }}>
          {typeof value === 'number' && value > 0 && type !== 'gold' && type !== 'level' ? `+${value}` : value}
          {label && <Text className="text-slate-500 ml-1 font-sans"> {label}</Text>}
        </Text>
      </View>
    </View>
  );
}
