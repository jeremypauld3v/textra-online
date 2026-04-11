import { View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, InventoryItem } from "../../api/game";
import Toast from "react-native-toast-message";

import { useGameStore } from "../../store/useGameStore";

// UI Components
import StandardButton from "../../components/ui/StandardButton";
import BaseModal from "../../components/ui/BaseModal";
import StatBadge from "../../components/ui/StatBadge";
import ItemIcon from "../../components/ui/ItemIcon";
import ScreenHeader from "../../components/ui/ScreenHeader";
import FilterButton from "../../components/ui/FilterButton";
const TOTAL_SLOTS = 100;

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

  // Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRarity, setSelectedRarity] = useState("ALL");

  const fetchInventory = useCallback(async () => {
    try {
      const data = await gameApi.getInventory();
      setItems(data.inventory);

      const eq = data.equipment;
      const activeIds = [
        eq.equippedWeaponId,
        eq.equippedChestId,
        eq.equippedHelmetId,
        eq.equippedBootsId,
        eq.equippedGlovesId,
        eq.equippedCapeId,
        eq.equippedNecklaceId,
        eq.equippedRing1Id,
        eq.equippedRing2Id,
      ].filter(Boolean) as string[];
      setEquippedIds(activeIds);

      // Keep eq in a ref or state if needed for unequip logic
      setEquipment(eq);
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
        text2: `Restored ${res.healed} HP and ${res.energyRestored} Energy!`,
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

  const [equipment, setEquipment] = useState<any>(null);

  const filteredItems = useMemo(() => {
    let list = items;

    // Filter by Search Query
    if (searchQuery) {
      list = list.filter((item) => {
        const meta = itemTemplates[item.itemCode];
        return meta?.name?.toLowerCase()?.includes(searchQuery.toLowerCase());
      });
    }

    // Filter by Type
    if (selectedCategory !== "ALL") {
      list = list.filter((item) => {
        const meta = itemTemplates[item.itemCode];
        return meta?.type === selectedCategory;
      });
    }

    // Filter by Rarity
    if (selectedRarity !== "ALL") {
      list = list.filter((item) => {
        const meta = itemTemplates[item.itemCode];
        return meta?.rarityId === selectedRarity;
      });
    }

    return [...list].sort((a, b) => {
      const aEquipped = equippedIds.includes(a.id);
      const bEquipped = equippedIds.includes(b.id);
      if (aEquipped && !bEquipped) return -1;
      if (!aEquipped && bEquipped) return 1;
      return 0;
    });
  }, [items, selectedCategory, searchQuery, selectedRarity, itemTemplates, equippedIds]);

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
        <ScreenHeader 
          title="Inventory" 
          subtitle="Vault of Textra"
          badge={`${items.length} / ${TOTAL_SLOTS}`}
        />

        {/* Global Filter Button */}
        <FilterButton 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedType={selectedCategory}
          setSelectedType={setSelectedCategory}
          selectedRarity={selectedRarity}
          setSelectedRarity={setSelectedRarity}
        />

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
            columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 15 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchInventory();
                }}
                tintColor="#6366f1"
              />
            }
            renderItem={({ item }) => {
              if (!item) {
                return <View className="w-[22%] aspect-square bg-slate-900/30 border border-dashed border-slate-800/50 rounded-2xl items-center justify-center" />;
              }

              const meta = itemTemplates[item.itemCode];
              const isEquipped = equippedIds.includes(item.id);

              return (
                <ItemIcon 
                  className="w-[22%] aspect-square"
                  emoji={meta?.emoji || "📦"}
                  isEquipped={isEquipped}
                  quantity={item.quantity}
                  rarity={meta?.rarityId}
                  onPress={() => setSelectedItem(item)}
                />
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <Ionicons name="archive-outline" size={64} color="#1e293b" />
                <Text className="text-slate-600 mt-4 font-bold italic font-sans">No {selectedCategory !== "ALL" ? selectedCategory.toLowerCase() : ""} items found...</Text>
              </View>
            }
          />
        )}
      </View>

      {/* 📦 ITEM DETAIL MODAL */}
      <BaseModal
        visible={!!selectedItem && !isSellModalVisible}
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          (() => {
            const meta = itemTemplates[selectedItem.itemCode];
            const isEquipped = equippedIds.includes(selectedItem.id);
            return (
              <>
                {/* Item Details */}
                <View className="items-center mb-4">
                  <ItemIcon 
                    emoji={meta?.emoji || "📦"}
                    rarity={meta?.rarityId}
                    size="lg"
                  />
                  <Text className="text-xl font-bold text-white italic uppercase mt-3 text-center font-sans">{meta?.name}</Text>
                  <Text className="text-slate-500 font-bold text-[8px] uppercase tracking-[4px] mt-1 font-sans">{meta?.rarityId} • {meta?.type}</Text>
                </View>

                {meta?.description && (
                  <Text className="text-slate-500 text-center leading-relaxed mb-6 italic text-[10px] font-sans">&quot;{meta.description}&quot;</Text>
                )}

                {/* Stats Section */}
                {meta?.type === "EQUIPMENT" && (
                  <View className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/20 mb-6">
                    <View className="flex-row items-center justify-between mb-3 border-b border-slate-900 pb-2">
                       <Text className="text-slate-600 font-bold text-[8px] uppercase tracking-widest font-sans">Base Attributes</Text>
                       <Text className="text-black font-bold text-[8px] uppercase bg-white px-2 py-0.5 rounded-md font-sans">Lvl {meta?.minLevel || 1}</Text>
                    </View>
                    
                    <View className="flex-row flex-wrap">
                       {meta?.statAtk > 0 && <StatBadge type="atk" value={selectedItem.rolledAtk ?? meta.statAtk ?? 0} className="mr-2 mb-2" size="xs" />}
                       {meta?.statDef > 0 && <StatBadge type="def" value={selectedItem.rolledDef ?? meta.statDef ?? 0} className="mr-2 mb-2" size="xs" />}
                       {meta?.statStr > 0 && <StatBadge type="str" value={selectedItem.rolledStr ?? meta.statStr ?? 0} className="mr-2 mb-2" size="xs" />}
                       {meta?.statAgi > 0 && <StatBadge type="agi" value={selectedItem.rolledAgi ?? meta.statAgi ?? 0} className="mr-2 mb-2" size="xs" />}
                       {meta?.statInt > 0 && <StatBadge type="int" value={selectedItem.rolledInt ?? meta.statInt ?? 0} className="mr-2 mb-2" size="xs" />}
                       {meta?.statLuk > 0 && <StatBadge type="luck" value={selectedItem.rolledLuk ?? meta.statLuk ?? 0} className="mr-2 mb-2" size="xs" />}
                    </View>
                  </View>
                )}

                <View className="space-y-2">
                  {meta?.type === "EQUIPMENT" && (
                    <StandardButton 
                      label={isActionLoading ? "Processing..." : isEquipped ? "Unequip Item" : "Equip Item"}
                      variant={isEquipped ? "danger" : "primary"}
                      loading={isActionLoading}
                      onPress={async () => {
                        if (isEquipped) {
                          try {
                            setIsActionLoading(true);
                            let slotToUnequip = meta.equipSlot;
                            if (meta.equipSlot === "RING") {
                               slotToUnequip = (equipment?.equippedRing1Id === selectedItem.id) ? "RING1" : "RING2";
                            }
                            await gameApi.unequip(slotToUnequip as any);
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
                    />
                  )}

                  {meta?.type === "EQUIPMENT" && (
                     <StandardButton 
                       label={isActionLoading ? "Processing..." : "Reforge Stats"}
                       variant="secondary"
                       loading={isActionLoading}
                       onPress={async () => {
                          try {
                            setIsActionLoading(true);
                            const res = await gameApi.reforge(selectedItem.id);
                            Toast.show({ type: "success", text1: "Stats Reforged!" });
                            setSelectedItem(res.item);
                            fetchInventory();
                          } catch (e: any) {
                            Toast.show({ type: "error", text2: e.message });
                          } finally {
                            setIsActionLoading(false);
                          }
                       }}
                     />
                  )}

                  {meta?.type === "CONSUMABLE" && (
                    <StandardButton 
                      label={isActionLoading ? "Consuming..." : "Use Consumable"}
                      variant="success"
                      loading={isActionLoading}
                      onPress={() => handleUseItem(selectedItem.id)}
                    />
                  )}

                  <StandardButton 
                    label="Sell on Market"
                    variant="outline"
                    onPress={handleSellPress}
                  />

                  <StandardButton 
                    label="Close"
                    variant="secondary"
                    onPress={() => setSelectedItem(null)}
                  />
                </View>
              </>
            );
          })()
        )}
      </BaseModal>

      {/* 🏷️ MARKET LISTING MODAL */}
      <BaseModal
        visible={isSellModalVisible}
        onClose={() => setIsSellModalVisible(false)}
        position="bottom"
        title="List on Marketplace"
      >
        <View className="space-y-6 mb-10">
          <View>
            <Text className="text-slate-500 font-bold uppercase text-[10px] mb-3 ml-1 tracking-widest font-sans">Quantity (Max: {selectedItem?.quantity})</Text>
            <View className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 flex-row items-center">
              <TextInput
                className="flex-1 text-white font-black text-lg font-sans"
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
            <Text className="text-slate-500 font-bold uppercase text-[10px] mb-3 ml-1 tracking-widest font-sans">Price per unit (Gold)</Text>
            <View className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 flex-row items-center">
              <TextInput
                className="flex-1 text-amber-400 font-black text-lg font-sans"
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
            <Text className="text-slate-500 font-bold uppercase text-[10px] font-sans">Total Price</Text>
            <Text className="text-amber-400 font-black text-lg font-sans">{(parseInt(sellQty) || 0) * (parseInt(sellPrice) || 0)}G</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-500 font-bold uppercase text-[10px] font-sans">Market Fee (5%)</Text>
            <Text className="text-slate-500 font-bold font-sans">-{Math.floor((parseInt(sellQty) || 0) * (parseInt(sellPrice) || 0) * 0.05)}G</Text>
          </View>
        </View>

        <View className="flex-row pb-6">
          <StandardButton 
            label="Cancel"
            variant="secondary"
            className="flex-1 mr-2"
            onPress={() => setIsSellModalVisible(false)}
          />
          <StandardButton 
            label={isActionLoading ? "..." : "List Item"}
            variant="primary"
            className="flex-2 ml-2"
            loading={isActionLoading}
            onPress={handleConfirmSell}
          />
        </View>
      </BaseModal>
    </SafeAreaView>
  );
}
