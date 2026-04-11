import { View, Text, TextInput } from "react-native";
import { useState } from "react";
import BaseModal from "./ui/BaseModal";
import StandardButton from "./ui/StandardButton";

interface QuantityTradeModalProps {
  visible: boolean;
  item: any;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

export default function QuantityTradeModal({ visible, item, onConfirm, onCancel }: QuantityTradeModalProps) {
  const [quantity, setQuantity] = useState("1");

  if (!item) return null;

  const max = item.quantity || 1;

  const handleConfirm = () => {
    const val = parseInt(quantity);
    if (isNaN(val) || val < 1) return;
    onConfirm(Math.min(val, max));
  };

  return (
    <BaseModal visible={visible} onClose={onCancel} showClose={false}>
      <View className="items-center mb-6">
        <View className="w-16 h-16 bg-slate-950 rounded-2xl items-center justify-center border border-slate-800 mb-4">
          <Text className="text-3xl">📦</Text>
        </View>
        <Text className="text-white text-xl font-black italic uppercase text-center">Set Quantity</Text>
        <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Max Available: {max}</Text>
      </View>

      <View className="flex-row items-center justify-between bg-black/20 p-4 rounded-3xl mb-8 border border-white/5">
        <StandardButton
          icon="remove"
          variant="secondary"
          className="w-12 h-12 rounded-xl"
          onPress={() => setQuantity((prev) => Math.max(1, parseInt(prev || "0") - 1).toString())}
        />

        <TextInput
          className="flex-1 text-center text-white text-3xl font-black italic"
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
          autoFocus
          selectTextOnFocus
        />

        <StandardButton
          icon="add"
          variant="primary"
          className="w-12 h-12 rounded-xl"
          onPress={() => setQuantity((prev) => Math.min(max, parseInt(prev || "0") + 1).toString())}
        />
      </View>

      <View className="flex-row space-x-3">
        <StandardButton label="Cancel" variant="secondary" className="flex-1" onPress={onCancel} />
        <StandardButton label="Confirm" variant="primary" className="flex-1" onPress={handleConfirm} />
      </View>
    </BaseModal>
  );
}
