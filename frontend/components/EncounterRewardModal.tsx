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
    <BaseModal visible={visible} onClose={onClose} showClose={false} position="center" className="bg-[#0a0a0a] border-mystic/10">
      <View className="items-center py-4">
        {/* Victory/Defeat Header */}
        <Animated.View entering={FadeInDown.duration(400)} className="items-center mb-6">
           <View className={`w-20 h-20 rounded-full items-center justify-center border-2 ${isWin ? "border-verdant/30 bg-verdant/5" : "border-crimson/20 bg-crimson/[0.02]"}`}>
             <Ionicons 
               name={isWin ? "trophy" : "skull"} 
               size={36} 
               color={isWin ? "#10B981" : "#EF4444"} 
             />
           </View>
           
           <View className="mt-3 items-center">
             <Text className={`text-3xl font-sans font-black uppercase tracking-tighter ${isWin ? "text-verdant" : "text-crimson"}`}>
               {isWin ? "Victory" : "Defeat"}
             </Text>
             <View className={`h-[1px] w-8 mt-1 ${isWin ? "bg-verdant/30" : "bg-crimson/30"}`} />
           </View>

           {message && (
             <View className="mt-3 px-4">
                <Text className="text-white/50 text-[8px] font-pixel-bold uppercase text-center leading-relaxed tracking-wider">
                  {message}
                </Text>
             </View>
           )}
        </Animated.View>

        <View className="w-full">
          {/* Rewards Summary Row */}
          <View className="flex-row gap-3 mb-6">
            {experienceGained > 0 && (
              <Animated.View entering={FadeInDown.delay(100)} className="flex-1 bg-mystic/5 border border-mystic/10 rounded-2xl p-3 items-center">
                <Ionicons name="sparkles" size={14} color="#A78BFA" style={{ marginBottom: 2 }} />
                <Text className="text-frost text-lg font-bold">+{experienceGained.toLocaleString()}</Text>
                <Text className="text-frost-muted text-[8px] uppercase font-black tracking-widest">Experience</Text>
              </Animated.View>
            )}
            {goldGained > 0 && (
              <Animated.View entering={FadeInDown.delay(150)} className="flex-1 bg-gold/5 border border-gold/10 rounded-2xl p-3 items-center">
                <Ionicons name="wallet" size={14} color="#F59E0B" style={{ marginBottom: 2 }} />
                <Text className="text-gold text-lg font-bold">+{goldGained.toLocaleString()}</Text>
                <Text className="text-gold/30 text-[8px] uppercase font-black tracking-widest">Gold Coins</Text>
              </Animated.View>
            )}
          </View>

          {/* Loot Section */}
          <View className="w-full">
            <View className="flex-row justify-between items-end mb-2.5 px-1">
                <Text className="text-white/50 text-[9px] font-black uppercase tracking-widest">Loot Secured</Text>
                <Text className="text-white/20 text-[8px] font-bold">{lootedItems.length} ITEMS</Text>
            </View>

            <View className="bg-white/[0.02] rounded-2xl border border-white/10 p-3 min-h-[90px]">
              {lootedItems.length > 0 ? (
                <View className="flex-row flex-wrap justify-start gap-3">
                  {lootedItems.map((loot, index) => {
                    const template = itemTemplates[loot.itemCode];
                    if (!template) return null;
                    return (
                      <Animated.View 
                        key={`${loot.itemCode}-${index}`}
                        entering={ZoomIn.delay(200 + index * 50).duration(200)}
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
                <View className="flex-1 items-center justify-center py-4">
                  <Ionicons name="cube-outline" size={24} color="rgba(255,255,255,0.2)" />
                  <Text className="text-white/30 text-[9px] font-bold uppercase mt-1 italic">No treasures found</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <StandardButton 
          label="CONTINUE JOURNEY" 
          variant="primary" 
          onPress={onClose} 
          className="w-full mt-6 h-12 rounded-xl"
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
