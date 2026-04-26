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

  const statColors: Record<string, { bg: string, text: string, border: string }> = {
    ATK: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
    DEF: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    STR: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
    AGI: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20" },
    INT: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    LUK: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
    DEX: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    HEAL: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
    ENERGY: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  };

  return (
    <BaseModal visible={visible} onClose={onClose} position="bottom">
      <View className="pb-8 pt-4 items-center">
        <View className="w-24 h-24 bg-slate-900 border border-white/10 rounded-[32px] items-center justify-center mb-8 shadow-2xl">
          <Text className="text-4xl">{template.emoji}</Text>
        </View>

        <Text className="text-white text-2xl font-pixel-bold uppercase text-center mb-2 tracking-tight">
          {template.name}
        </Text>
        
        <View className="flex-row items-center mb-8 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
          <Text className="text-indigo-400 text-[9px] font-pixel-bold uppercase tracking-widest">{rarity}</Text>
          <View className="w-1 h-1 rounded-full bg-slate-700 mx-3" />
          <Text className="text-slate-500 text-[9px] font-pixel-bold uppercase tracking-widest">{type}</Text>
        </View>

        <View className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5 mb-10 w-full">
          <Text className="text-slate-400 text-xs leading-relaxed text-center font-sans italic mb-4">
            &quot;{template.description || "An artifact of unknown origin, pulsing with latent energy."}&quot;
          </Text>
          
          {hasStats && (
            <View className="flex-row flex-wrap justify-center pt-4 border-t border-white/5">
              {Object.entries(stats).map(([label, val]) => {
                const colors = statColors[label] || { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" };
                return val && val > 0 ? (
                  <View key={label} className={`px-3 py-1 ${colors.bg} rounded-full mr-2 mb-2 border ${colors.border}`}>
                    <Text className={`${colors.text} text-[8px] font-pixel-bold`}>{label} +{val}</Text>
                  </View>
                ) : null;
              })}
            </View>
          )}
        </View>

        <View className="w-full space-y-4">
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
          
          <Pressable onPress={onClose} className="w-full py-2 items-center">
            <Text className="text-slate-600 text-[8px] font-pixel-bold uppercase tracking-[4px]">Close</Text>
          </Pressable>
        </View>
      </View>
    </BaseModal>
  );
}
