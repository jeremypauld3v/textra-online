import { View, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback, useMemo, memo } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, InventoryItem } from "../../api/game";
import Toast from "react-native-toast-message";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useGameStore } from "../../store/useGameStore";

// UI Components
import ItemDetailModal from "../../components/ItemDetailModal";
import ItemIcon from "../../components/ui/ItemIcon";
import ScreenHeader from "../../components/ui/ScreenHeader";
import TabBar from "../../components/ui/TabBar";
import MarketListModal from "../../components/MarketListModal";
import SearchBar from "../../components/ui/SearchBar";

const TOTAL_SLOTS = 100;
const CATEGORIES = ["ALL", "EQUIPMENT", "CONSUMABLE", "MATERIAL"];

// -----------------------------------------------------------------------------
// 🧩 MEMOIZED ITEM CELL
// -----------------------------------------------------------------------------
const InventoryItemCell = memo(({ 
  item, 
  index, 
  meta, 
  isEquipped, 
  onPress 
}: { 
  item: InventoryItem | null; 
  index: number; 
  meta: any; 
  isEquipped: boolean; 
  onPress: () => void 
}) => {
  const containerClass = "w-[18.2%] aspect-square";

  if (!item) {
    return (
      <View className={containerClass}>
        <View className="w-full h-full bg-white/[0.02] border border-white/[0.06] rounded-lg items-center justify-center">
           <View className="w-1 h-1 rounded-full bg-white/10" />
        </View>
      </View>
    );
  }

  return (
    <Animated.View 
      entering={index < 30 ? FadeInDown.delay(index * 8).duration(200) : undefined} 
      className={containerClass}
    >
      <ItemIcon 
        emoji={meta?.emoji || "📦"}
        isEquipped={isEquipped}
        quantity={item.quantity}
        rarity={meta?.rarityId}
        onPress={onPress}
        size="full"
      />
    </Animated.View>
  );
});
InventoryItemCell.displayName = "InventoryItemCell";

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const itemTemplates = useGameStore((state) => state.items);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const meta = itemTemplates[item.itemCode];
        return meta?.name.toLowerCase().includes(q) || item.itemCode.toLowerCase().includes(q);
      });
    }
    
    return [...list].sort((a, b) => {
      // 1. Equipped first
      const aEq = equippedIds.includes(a.id);
      const bEq = equippedIds.includes(b.id);
      if (aEq && !bEq) return -1;
      if (!aEq && bEq) return 1;

      const aTemp = itemTemplates[a.itemCode];
      const bTemp = itemTemplates[b.itemCode];
      if (!aTemp || !bTemp) return 0;

      // 2. Sort by Type
      if (aTemp.type !== bTemp.type) {
        return aTemp.type.localeCompare(bTemp.type);
      }

      // 3. Sort by Rarity (Descending)
      const rarityOrder: Record<string, number> = {
        'COMMON': 0,
        'UNCOMMON': 1,
        'RARE': 2,
        'EPIC': 3,
        'LEGENDARY': 4,
        'MYTHIC': 5
      };
      const aRarity = rarityOrder[aTemp.rarity] || 0;
      const bRarity = rarityOrder[bTemp.rarity] || 0;
      if (aRarity !== bRarity) {
        return bRarity - aRarity;
      }

      // 4. Sort by Name
      return aTemp.name.localeCompare(bTemp.name);
    });
  }, [items, selectedCategory, itemTemplates, equippedIds, searchQuery]);

  const gridData = useMemo(() => {
    const data = [...filteredItems];
    // Fill up to at least 40 slots for a better look
    const minSlots = Math.max(40, Math.ceil(data.length / 5) * 5);
    while (data.length < minSlots) data.push(null as any); 
    return data;
  }, [filteredItems]);

  const renderItem = useCallback(({ item, index }: { item: InventoryItem | null, index: number }) => (
    <InventoryItemCell 
      item={item}
      index={index}
      meta={item ? itemTemplates[item.itemCode] : null}
      isEquipped={!!item && equippedIds.includes(item.id)}
      onPress={() => item && setSelectedItem(item)}
    />
  ), [itemTemplates, equippedIds]);

  return (
    <View className="flex-1 bg-void">
      <View 
        className="flex-1 px-4"
        style={{ paddingTop: Math.max(insets.top, 12) }}
      >
        
        <ScreenHeader 
          title="Vault" 
          subtitle="Resource Management" 
          badge={`${items.length}/${TOTAL_SLOTS}`}
        />

        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter your vault..."
        />

        <TabBar 
          tabs={CATEGORIES} 
          activeTab={selectedCategory} 
          onTabChange={setSelectedCategory} 
          className="mb-4"
        />

        {/* 📦 THE GRID */}
        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#ffffff" size="large" />
          </View>
        ) : (
          <FlatList
            data={gridData}
            numColumns={5}
            keyExtractor={(item, index) => item?.id || `empty-${index}`}
            columnWrapperStyle={{ justifyContent: "center", gap: 6, marginBottom: 6 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInventory(); }} tintColor="#ffffff" />}
            renderItem={renderItem}
            initialNumToRender={40}
            maxToRenderPerBatch={40}
            windowSize={5}
            removeClippedSubviews={true}
          />
        )}
      </View>


      {/* 📜 RELIC DETAILS */}
      <ItemDetailModal 
        visible={!!selectedItem} 
        onClose={() => setSelectedItem(null)} 
        item={selectedItem}
        template={selectedItem ? itemTemplates[selectedItem.itemCode] : null}
        isEquipped={selectedItem ? equippedIds.includes(selectedItem.id) : false}
        onEquip={handleEquip}
        onMarketList={() => setIsMarketModalVisible(true)}
      />

      <MarketListModal 
        visible={isMarketModalVisible}
        item={selectedItem}
        onConfirm={handleListOnMarket}
        onCancel={() => setIsMarketModalVisible(false)}
      />
    </View>
  );
}
