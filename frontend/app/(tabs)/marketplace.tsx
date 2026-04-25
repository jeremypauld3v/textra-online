import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, Pressable, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { gameApi } from "../../api/game";
import { useAuthStore } from "../../store/useAuthStore";
import { useGameStore } from "../../store/useGameStore";

// UI Components
import ScreenHeader from "../../components/ui/ScreenHeader";
import StandardButton from "../../components/ui/StandardButton";

const CATEGORIES = ["ALL", "EQUIPMENT", "CONSUMABLE", "MATERIAL"];

export default function MarketplaceScreen() {
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [selectedType, setSelectedType] = useState("ALL");
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
    return list;
  }, [listings, tab, characterId, selectedType, itemTemplates]);

  const handleBuy = async (listingId: string) => {
    try {
      await gameApi.buyItem(listingId, 1);
      Toast.show({ type: "success", text1: "Acquired Item" });
      fetchListings();
    } catch (e: any) {
      Toast.show({ type: "error", text1: e.response?.data?.error || "Transaction Failed" });
    }
  };

  const handleCancel = async (listingId: string) => {
    try {
      await gameApi.cancelListing(listingId);
      Toast.show({ type: "success", text1: "Listing Removed" });
      fetchListings();
    } catch {
      Toast.show({ type: "error", text1: "Failed to Cancel" });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#020617] justify-center items-center">
        <ActivityIndicator color="#fbbf24" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#020617]">
      <View className="flex-1 px-6 pt-20">
        
        <ScreenHeader 
          title="Market" 
          subtitle="Imperial Exchange" 
        />

        {/* 📑 ANCIENT TABS */}
        <View className="flex-row mb-10 bg-slate-900/40 rounded-2xl p-1.5 border border-white/5">
           <Pressable 
             onPress={() => setTab("browse")} 
             className={`flex-1 py-3.5 items-center rounded-xl ${tab === "browse" ? "bg-slate-800 border border-white/10" : ""}`}
           >
              <Text className={`text-[9px] font-pixel-bold uppercase tracking-widest ${tab === "browse" ? "text-white" : "text-slate-600"}`}>Marketplace</Text>
           </Pressable>
           <Pressable 
             onPress={() => setTab("mine")} 
             className={`flex-1 py-3.5 items-center rounded-xl ${tab === "mine" ? "bg-slate-800 border border-white/10" : ""}`}
           >
              <Text className={`text-[9px] font-pixel-bold uppercase tracking-widest ${tab === "mine" ? "text-white" : "text-slate-600"}`}>My Stall</Text>
           </Pressable>
        </View>

        {/* 🧭 CATEGORY SEALS */}
        <View className="h-12 mb-8 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5">
           <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2">
                 {CATEGORIES.map((cat) => (
                   <Pressable 
                     key={cat} 
                     onPress={() => setSelectedType(cat)} 
                     className={`px-6 py-2 rounded-xl border ${selectedType === cat ? "bg-slate-800 border-white/10" : "border-transparent"}`}
                   >
                      <Text className={`text-[8px] font-pixel-bold uppercase tracking-widest ${selectedType === cat ? "text-white" : "text-slate-600"}`}>{cat}</Text>
                   </Pressable>
                 ))}
              </View>
           </ScrollView>
        </View>

        {/* 📜 MERCHANT LISTINGS */}
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchListings} tintColor="#fbbf24" />}
          renderItem={({ item: l }) => {
            const template = itemTemplates[l.itemCode];
            return (
              <View className="mb-6 bg-slate-900/60 p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
                {/* 🛡️ BACKGROUND TEXTURE */}
                <View style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, backgroundColor: 'rgba(251, 191, 36, 0.03)', borderRadius: 50, transform: [{ scale: 1.5 }] }} />
                
                <View className="flex-row items-center justify-between">
                   <View className="flex-row items-center flex-1">
                      <View className="w-16 h-16 bg-black/40 rounded-2xl items-center justify-center border border-white/10 mr-5">
                         <Text className="text-3xl">{template?.emoji || "📦"}</Text>
                      </View>
                      <View className="flex-1">
                         <Text className="text-white text-lg font-pixel-bold leading-tight mb-1">{template?.name.toUpperCase()}</Text>
                         <Text className="text-slate-600 text-[8px] font-pixel-bold uppercase tracking-[2px]">{template?.type}</Text>
                      </View>
                   </View>
                   
                   <View className="items-end">
                      <View className="flex-row items-center bg-amber-500/5 px-3 py-1 rounded-lg mb-4">
                         <Text className="text-amber-500 text-xl font-pixel-bold mr-2">{l.price}</Text>
                         <Ionicons name="cash" size={14} color="#fbbf24" />
                      </View>
                      
                      {tab === "mine" ? (
                        <StandardButton 
                          label="Cancel"
                          onPress={() => handleCancel(l.id)}
                          variant="danger"
                          size="sm"
                        />
                      ) : (
                        <StandardButton 
                          label="Acquire"
                          onPress={() => handleBuy(l.id)}
                          variant="primary"
                          size="sm"
                        />
                      )}
                   </View>
                </View>
                
                <View className="mt-4 pt-4 border-t border-white/5 flex-row justify-between items-center">
                   <Text className="text-slate-500 text-[8px] font-pixel-bold uppercase tracking-widest">Seller: {l.sellerName}</Text>
                   {template?.rarityId && (
                     <View className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                        <Text className="text-white text-[7px] font-pixel-bold uppercase tracking-[2px] opacity-60">{template.rarityId}</Text>
                     </View>
                   )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 opacity-30">
               <Ionicons name="basket-outline" size={64} color="#475569" />
               <Text className="text-slate-600 text-sm font-pixel-bold uppercase tracking-widest mt-6">No Goods in Sight</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
