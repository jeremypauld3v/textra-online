import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, InventoryItem } from "../../api/game";
import Toast from "react-native-toast-message";

import { useGameStore } from "../../store/useGameStore";

// UI Components
import BaseModal from "../../components/ui/BaseModal";
import ItemIcon from "../../components/ui/ItemIcon";
import ScreenHeader from "../../components/ui/ScreenHeader";
import StandardButton from "../../components/ui/StandardButton";
import MarketListModal from "../../components/MarketListModal";

const TOTAL_SLOTS = 100;
const CATEGORIES = ["ALL", "EQUIPMENT", "CONSUMABLE", "MATERIAL"];

export default function InventoryScreen() {
  const itemTemplates = useGameStore((state) => state.items);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isMarketModalVisible, setIsMarketModalVisible] = useState(false);
  const [equippedIds, setEquippedIds] = useState<string[]>([]);

  const fetchInventory = useCallback(async () => {
    try {
      const data = await gameApi.getInventory();
      setItems(data.inventory);
      const eq = data.equipment;
      const activeIds = [eq.equippedWeaponId, eq.equippedChestId, eq.equippedHelmetId, eq.equippedBootsId, eq.equippedGlovesId, eq.equippedCapeId, eq.equippedNecklaceId, eq.equippedRing1Id, eq.equippedRing2Id].filter(Boolean) as string[];
      setEquippedIds(activeIds);
    } catch (e) {
      console.error("Failed to fetch inventory", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchInventory(); }, [fetchInventory]));

  const handleEquip = async (itemId: string) => {
    try {
      await gameApi.equip(itemId);
      Toast.show({ type: "success", text1: "Relic Bound" });
      setSelectedItem(null);
      fetchInventory();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Binding Failed", text2: e.response?.data?.error });
    }
  };

  const handleListOnMarket = async (quantity: number, price: number) => {
    if (!selectedItem) return;
    try {
      await gameApi.listItem(selectedItem.id, quantity, price);
      Toast.show({ type: "success", text1: "Market Listing Active" });
      setIsMarketModalVisible(false);
      setSelectedItem(null);
      fetchInventory();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Listing Failed", text2: e.response?.data?.error });
    }
  };

  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCategory !== "ALL") {
      list = list.filter((item) => itemTemplates[item.itemCode]?.type === selectedCategory);
    }
    return [...list].sort((a, b) => {
      const aEq = equippedIds.includes(a.id);
      const bEq = equippedIds.includes(b.id);
      if (aEq && !bEq) return -1;
      if (!aEq && bEq) return 1;
      return 0;
    });
  }, [items, selectedCategory, itemTemplates, equippedIds]);

  const gridData = useMemo(() => {
    const data = [...filteredItems];
    while (data.length < 24) data.push(null as any); 
    return data;
  }, [filteredItems]);

  return (
    <View className="flex-1 bg-[#020617]">
      <View className="flex-1 px-6 pt-20">
        
        <ScreenHeader 
          title="Vault" 
          subtitle="Resource Management" 
          badge={`${items.length}/${TOTAL_SLOTS}`}
        />

        {/* 🧭 FILTER SEALS */}
        <View className="flex-row flex-wrap justify-center mb-8 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5">
           {CATEGORIES.map((cat) => (
             <Pressable 
                key={cat} 
                onPress={() => setSelectedCategory(cat)}
                className={`flex-1 py-3 rounded-xl border ${selectedCategory === cat ? "bg-slate-800 border-white/10" : "border-transparent"}`}
             >
                <Text className={`text-[8px] font-pixel-bold uppercase tracking-widest text-center ${selectedCategory === cat ? "text-white" : "text-slate-600"}`}>{cat}</Text>
             </Pressable>
           ))}
        </View>

        {/* 📦 THE GRID */}
        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#fbbf24" size="large" />
          </View>
        ) : (
          <FlatList
            data={gridData}
            numColumns={4}
            keyExtractor={(item, index) => item?.id || index.toString()}
            columnWrapperStyle={{ justifyContent: "center", gap: 10, marginBottom: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInventory(); }} tintColor="#fbbf24" />}
            renderItem={({ item }) => {
              if (!item) {
                return <View className="w-[23%] aspect-square bg-slate-900/40 border border-white/5 rounded-xl" />;
              }
              const meta = itemTemplates[item.itemCode];
              return (
                <ItemIcon 
                  className="w-[23%] aspect-square"
                  emoji={meta?.emoji || "📦"}
                  isEquipped={equippedIds.includes(item.id)}
                  quantity={item.quantity}
                  rarity={meta?.rarityId}
                  onPress={() => setSelectedItem(item)}
                />
              );
            }}
          />
        )}
      </View>

      {/* 📜 RELIC DETAILS */}
      <BaseModal visible={!!selectedItem} onClose={() => setSelectedItem(null)} position="bottom">
        {selectedItem && (() => {
          const meta = itemTemplates[selectedItem.itemCode];
          const isEquipped = equippedIds.includes(selectedItem.id);
          return (
            <View className="pb-8 pt-4 items-center">
               <View className="w-24 h-24 bg-slate-900 border border-white/10 rounded-[32px] items-center justify-center mb-8">
                  <Text className="text-4xl">{meta?.emoji}</Text>
               </View>

               <Text className="text-white text-2xl font-pixel-bold uppercase text-center mb-2 tracking-tight">{meta?.name}</Text>
               <View className="flex-row items-center mb-8 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                  <Text className="text-indigo-400 text-[9px] font-pixel-bold uppercase tracking-widest">{meta?.rarityId}</Text>
                  <View className="w-1 h-1 rounded-full bg-slate-700 mx-3" />
                  <Text className="text-slate-500 text-[9px] font-pixel-bold uppercase tracking-widest">{meta?.type}</Text>
               </View>

               <View className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5 mb-10 w-full">
                  <Text className="text-slate-400 text-xs leading-relaxed text-center font-sans italic mb-4">&quot;{meta?.description || "An artifact of unknown origin, pulsing with latent energy."}&quot;</Text>
                  
                  {(selectedItem.rolledAtk || selectedItem.rolledDef || selectedItem.rolledStr || selectedItem.rolledAgi || selectedItem.rolledInt || selectedItem.rolledLuk || meta?.atk || meta?.def) ? (
                    <View className="flex-row flex-wrap justify-center pt-4 border-t border-white/5">
                       {(meta?.atk || selectedItem.rolledAtk) ? <View className="px-3 py-1 bg-rose-500/10 rounded-full mr-2 mb-2 border border-rose-500/20"><Text className="text-rose-400 text-[8px] font-pixel-bold">ATK +{(meta?.atk || 0) + (selectedItem.rolledAtk || 0)}</Text></View> : null}
                       {(meta?.def || selectedItem.rolledDef) ? <View className="px-3 py-1 bg-emerald-500/10 rounded-full mr-2 mb-2 border border-emerald-500/20"><Text className="text-emerald-400 text-[8px] font-pixel-bold">DEF +{(meta?.def || 0) + (selectedItem.rolledDef || 0)}</Text></View> : null}
                       {selectedItem.rolledStr ? <View className="px-3 py-1 bg-orange-500/10 rounded-full mr-2 mb-2 border border-orange-500/20"><Text className="text-orange-400 text-[8px] font-pixel-bold">STR +{selectedItem.rolledStr}</Text></View> : null}
                       {selectedItem.rolledAgi ? <View className="px-3 py-1 bg-sky-500/10 rounded-full mr-2 mb-2 border border-sky-500/20"><Text className="text-sky-400 text-[8px] font-pixel-bold">AGI +{selectedItem.rolledAgi}</Text></View> : null}
                       {selectedItem.rolledInt ? <View className="px-3 py-1 bg-purple-500/10 rounded-full mr-2 mb-2 border border-purple-500/20"><Text className="text-purple-400 text-[8px] font-pixel-bold">INT +{selectedItem.rolledInt}</Text></View> : null}
                       {selectedItem.rolledLuk ? <View className="px-3 py-1 bg-yellow-500/10 rounded-full mr-2 mb-2 border border-yellow-500/20"><Text className="text-yellow-400 text-[8px] font-pixel-bold">LUK +{selectedItem.rolledLuk}</Text></View> : null}
                    </View>
                  ) : null}
               </View>

               <View className="w-full space-y-4">
                 {meta?.type === "EQUIPMENT" && (
                   <StandardButton 
                     label={isEquipped ? "Currently Bound" : "Bind to Spirit"}
                     onPress={() => isEquipped ? null : handleEquip(selectedItem.id)}
                     variant={isEquipped ? "secondary" : "primary"}
                     disabled={isEquipped}
                     size="lg"
                     className="w-full"
                   />
                 )}

                 {!isEquipped && (
                    <StandardButton 
                      label="List on Market"
                      onPress={() => setIsMarketModalVisible(true)}
                      variant="secondary"
                      size="lg"
                      className="w-full"
                    />
                 )}
                 
                 <Pressable onPress={() => setSelectedItem(null)} className="w-full py-2 items-center">
                   <Text className="text-slate-600 text-[8px] font-pixel-bold uppercase tracking-[4px]">Close</Text>
                 </Pressable>
               </View>
            </View>
          );
        })()}
      </BaseModal>

      <MarketListModal 
        visible={isMarketModalVisible}
        item={selectedItem}
        onConfirm={handleListOnMarket}
        onCancel={() => setIsMarketModalVisible(false)}
      />
    </View>
  );
}
