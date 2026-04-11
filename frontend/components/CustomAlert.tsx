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
        return { name: "checkmark-circle", color: "#10b981", variant: "success" };
      case "warning":
        return { name: "alert-circle", color: "#f59e0b", variant: "warning" };
      case "error":
        return { name: "close-circle", color: "#ef4444", variant: "danger" };
      case "trade":
        return { name: "swap-horizontal", color: "#6366f1", variant: "primary" };
      default:
        return { name: "information-circle", color: "#3b82f6", variant: "primary" };
    }
  };

  const iconData = getIcon();

  return (
    <BaseModal visible={visible} onClose={onCancel || (() => {})} showClose={false}>
      <View className="items-center mb-6">
        <View className="w-16 h-16 rounded-2xl justify-center items-center mb-4" style={{ backgroundColor: iconData.color + "20" }}>
          <Ionicons name={iconData.name as any} size={32} color={iconData.color} />
        </View>

        <Text className="text-white text-xl font-black italic uppercase text-center">{title}</Text>
        <Text className="text-slate-500 text-sm text-center mt-2 leading-5 tracking-tight">{message}</Text>
      </View>

      <View className="flex-row space-x-3">
        {onCancel && <StandardButton label={cancelText} variant="secondary" className="flex-1" onPress={onCancel} />}
        <StandardButton label={confirmText} variant={iconData.variant as any} className="flex-1" onPress={onConfirm || (() => {})} />
      </View>
    </BaseModal>
  );
};
