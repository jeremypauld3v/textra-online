import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, memo } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { gameApi } from "../../api/game";
import { useAuthStore } from "../../store/useAuthStore";
import { useGameStore } from "../../store/useGameStore";

// UI Components
import ScreenHeader from "../../components/ui/ScreenHeader";
import StandardButton from "../../components/ui/StandardButton";
import TabBar from "../../components/ui/TabBar";
import Card from "../../components/ui/Card";
import SearchBar from "../../components/ui/SearchBar";

const CATEGORIES = ["ALL", "EQUIPMENT", "CONSUMABLE", "MATERIAL"];

// -----------------------------------------------------------------------------
// 🧩 MEMOIZED LISTING CARD
// -----------------------------------------------------------------------------
const MarketplaceListingCard = memo(({ 
  listing, 
  index, 
  template, 
  isMine, 
  onBuy, 
  onCancel 
}: { 
  listing: any; 
  index: number; 
  template: any; 
  isMine: boolean; 
  onBuy: (id: string) => void; 
  onCancel: (id: string) => void; 
}) => {
  return (
    <Card delay={index < 10 ? index * 15 : 0} className="mb-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 bg-white/5 rounded-xl items-center justify-center border border-white/10 mr-4">
            <Text className="text-2xl">{template?.emoji || "📦"}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-pixel-bold leading-tight mb-0.5">{template?.name.toUpperCase()}</Text>
            <Text className="text-white/30 text-[8px] font-pixel-bold uppercase tracking-[1px]">{template?.type}</Text>
          </View>
        </View>
        
        <View className="items-end">
          <View className="flex-row items-center bg-white/5 px-2.5 py-1 rounded-lg mb-2 border border-white/10">
            <Text className="text-white text-base font-pixel-bold mr-1.5">{listing.price}</Text>
            <Ionicons name="cash" size={12} color="rgba(255, 255, 255, 0.6)" />
          </View>
          
          {isMine ? (
            <StandardButton 
              label="Cancel"
              onPress={() => onCancel(listing.id)}
              variant="danger"
              size="sm"
            />
          ) : (
            <StandardButton 
              label="Acquire"
              onPress={() => onBuy(listing.id)}
              variant="primary"
              size="sm"
            />
          )}
        </View>
      </View>
      
      <View className="mt-3 pt-3 border-t border-white/[0.04] flex-row justify-between items-center">
        <Text className="text-white/30 text-[8px] font-pixel-bold uppercase tracking-widest">Seller: {listing.sellerName}</Text>
        {template?.rarityId && (
          <View className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
            <Text className="text-white/50 text-[7px] font-pixel-bold uppercase tracking-[1px]">{template.rarityId}</Text>
          </View>
        )}
      </View>
    </Card>
  );
});
MarketplaceListingCard.displayName = "MarketplaceListingCard";

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const itemTemplates = useGameStore((s) => s.items);
  const characterId = useAuthStore((s) => s.characterId);

  const fetchListings = useCallback(async () => {
    try {
      const data = await gameApi.getMarket();
      setListings(data.listings);
    } catch {
      Toast.show({ type: "error", text1: "Market Closed" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchListings(); }, [fetchListings]));

  const filteredListings = useMemo(() => {
    let list = listings;
    list = tab === "mine" ? list.filter((l) => l.sellerId === characterId) : list.filter((l) => l.sellerId !== characterId);
    if (selectedType !== "ALL") list = list.filter((l) => itemTemplates[l.itemCode]?.type === selectedType);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) => {
        const meta = itemTemplates[l.itemCode];
        return meta?.name.toLowerCase().includes(q) || l.itemCode.toLowerCase().includes(q);
      });
    }
    return list;
  }, [listings, tab, characterId, selectedType, itemTemplates, searchQuery]);

  const handleBuy = useCallback(async (listingId: string) => {
    try {
      await gameApi.buyItem(listingId, 1);
      Toast.show({ type: "success", text1: "Acquired Item" });
      fetchListings();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.error || "Transaction Failed" });
    }
  }, [fetchListings]);

  const handleCancel = useCallback(async (listingId: string) => {
    try {
      await gameApi.cancelListing(listingId);
      Toast.show({ type: "success", text1: "Listing Removed" });
      fetchListings();
    } catch {
      Toast.show({ type: "error", text1: "Failed to Cancel" });
    }
  }, [fetchListings]);

  const renderItem = useCallback(({ item: l, index }: { item: any, index: number }) => (
    <MarketplaceListingCard 
      listing={l}
      index={index}
      template={itemTemplates[l.itemCode]}
      isMine={tab === "mine"}
      onBuy={handleBuy}
      onCancel={handleCancel}
    />
  ), [itemTemplates, tab, handleBuy, handleCancel]);

  if (loading) {
    return (
      <View className="flex-1 bg-void justify-center items-center">
        <ActivityIndicator color="#A78BFA" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void">
      <View 
        className="flex-1 px-6"
        style={{ paddingTop: Math.max(insets.top, 12) }}
      >
        <ScreenHeader 
          title="Market" 
          subtitle="Imperial Exchange" 
        />

        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search listings..."
        />

        <TabBar 
          tabs={["browse", "mine"] as const} 
          activeTab={tab} 
          onTabChange={setTab} 
          className="mb-3"
        />

        <TabBar 
          tabs={CATEGORIES} 
          activeTab={selectedType} 
          onTabChange={setSelectedType} 
          className="mb-4"
        />

        {/* 📜 MERCHANT LISTINGS */}
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchListings} tintColor="#ffffff" />}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 opacity-20">
               <Ionicons name="basket-outline" size={48} color="#ffffff" />
               <Text className="text-white/40 text-[9px] font-pixel-bold uppercase tracking-widest mt-4">No Goods in Sight</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
