import { View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  rightElement?: React.ReactNode;
  className?: string;
}

export default function ScreenHeader({
  title,
  subtitle,
  badge,
  rightElement,
  className = "",
}: ScreenHeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(350)} className={`flex-row justify-between items-center mb-4 ${className}`}>
      <View className="flex-1">
        {subtitle && (
          <Text className="text-white/30 uppercase text-[8px] tracking-[3px] mb-0.5 font-pixel-bold">
            {subtitle}
          </Text>
        )}
        <Text className="text-xl text-white uppercase tracking-normal font-pixel-bold">
          {title}
        </Text>
      </View>
      
      <View className="flex-row items-center">
        {badge && (
          <View className="bg-white/[0.06] px-3 py-1.5 rounded-xl border border-white/[0.08] mr-3">
            <Text className="text-white/60 text-xs font-pixel-bold">{badge}</Text>
          </View>
        )}
        {rightElement}
      </View>
    </Animated.View>
  );
}
