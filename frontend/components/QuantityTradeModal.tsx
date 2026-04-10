import { View, Text, Modal, TouchableOpacity, TextInput } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

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
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <View className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] w-full shadow-2xl">
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-slate-950 rounded-2xl items-center justify-center border border-slate-800 mb-4">
              <Text className="text-3xl">📦</Text>
            </View>
            <Text className="text-white text-xl font-black italic uppercase text-center">Set Quantity</Text>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Max Available: {max}</Text>
          </View>

          <View className="flex-row items-center justify-between bg-black/40 p-4 rounded-2xl mb-8 border border-white/5">
             <TouchableOpacity 
               onPress={() => setQuantity(prev => Math.max(1, parseInt(prev || "0") - 1).toString())}
               className="w-12 h-12 bg-slate-800 rounded-xl items-center justify-center"
             >
                <Ionicons name="remove" size={24} color="white" />
             </TouchableOpacity>

             <TextInput
               className="flex-1 text-center text-white text-3xl font-black italic"
               keyboardType="numeric"
               value={quantity}
               onChangeText={setQuantity}
               autoFocus
               selectTextOnFocus
             />

             <TouchableOpacity 
               onPress={() => setQuantity(prev => Math.min(max, parseInt(prev || "0") + 1).toString())}
               className="w-12 h-12 bg-indigo-600 rounded-xl items-center justify-center"
             >
                <Ionicons name="add" size={24} color="white" />
             </TouchableOpacity>
          </View>

          <View className="flex-row space-x-3">
             <TouchableOpacity 
               onPress={onCancel}
               className="flex-1 bg-slate-800 p-5 rounded-3xl items-center"
             >
                <Text className="text-slate-400 font-black uppercase tracking-widest">Cancel</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               onPress={handleConfirm}
               className="flex-1 bg-indigo-600 p-5 rounded-3xl items-center shadow-lg shadow-indigo-500/20"
             >
                <Text className="text-white font-black uppercase tracking-widest">Confirm</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
