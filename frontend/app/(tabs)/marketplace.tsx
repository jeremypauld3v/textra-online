import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi } from "../../api/game";
import { useGameStore } from "../../store/useGameStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

type TabType = "browse" | "mine";

export default function MarketplaceScreen() {
  const itemTemplates = useGameStore((s) => s.items);
  const characterId = useAuthStore((s) => s.characterId);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("browse");

  const fetchListings = useCallback(async () => {
    try {
      const data = await gameApi.getMarket();
      setListings(data.listings);
    } catch (e) {
      console.error("Failed to fetch market", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings])
  );

  const handleBuy = async (listingId: string) => {
    try {
      setBuying(listingId);
      const res = await gameApi.buyItem(listingId);
      Toast.show({ type: "success", text1: "Purchase Complete!", text2: res.message });
      fetchListings();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Purchase Failed", text2: e.response?.data?.error || "Insufficient Gold" });
    } finally {
      setBuying(null);
    }
  };

  const handleCancel = async (listingId: string) => {
    try {
      setBuying(listingId);
      const res = await gameApi.cancelListing(listingId);
      Toast.show({ type: "success", text1: "Cancelled", text2: res.message });
      fetchListings();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Cancel Failed", text2: e.response?.data?.error || "Unknown error" });
    } finally {
      setBuying(null);
    }
  };

  const filteredListings = tab === "mine"
    ? listings.filter(l => l.sellerId === characterId)
    : listings.filter(l => l.sellerId !== characterId);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 px-6 pt-10">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-1">Global Economy</Text>
            <Text className="text-4xl font-black text-white italic uppercase tracking-tighter">Market</Text>
          </View>
          <View className="bg-amber-600/10 px-5 py-2 rounded-2xl border border-amber-500/20">
            <Text className="text-amber-400 font-black italic">5% Tax</Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View className="flex-row mb-8">
          <TouchableOpacity
            onPress={() => setTab("browse")}
            className={`flex-1 py-3 rounded-2xl mr-2 items-center border ${
              tab === "browse" ? "bg-indigo-600 border-indigo-400" : "bg-slate-900 border-slate-800"
            }`}
          >
            <Text className={`font-black uppercase text-[10px] tracking-widest ${
              tab === "browse" ? "text-white" : "text-slate-500"
            }`}>Browse All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab("mine")}
            className={`flex-1 py-3 rounded-2xl ml-2 items-center border ${
              tab === "mine" ? "bg-indigo-600 border-indigo-400" : "bg-slate-900 border-slate-800"
            }`}
          >
            <Text className={`font-black uppercase text-[10px] tracking-widest ${
              tab === "mine" ? "text-white" : "text-slate-500"
            }`}>My Listings</Text>
          </TouchableOpacity>
        </View>

        {/* Listings */}
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => { setRefreshing(true); fetchListings(); }} 
              tintColor="#6366f1" 
            />
          }
          renderItem={({ item: listing }) => {
            const meta = itemTemplates[listing.itemCode];
            const isMine = listing.sellerId === characterId;

            return (
              <View className="bg-slate-900 border border-slate-800 rounded-[32px] p-5 mb-4 flex-row items-center">
                {/* Item Icon */}
                <View className="w-14 h-14 bg-slate-950 rounded-2xl items-center justify-center border border-slate-800 mr-4">
                  <Text className="text-2xl">{meta?.emoji || "\ud83d\udce6"}</Text>
                </View>

                {/* Item Info */}
                <View className="flex-1">
                  <Text className="text-white font-black text-sm uppercase">{meta?.name || listing.itemCode}</Text>
                  <View className="flex-row items-center mt-1">
                    <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mr-3">
                      x{listing.quantity}
                    </Text>
                    <Text className="text-slate-600 font-bold text-[10px]">
                      by {listing.seller?.name || "Unknown"}
                    </Text>
                  </View>
                  {/* Rolled Stats Display */}
                  {(listing.rolledAtk || listing.rolledDef || listing.rolledStr || listing.rolledAgi) && (
                    <View className="flex-row mt-2 space-x-2">
                       {listing.rolledAtk > 0 && <Text className="text-rose-400 font-bold text-[8px] bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/20">ATK +{listing.rolledAtk}</Text>}
                       {listing.rolledDef > 0 && <Text className="text-emerald-400 font-bold text-[8px] bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">DEF +{listing.rolledDef}</Text>}
                       {listing.rolledStr > 0 && <Text className="text-amber-400 font-bold text-[8px] bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">STR +{listing.rolledStr}</Text>}
                       {listing.rolledAgi > 0 && <Text className="text-indigo-400 font-bold text-[8px] bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20">AGI +{listing.rolledAgi}</Text>}
                    </View>
                  )}
                </View>

                {/* Price & Action */}
                <View className="items-end">
                  <Text className="text-amber-400 font-black text-lg">{listing.price}G</Text>
                  {isMine ? (
                    <TouchableOpacity
                      onPress={() => handleCancel(listing.id)}
                      disabled={buying === listing.id}
                      className="mt-1 bg-rose-600/20 border border-rose-500/30 px-4 py-1.5 rounded-xl"
                    >
                      <Text className="text-rose-400 font-black text-[9px] uppercase">
                        {buying === listing.id ? "..." : "Cancel"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleBuy(listing.id)}
                      disabled={buying === listing.id}
                      className="mt-1 bg-indigo-600 px-4 py-1.5 rounded-xl"
                    >
                      <Text className="text-white font-black text-[9px] uppercase">
                        {buying === listing.id ? "..." : "Buy"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="storefront-outline" size={64} color="#1e293b" />
              <Text className="text-slate-600 mt-4 font-bold italic">
                {tab === "mine" ? "You have no active listings" : "No items listed yet..."}
              </Text>
            </View>
          }
          ListFooterComponent={<View className="h-20" />}
        />
      </View>
    </SafeAreaView>
  );
}
