import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  FadeInDown, 
  ZoomIn, 
  Layout
} from "react-native-reanimated";
import BaseModal from "./ui/BaseModal";
import StandardButton from "./ui/StandardButton";
import ItemIcon from "./ui/ItemIcon";
import { useGameStore } from "../store/useGameStore";
import ItemDetailModal from "./ItemDetailModal";

interface RewardItem {
  itemCode: string;
  quantity: number;
}

interface EncounterRewardModalProps {
  visible: boolean;
  onClose: () => void;
  isWin: boolean;
  lootedItems?: RewardItem[];
  experienceGained?: number;
  goldGained?: number;
  message?: string;
}

export default function EncounterRewardModal({
  visible,
  onClose,
  isWin,
  lootedItems = [],
  experienceGained = 0,
  goldGained = 0,
  message,
}: EncounterRewardModalProps) {
  const itemTemplates = useGameStore((state) => state.items);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  if (!visible) return null;

  return (
    <BaseModal visible={visible} onClose={onClose} showClose={false} position="center" className="bg-slate-950 border-emerald-500/20">
      <View className="items-center py-4">
        {/* Victory/Defeat Header */}
        <Animated.View entering={FadeInDown.duration(400)} className="items-center mb-8">
           <View className={`w-24 h-24 rounded-full items-center justify-center border-4 ${isWin ? "border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]" : "border-rose-500/30 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.3)]"}`}>
             <Ionicons 
               name={isWin ? "trophy" : "skull"} 
               size={48} 
               color={isWin ? "#34d399" : "#fb7185"} 
             />
           </View>
           
           <View className="mt-4 items-center">
             <Text className={`text-4xl font-sans font-black uppercase tracking-tighter ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
               {isWin ? "Victory" : "Defeat"}
             </Text>
             <View className={`h-1 w-12 rounded-full mt-1 ${isWin ? "bg-emerald-500/50" : "bg-rose-500/50"}`} />
           </View>

           {message && (
             <View className="mt-4 px-6">
                <Text className="text-slate-400 text-[10px] font-pixel-bold uppercase text-center leading-relaxed tracking-wider opacity-80">
                  {message}
                </Text>
             </View>
           )}
        </Animated.View>

        <View className="w-full">
          {/* Rewards Summary Row */}
          <View className="flex-row gap-4 mb-8">
            {experienceGained > 0 && (
              <Animated.View entering={FadeInDown.delay(200)} className="flex-1 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-4 items-center">
                <Ionicons name="sparkles" size={16} color="#818cf8" style={{ marginBottom: 4 }} />
                <Text className="text-indigo-400 text-xl font-bold">+{experienceGained.toLocaleString()}</Text>
                <Text className="text-indigo-400/60 text-[10px] uppercase font-black tracking-widest">Experience</Text>
              </Animated.View>
            )}
            {goldGained > 0 && (
              <Animated.View entering={FadeInDown.delay(300)} className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-3xl p-4 items-center">
                <Ionicons name="wallet" size={16} color="#fbbf24" style={{ marginBottom: 4 }} />
                <Text className="text-amber-400 text-xl font-bold">+{goldGained.toLocaleString()}</Text>
                <Text className="text-amber-400/60 text-[10px] uppercase font-black tracking-widest">Gold Coins</Text>
              </Animated.View>
            )}
          </View>

          {/* Loot Section */}
          <View className="w-full">
            <View className="flex-row justify-between items-end mb-4 px-2">
                <Text className="text-slate-400 text-xs font-black uppercase tracking-widest">Loot Secured</Text>
                <Text className="text-slate-600 text-[10px] font-bold">{lootedItems.length} ITEMS</Text>
            </View>

            <View className="bg-slate-900/50 rounded-[32px] border border-white/5 p-4 min-h-[120px]">
              {lootedItems.length > 0 ? (
                <View className="flex-row flex-wrap justify-start gap-4">
                  {lootedItems.map((loot, index) => {
                    const template = itemTemplates[loot.itemCode];
                    if (!template) return null;
                    return (
                      <Animated.View 
                        key={`${loot.itemCode}-${index}`}
                        entering={ZoomIn.delay(400 + index * 100).duration(300)}
                        layout={Layout}
                      >
                        <ItemIcon 
                          emoji={template.emoji} 
                          rarity={typeof template.rarity === 'object' ? template.rarity.id : template.rarity} 
                          quantity={loot.quantity}
                          onPress={() => setSelectedItem(template)}
                          size="md"
                        />
                      </Animated.View>
                    );
                  })}
                </View>
              ) : (
                <View className="flex-1 items-center justify-center py-6">
                  <Ionicons name="cube-outline" size={32} color="#334155" />
                  <Text className="text-slate-600 text-xs font-bold uppercase mt-2 italic">No treasures found</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <StandardButton 
          label="CONTINUE JOURNEY" 
          variant="primary" 
          onPress={onClose} 
          className="w-full mt-10 h-16 rounded-3xl shadow-xl shadow-emerald-500/10"
        />
      </View>

      <ItemDetailModal 
        visible={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={null}
        template={selectedItem}
      />
    </BaseModal>
  );
}
