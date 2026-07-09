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

const STAT_ICONS: Record<string, string> = {
  atk: "flash",
  def: "shield",
  str: "fitness",
  agi: "speedometer",
  dex: "locate",
  int: "book",
  luck: "sparkles",
  gold: "cash",
  points: "star",
  exp: "trending-up",
  hp: "heart",
  level: "ribbon",
};

export default function StatBadge({
  label,
  value,
  type,
  showIcon = true,
  className = "",
  size = "sm",
}: StatBadgeProps) {
  const icon = STAT_ICONS[type] || "help";

  return (
    <View 
      className={`flex-row items-center border rounded-lg px-2.5 py-1 bg-white/[0.06] border-white/10 ${className || ""}`}
    >
      {showIcon && (
        <Ionicons 
          name={icon as any} 
          size={size === "xs" ? 8 : size === "sm" ? 10 : 12} 
          color="rgba(255,255,255,0.5)" 
          style={{ marginRight: 4 }} 
        />
      )}
      <View>
        <Text className="text-white/70 text-[9px] uppercase leading-tight font-sans">
          {typeof value === 'number' && value > 0 && type !== 'gold' && type !== 'level' ? `+${value}` : value}
          {label && <Text className="text-white/30 ml-1 font-sans"> {label}</Text>}
        </Text>
      </View>
    </View>
  );
}
