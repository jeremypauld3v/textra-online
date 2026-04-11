import { View, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, InventoryItem } from "../../api/game";
import Toast from "react-native-toast-message";

import { useGameStore } from "../../store/useGameStore";

const TOTAL_SLOTS = 100;
const CATEGORIES = [
  { label: 'All', value: 'ALL' },
  { label: 'Gear', value: 'EQUIPMENT' },
  { label: 'Materials', value: 'MATERIAL' },
  { label: 'Potions', value: 'CONSUMABLE' }
];

export default function InventoryScreen() {
  const itemTemplates = useGameStore((state) => state.items);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [equippedIds, setEquippedIds] = useState<string[]>([]);
  
  // Market Listing States
  const [isSellModalVisible, setIsSellModalVisible] = useState(false);
  const [sellQty, setSellQty] = useState("1");
  const [sellPrice, setSellPrice] = useState("10");

  const fetchInventory = useCallback(async () => {
    try {
      const data = await gameApi.getInventory();
      setItems(data.inventory);
      
      const eq = data.equipment;
      const activeIds = [
         eq.equippedWeaponId, 
         eq.equippedChestId, 
         eq.equippedHelmetId, 
         eq.equippedBootsId
      ].filter(Boolean) as string[];
      setEquippedIds(activeIds);
    } catch (e) {
      console.error("Failed to fetch inventory", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [fetchInventory])
  );

  const handleEquip = async (itemId: string) => {
    try {
      setIsActionLoading(true);
      const res = await gameApi.equip(itemId);
      Toast.show({ type: "success", text1: "Success", text2: res.message });
      setSelectedItem(null);
      fetchInventory();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Equip Failed", text2: e.response?.data?.error || "Unknown error" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUseItem = async (itemId: string) => {
    try {
      setIsActionLoading(true);
      const res = await gameApi.useItem(itemId);
      Toast.show({ 
        type: "success", 
        text1: "Used Item", 
        text2: `Restored ${res.healed} HP and ${res.energyRestored} Energy!` 
      });
      setSelectedItem(null);
      fetchInventory();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Use Failed", text2: e.response?.data?.error || "Unknown error" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSellPress = () => {
    if (!selectedItem) return;
    setSellQty("1");
    setSellPrice("50");
    setIsSellModalVisible(true);
  };

  const handleConfirmSell = async () => {
    if (!selectedItem) return;
    const qty = parseInt(sellQty);
    const price = parseInt(sellPrice);

    if (isNaN(qty) || qty <= 0 || qty > selectedItem.quantity) {
       Toast.show({ type: "error", text1: "Invalid Quantity" });
       return;
    }
    if (isNaN(price) || price <= 0) {
       Toast.show({ type: "error", text1: "Invalid Price" });
       return;
    }

    try {
      setIsActionLoading(true);
      await gameApi.listItem(selectedItem.id, qty, price);
      Toast.show({ type: "success", text1: "Listed!", text2: `${qty} items listed for ${price}G each` });
      setIsSellModalVisible(false);
      setSelectedItem(null);
      fetchInventory();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "List Failed", text2: e.response?.data?.error || "Unknown error" });
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCategory !== "ALL") {
       list = items.filter(item => {
          const meta = itemTemplates[item.itemCode];
          return meta?.type === selectedCategory;
       });
    }

    return [...list].sort((a, b) => {
       const aEquipped = equippedIds.includes(a.id);
       const bEquipped = equippedIds.includes(b.id);
       if (aEquipped && !bEquipped) return -1;
       if (!aEquipped && bEquipped) return 1;
       return 0;
    });
  }, [items, selectedCategory, itemTemplates, equippedIds]);

  const gridData = useMemo(() => {
    const data = [...filteredItems];
    while (data.length < TOTAL_SLOTS) {
      data.push(null as any);
    }
    return data;
  }, [filteredItems]);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 px-6 pt-10">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-10">
          <View>
            <Text className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-1">Vault of Textra</Text>
            <Text className="text-4xl font-black text-white italic uppercase tracking-tighter">Inventory</Text>
          </View>
          <View className="bg-slate-900 px-5 py-2 rounded-2xl border border-slate-800">
             <Text className="text-indigo-400 font-black italic">{items.length} / {TOTAL_SLOTS}</Text>
          </View>
        </View>

        {/* Categories Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-10 h-10">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                   key={cat.value} 
                   onPress={() => setSelectedCategory(cat.value)}
                   className={`mr-4 px-6 rounded-full justify-center border ${selectedCategory === cat.value ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-900 border-slate-800'}`}
                >
                   <Text className={`font-bold text-[10px] uppercase tracking-widest ${selectedCategory === cat.value ? 'text-white' : 'text-slate-500'}`}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
        </ScrollView>

        {/* The Grid */}
        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#6366f1" size="large" />
          </View>
        ) : (
          <FlatList
            data={gridData}
            numColumns={4}
            keyExtractor={(_, index) => index.toString()}
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 15 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInventory(); }} tintColor="#6366f1" />}
            renderItem={({ item }) => {
              if (!item) {
                return (
                  <View className="w-[22%] aspect-square bg-slate-900/30 border border-dashed border-slate-800/50 rounded-2xl items-center justify-center" />
                );
              }

              const meta = itemTemplates[item.itemCode];
              const isEquipped = equippedIds.includes(item.id);

              return (
                <TouchableOpacity 
                   onPress={() => setSelectedItem(item)}
                   className={`w-[22%] aspect-square bg-slate-900 border rounded-2xl items-center justify-center shadow-xl ${
                      isEquipped ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800'
                   }`}
                >
                  <Text className="text-2xl">{meta?.emoji || "📦"}</Text>
                  
                  {isEquipped && (
                     <View className="absolute -top-1 -right-1 bg-indigo-500 w-5 h-5 rounded-full items-center justify-center border-2 border-slate-950">
                        <Ionicons name="checkmark" size={10} color="white" />
                     </View>
                  )}

                  {item.quantity > 1 && (
                    <View className="absolute bottom-1 right-1 bg-slate-800 px-1.5 rounded-md border border-slate-700">
                       <Text className="text-[8px] font-black text-white">{item.quantity}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                 <Ionicons name="archive-outline" size={64} color="#1e293b" />
                 <Text className="text-slate-600 mt-4 font-bold italic">No {selectedCategory !== "ALL" ? selectedCategory.toLowerCase() : ""} items found...</Text>
              </View>
            }
          />
        )}
      </View>

      {/* 📦 ITEM DETAIL MODAL */}
      <Modal visible={!!selectedItem && !isSellModalVisible} transparent animationType="fade">
         <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setSelectedItem(null)}
            className="flex-1 bg-black/80 justify-center items-center px-6"
         >
            <TouchableOpacity 
               activeOpacity={1} 
               className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] w-full shadow-2xl"
            >
               {selectedItem && (() => {
                  const meta = itemTemplates[selectedItem.itemCode];
                  return (
                     <>
                        <View className="items-center mb-6">
                           <View className="w-20 h-20 bg-slate-950 rounded-3xl items-center justify-center border border-slate-800 mb-4 shadow-inner">
                              <Text className="text-4xl">{meta?.emoji || "📦"}</Text>
                           </View>
                           <Text className={`font-black uppercase tracking-widest text-[10px] mb-1 ${
                              meta?.rarity === 'RARE' ? 'text-amber-400' : 
                              meta?.rarity === 'UNCOMMON' ? 'text-emerald-400' : 'text-slate-500'
                           }`}>
                              {meta?.rarity} {meta?.type}
                           </Text>
                           <Text className="text-3xl font-black text-white italic uppercase text-center">{meta?.name}</Text>
                        </View>

                        <Text className="text-slate-400 text-center leading-relaxed mb-8 italic">&quot;{meta?.description}&quot;</Text>

                        {/* Stats Section */}
                        {meta?.type === 'EQUIPMENT' && (
                           <View className="flex-row justify-center space-x-4 mb-8">
                              {(selectedItem.rolledAtk ?? meta.statAtk) > 0 && (
                                 <View className="bg-rose-500/10 px-4 py-2 rounded-2xl border border-rose-500/20">
                                    <Text className="text-rose-400 font-black text-xs">ATK +{selectedItem.rolledAtk ?? meta.statAtk}</Text>
                                 </View>
                              )}
                              {(selectedItem.rolledDef ?? meta.statDef) > 0 && (
                                 <View className="bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                                    <Text className="text-emerald-400 font-black text-xs">DEF +{selectedItem.rolledDef ?? meta.statDef}</Text>
                                 </View>
                              )}
                              {(selectedItem.rolledStr ?? meta.statStr) > 0 && (
                                 <View className="bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/20">
                                    <Text className="text-amber-400 font-black text-xs">STR +{selectedItem.rolledStr ?? meta.statStr}</Text>
                                 </View>
                              )}
                              {(selectedItem.rolledAgi ?? meta.statAgi) > 0 && (
                                 <View className="bg-indigo-500/10 px-4 py-2 rounded-2xl border border-indigo-500/20">
                                    <Text className="text-indigo-400 font-black text-xs">AGI +{selectedItem.rolledAgi ?? meta.statAgi}</Text>
                                 </View>
                              )}
                           </View>
                        )}

                        <View className="space-y-3">
                           {meta?.type === 'EQUIPMENT' && (
                              <TouchableOpacity 
                                 onPress={async () => {
                                    if (equippedIds.includes(selectedItem.id)) {
                                       try {
                                          setIsActionLoading(true);
                                          await gameApi.unequip(meta.equipSlot as any);
                                          Toast.show({ type: "success", text1: "Unequipped" });
                                          setSelectedItem(null);
                                          fetchInventory();
                                       } catch (e: any) {
                                          Toast.show({ type: "error", text2: e.message });
                                       } finally {
                                          setIsActionLoading(false);
                                       }
                                    } else {
                                       handleEquip(selectedItem.id);
                                    }
                                 }}
                                 disabled={isActionLoading}
                                 className={`${equippedIds.includes(selectedItem.id) ? 'bg-rose-600' : 'bg-indigo-600'} p-5 rounded-3xl items-center shadow-lg`}
                              >
                                 <Text className="text-white font-black uppercase tracking-widest">
                                    {isActionLoading ? "Processing..." : equippedIds.includes(selectedItem.id) ? "Unequip Item" : "Equip Item"}
                                 </Text>
                              </TouchableOpacity>
                           )}

                           {meta?.type === 'CONSUMABLE' && (
                              <TouchableOpacity 
                                 onPress={() => handleUseItem(selectedItem.id)}
                                 disabled={isActionLoading}
                                 className="bg-emerald-600 p-5 rounded-3xl items-center shadow-lg shadow-emerald-500/20"
                              >
                                 <Text className="text-white font-black uppercase tracking-widest">
                                    {isActionLoading ? "Consuming..." : "Use Consumable"}
                                 </Text>
                              </TouchableOpacity>
                           )}

                           <TouchableOpacity 
                              onPress={handleSellPress}
                              disabled={isActionLoading}
                              className="bg-amber-600/20 border border-amber-500/30 p-5 rounded-3xl items-center"
                           >
                              <Text className="text-amber-400 font-black uppercase tracking-widest">Sell on Market</Text>
                           </TouchableOpacity>

                           <TouchableOpacity 
                              onPress={() => setSelectedItem(null)}
                              className="bg-slate-800 p-5 rounded-3xl items-center"
                           >
                              <Text className="text-slate-400 font-black uppercase tracking-widest">Close</Text>
                           </TouchableOpacity>
                        </View>
                     </>
                  );
               })()}
            </TouchableOpacity>
         </TouchableOpacity>
      </Modal>

      {/* 🏷️ MARKET LISTING MODAL */}
      <Modal visible={isSellModalVisible} transparent animationType="slide">
         <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-slate-900 border-t border-slate-800 p-10 rounded-t-[50px] shadow-2xl">
               <Text className="text-2xl font-black text-white italic uppercase mb-8">List on Marketplace</Text>
               
               {/* Inputs */}
               <View className="space-y-6 mb-10">
                  <View>
                     <Text className="text-slate-500 font-black uppercase text-[10px] mb-3 ml-1 tracking-widest">Quantity (Max: {selectedItem?.quantity})</Text>
                     <View className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 flex-row items-center">
                        <TextInput 
                           className="flex-1 text-white font-black text-lg"
                           value={sellQty}
                           onChangeText={setSellQty}
                           keyboardType="numeric"
                           placeholder="1"
                           placeholderTextColor="#334155"
                        />
                        <Ionicons name="layers-outline" size={20} color="#475569" />
                     </View>
                  </View>

                  <View>
                     <Text className="text-slate-500 font-black uppercase text-[10px] mb-3 ml-1 tracking-widest">Price per unit (Gold)</Text>
                     <View className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 flex-row items-center">
                        <TextInput 
                           className="flex-1 text-amber-400 font-black text-lg"
                           value={sellPrice}
                           onChangeText={setSellPrice}
                           keyboardType="numeric"
                           placeholder="50"
                           placeholderTextColor="#334155"
                        />
                        <Ionicons name="cash-outline" size={20} color="#475569" />
                     </View>
                  </View>
               </View>

               {/* Summary */}
               <View className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 mb-8">
                  <View className="flex-row justify-between mb-2">
                     <Text className="text-slate-500 font-bold uppercase text-[10px]">Total Price</Text>
                     <Text className="text-amber-400 font-black text-lg">{(parseInt(sellQty) || 0) * (parseInt(sellPrice) || 0)}G</Text>
                  </View>
                  <View className="flex-row justify-between">
                     <Text className="text-slate-500 font-bold uppercase text-[10px]">Market Fee (5%)</Text>
                     <Text className="text-slate-500 font-bold">-{Math.floor(((parseInt(sellQty) || 0) * (parseInt(sellPrice) || 0)) * 0.05)}G</Text>
                  </View>
               </View>

               <View className="flex-row pb-6">
                  <TouchableOpacity 
                     onPress={() => setIsSellModalVisible(false)}
                     className="flex-1 bg-slate-800 p-5 rounded-3xl mr-2 items-center"
                  >
                     <Text className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                     onPress={handleConfirmSell}
                     disabled={isActionLoading}
                     className="flex-2 bg-indigo-600 p-5 rounded-3xl ml-2 items-center shadow-lg shadow-indigo-500/20"
                  >
                     <Text className="text-white font-black uppercase text-[10px] tracking-widest">
                        {isActionLoading ? "..." : "List Item"}
                     </Text>
                  </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}
