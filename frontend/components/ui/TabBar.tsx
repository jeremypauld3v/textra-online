import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from 'react-native-reanimated';

interface TabBarProps<T extends string> {
  tabs: T[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
  badgeCounts?: Partial<Record<T, number | boolean>>;
}

const PulsingShadow = ({ side }: { side: 'left' | 'right' }) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        animatedStyle,
        {
          position: 'absolute',
          [side]: 0,
          top: 0,
          bottom: 0,
          width: 40,
          zIndex: 10,
        }
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={side === 'left' ? ['rgba(2, 6, 23, 0.95)', 'transparent'] : ['transparent', 'rgba(2, 6, 23, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
};

const TabBar = <T extends string>({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className = "",
  badgeCounts = {}
}: TabBarProps<T>) => {
  const [scrollInfo, setScrollInfo] = useState({
    contentOffsetX: 0,
    contentWidth: 0,
    layoutWidth: 0,
  });

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    setScrollInfo(prev => ({
      ...prev,
      contentOffsetX: offsetX,
    }));
  };

  const showRightIndicator = scrollInfo.contentWidth > scrollInfo.layoutWidth && 
    scrollInfo.contentOffsetX + scrollInfo.layoutWidth < scrollInfo.contentWidth - 10;
  
  const showLeftIndicator = scrollInfo.contentOffsetX > 10;

  return (
    <View className={`h-12 bg-slate-900/40 p-1 rounded-2xl border border-white/5 relative overflow-hidden ${className}`}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        className="w-full"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setScrollInfo(prev => ({ ...prev, layoutWidth: e.nativeEvent.layout.width }))}
        onContentSizeChange={(w) => setScrollInfo(prev => ({ ...prev, contentWidth: w }))}
      >
        <View className="flex-1 flex-row items-center px-1">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab;
            const badge = badgeCounts[tab];
            
            return (
              <Pressable 
                key={tab} 
                onPress={() => onTabChange(tab)}
                className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border relative ${isActive ? "bg-slate-800 border-white/10" : "border-transparent"}`}
                style={{ 
                  marginLeft: index === 0 ? 0 : 4,
                  minWidth: tabs.length > 3 ? 100 : 0,
                }}
              >
                <Text 
                  numberOfLines={1}
                  className={`text-[8px] font-pixel-bold uppercase tracking-[1px] text-center ${isActive ? "text-white" : "text-slate-600"}`}
                >
                  {tab}
                </Text>
                
                {badge && (
                  <View 
                    className={`ml-2 rounded-full border border-[#020617] ${typeof badge === 'number' ? 'px-1 min-w-[12px] h-3 items-center justify-center bg-rose-500' : 'w-2 h-2 bg-rose-500'}`}
                  >
                    {typeof badge === 'number' && (
                      <Text className="text-[6px] text-white font-pixel-bold">{badge}</Text>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* 🌑 SHADOW HINTS (PULSING FADING EDGES) */}
      {showLeftIndicator && <PulsingShadow side="left" />}
      {showRightIndicator && <PulsingShadow side="right" />}
    </View>
  );
};

export default TabBar;
