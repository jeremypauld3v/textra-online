import { View, Text, TextInput, Pressable } from "react-native";
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
      <View className="items-center mb-4">
        <Text className="text-white/40 text-[9px] uppercase tracking-widest mt-1">Available: {max}</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-white/40 text-[8px] uppercase font-pixel-bold mb-1.5 ml-1">Quantity</Text>
          <View className="flex-row items-center justify-between bg-white/[0.03] p-1 rounded-xl border border-white/10">
            <StandardButton
              icon="remove"
              variant="secondary"
              size="sm"
              className="w-10 h-10 rounded-lg p-0"
              onPress={() => setQuantity((prev) => Math.max(1, parseInt(prev || "0") - 1).toString())}
            />
            <TextInput
              className="flex-1 text-center text-white text-lg font-pixel-bold"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
            <StandardButton
              icon="add"
              variant="secondary"
              size="sm"
              className="w-10 h-10 rounded-lg p-0"
              onPress={() => setQuantity((prev) => Math.min(max, parseInt(prev || "0") + 1).toString())}
            />
          </View>
        </View>

        <View>
          <Text className="text-white/40 text-[8px] uppercase font-pixel-bold mb-1.5 ml-1">Price (Gold per unit)</Text>
          <View className="bg-white/[0.03] p-3 rounded-xl border border-white/10">
            <TextInput
              className="text-center text-white text-xl font-pixel-bold"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.15)"
            />
          </View>
        </View>
      </View>

      <View className="flex-row space-x-3 mt-8">
        <Pressable 
          onPress={onCancel}
          className="flex-1 py-3 rounded-xl bg-white/[0.06] border border-white/10 items-center justify-center active:bg-white/[0.1]"
        >
          <Text className="text-white text-[9px] font-pixel-bold uppercase tracking-wider">Cancel</Text>
        </Pressable>
        <Pressable 
          onPress={handleConfirm}
          className="flex-1 py-3 rounded-xl bg-white border border-white/80 items-center justify-center active:bg-white/80"
        >
          <Text className="text-black text-[9px] font-pixel-bold uppercase tracking-wider">List Item</Text>
        </Pressable>
      </View>
    </BaseModal>
  );
}
