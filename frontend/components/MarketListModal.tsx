import { View, Text, TextInput } from "react-native";
import { useState } from "react";
import BaseModal from "./ui/BaseModal";
import StandardButton from "./ui/StandardButton";

interface MarketListModalProps {
  visible: boolean;
  item: any;
  onConfirm: (quantity: number, price: number) => void;
  onCancel: () => void;
}

export default function MarketListModal({ visible, item, onConfirm, onCancel }: MarketListModalProps) {
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("10");

  if (!item) return null;

  const max = item.quantity || 1;

  const handleConfirm = () => {
    const q = parseInt(quantity);
    const p = parseInt(price);
    if (isNaN(q) || q < 1) return;
    if (isNaN(p) || p < 1) return;
    onConfirm(Math.min(q, max), p);
  };

  return (
    <BaseModal visible={visible} onClose={onCancel} showClose={false} title="MARKET LISTING">
      <View className="items-center mb-6">
        <Text className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">Available: {max}</Text>
      </View>

      <View className="space-y-6">
        <View>
          <Text className="text-slate-400 text-[10px] uppercase font-pixel-bold mb-2 ml-2">Quantity</Text>
          <View className="flex-row items-center justify-between bg-black/20 p-2 rounded-2xl border border-white/5">
            <StandardButton
              icon="remove"
              variant="secondary"
              size="sm"
              className="w-10 h-10 rounded-xl p-0"
              onPress={() => setQuantity((prev) => Math.max(1, parseInt(prev || "0") - 1).toString())}
            />
            <TextInput
              className="flex-1 text-center text-white text-xl font-pixel-bold"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
            <StandardButton
              icon="add"
              variant="secondary"
              size="sm"
              className="w-10 h-10 rounded-xl p-0"
              onPress={() => setQuantity((prev) => Math.min(max, parseInt(prev || "0") + 1).toString())}
            />
          </View>
        </View>

        <View>
          <Text className="text-slate-400 text-[10px] uppercase font-pixel-bold mb-2 ml-2">Price (Gold per unit)</Text>
          <View className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <TextInput
              className="text-center text-amber-500 text-2xl font-pixel-bold"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              placeholderTextColor="#444"
            />
          </View>
        </View>
      </View>

      <View className="flex-row space-x-3 mt-10">
        <StandardButton label="CANCEL" variant="secondary" className="flex-1" onPress={onCancel} />
        <StandardButton label="LIST ITEM" variant="primary" className="flex-1" onPress={handleConfirm} />
      </View>
    </BaseModal>
  );
}
