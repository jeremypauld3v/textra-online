import { Modal, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isBottom ? "slide" : "fade"}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className={`flex-1 bg-black/80 ${isBottom ? "justify-end" : "justify-center px-6"}`}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className={`bg-slate-900 border-slate-800 ${
            isBottom 
              ? "rounded-t-[40px] border-t p-6 pb-10" 
              : "rounded-[32px] border p-6 w-full"
          } ${className}`}
        >
          {(title || showClose) && (
            <View className={`flex-row justify-between items-center ${title ? "mb-4" : "mb-2"}`}>
                <Text className="text-xl text-white uppercase tracking-tight font-sans">
                  {title}
                </Text>
              {showClose && (
                <Pressable 
                  onPress={onClose}
                  className="bg-slate-800 p-2 rounded-full border border-slate-700"
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
      </Pressable>
    </Modal>
  );
}
