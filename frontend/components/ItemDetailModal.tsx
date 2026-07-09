import React from "react";
import { View, Text, Pressable } from "react-native";
import BaseModal from "./ui/BaseModal";
import StandardButton from "./ui/StandardButton";
import { ItemTemplate, InventoryItem } from "../api/game";

interface ItemDetailModalProps {
  visible: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  template: ItemTemplate | null;
  isEquipped?: boolean;
  onEquip?: (itemId: string) => void;
  onMarketList?: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  COMMON: "text-white/40",
  UNCOMMON: "text-emerald-400",
  RARE: "text-blue-400",
  EPIC: "text-purple-400",
  LEGENDARY: "text-amber-400",
  MYTHICAL: "text-rose-400",
};

export default function ItemDetailModal({
  visible,
  onClose,
  item,
  template,
  isEquipped = false,
  onEquip,
  onMarketList,
}: ItemDetailModalProps) {
  if (!visible || !template) return null;

  const type = template.type;
  const rarity = typeof template.rarity === 'object' ? template.rarity.id : template.rarity || template.rarityId;
  const rarityColor = RARITY_COLORS[rarity] || "text-white";

  // Combine base stats and rolled stats
  const stats = {
    ATK: (template.statAtk || 0) + (item?.rolledAtk || 0),
    DEF: (template.statDef || 0) + (item?.rolledDef || 0),
    STR: (template.statStr || 0) + (item?.rolledStr || 0),
    AGI: (template.statAgi || 0) + (item?.rolledAgi || 0),
    INT: (template.statInt || 0) + (item?.rolledInt || 0),
    LUK: (template.statLuk || 0) + (item?.rolledLuk || 0),
    DEX: (template.statDex || 0),
    HEAL: (template.statHeal || 0),
    ENERGY: (template.statEnergy || 0),
  };

  const hasStats = Object.values(stats).some(val => val > 0);

  return (
    <BaseModal visible={visible} onClose={onClose} position="bottom">
      <View className="pb-6 pt-2 items-center">
        <View className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl items-center justify-center mb-6 shadow-2xl">
          <Text className="text-3xl">{template.emoji}</Text>
        </View>

        <Text className="text-white text-xl font-pixel-bold uppercase text-center mb-1.5 tracking-tight">
          {template.name}
        </Text>
        
        <View className="flex-row items-center mb-6 bg-white/[0.04] px-3.5 py-1 rounded-full border border-white/5">
          <Text className={`${rarityColor} text-[8px] font-pixel-bold uppercase tracking-widest`}>{rarity}</Text>
          <View className="w-0.5 h-0.5 rounded-full bg-white/20 mx-2" />
          <Text className="text-white/30 text-[8px] font-pixel-bold uppercase tracking-widest">{type}</Text>
        </View>

        <View className="bg-white/[0.02] p-4 rounded-xl border border-white/10 mb-6 w-full">
          <Text className="text-frost-muted text-xs leading-relaxed text-center font-sans italic mb-3">
            &quot;{template.description || "An artifact of unknown origin, pulsing with latent energy."}&quot;
          </Text>
          
          {hasStats && (
            <View className="flex-row flex-wrap justify-center pt-3 border-t border-white/[0.04]">
              {Object.entries(stats).map(([label, val]) => {
                return val && val > 0 ? (
                  <View key={label} className={`px-2.5 py-1 bg-white/5 rounded border border-white/10 mr-1.5 mb-1.5`}>
                    <Text className={`text-white/80 text-[7px] font-pixel-bold`}>{label} +{val}</Text>
                  </View>
                ) : null;
              })}
            </View>
          )}
        </View>

        <View className="w-full space-y-3">
          {type === "EQUIPMENT" && onEquip && item && (
            <StandardButton 
              label={isEquipped ? "Currently Bound" : "Bind to Spirit"}
              onPress={() => isEquipped ? null : onEquip(item.id)}
              variant={isEquipped ? "secondary" : "primary"}
              disabled={isEquipped}
              size="lg"
              className="w-full"
            />
          )}

          {!isEquipped && onMarketList && (
            <StandardButton 
              label="List on Market"
              onPress={onMarketList}
              variant="secondary"
              size="lg"
              className="w-full"
            />
          )}
          
          <Pressable onPress={onClose} className="w-full py-1.5 items-center">
            <Text className="text-white/30 text-[8px] font-pixel-bold uppercase tracking-[3px]">Close</Text>
          </Pressable>
        </View>
      </View>
    </BaseModal>
  );
}
