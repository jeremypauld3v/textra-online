import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, FadeInDown, Easing } from "react-native-reanimated";

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: "center" | "bottom";
  className?: string;
  showClose?: boolean;
}

export default function BaseModal({
  visible,
  onClose,
  title,
  children,
  position = "center",
  className = "",
  showClose = true,
}: BaseModalProps) {
  const isBottom = position === "bottom";

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]}
        >
          <Pressable className="flex-1" onPress={onClose} />
        </Animated.View>

        <View className={`flex-1 ${isBottom ? "justify-end" : "justify-center px-6"}`} pointerEvents="box-none">
          <Animated.View
            entering={isBottom 
              ? SlideInDown.duration(300).easing(Easing.out(Easing.quad)) 
              : FadeInDown.duration(250).springify().damping(20)}
            exiting={isBottom 
              ? SlideOutDown.duration(200).easing(Easing.in(Easing.quad)) 
              : FadeOut.duration(200)}
            className={`bg-[#0a0a0a] border-white/10 ${
              isBottom 
                ? "rounded-t-3xl border-t p-6 pb-10" 
                : "rounded-2xl border p-6 w-full"
            } ${className}`}
          >
            <Pressable onPress={(e) => e.stopPropagation()} pointerEvents="box-none">
              {(title || showClose) && (
                <View className={`flex-row justify-between items-center ${title ? "mb-4" : "mb-2"}`}>
                    <Text className="text-lg text-white uppercase tracking-tight font-sans">
                      {title}
                    </Text>
                  {showClose && (
                    <Pressable 
                      onPress={onClose}
                      className="bg-white/10 p-2 rounded-full border border-white/10"
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </Pressable>
                  )}
                </View>
              )}

              <View>
                {children}
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
