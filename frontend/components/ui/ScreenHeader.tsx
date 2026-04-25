import { View, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

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
    <Animated.View entering={FadeIn.duration(400)} className={`flex-row justify-between items-center mb-6 ${className}`}>
      <View className="flex-1">
        {subtitle && (
          <Text className="text-slate-500 uppercase text-[8px] tracking-wider mb-0.5 font-pixel-bold">
            {subtitle}
          </Text>
        )}
        <Text className="text-2xl text-white uppercase tracking-normal font-pixel-bold">
          {title}
        </Text>
      </View>
      
      <View className="flex-row items-center">
        {badge && (
          <View className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 mr-3">
            <Text className="text-white text-xs font-pixel-bold">{badge}</Text>
          </View>
        )}
        {rightElement}
      </View>
    </Animated.View>
  );
}
