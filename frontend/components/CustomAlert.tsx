import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BaseModal from "./ui/BaseModal";
import StandardButton from "./ui/StandardButton";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error" | "trade";
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({ visible, title, message, type = "info", onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel" }) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return { name: "checkmark-circle", color: "#ffffff" };
      case "warning":
        return { name: "alert-circle", color: "#ffffff" };
      case "error":
        return { name: "close-circle", color: "rgba(255,255,255,0.4)" };
      case "trade":
        return { name: "swap-horizontal", color: "#ffffff" };
      default:
        return { name: "information-circle", color: "#ffffff" };
    }
  };

  const iconData = getIcon();

  return (
    <BaseModal visible={visible} onClose={onCancel || (() => {})} showClose={false}>
      <View className="items-center mb-6">
        <View className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl justify-center items-center mb-4">
          <Ionicons name={iconData.name as any} size={24} color={iconData.color} />
        </View>

        <Text className="text-white text-lg uppercase text-center font-pixel-bold">{title}</Text>
        <Text className="text-white/40 text-xs text-center mt-2 leading-4 tracking-tight font-sans">{message}</Text>
      </View>

      <View className="flex-row space-x-3">
        {onCancel && <StandardButton label={cancelText} variant="secondary" className="flex-1" onPress={onCancel} />}
        <StandardButton label={confirmText} variant="primary" className="flex-1" onPress={onConfirm || (() => {})} />
      </View>
    </BaseModal>
  );
};
