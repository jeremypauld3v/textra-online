import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { gameApi } from "../../api/game";
import { useAuthStore } from "../../store/useAuthStore";
import { useGameStore } from "../../store/useGameStore";

// UI Components
import BaseModal from "../../components/ui/BaseModal";
import FilterButton from "../../components/ui/FilterButton";
import ItemIcon from "../../components/ui/ItemIcon";
import ScreenHeader from "../../components/ui/ScreenHeader";
import StandardButton from "../../components/ui/StandardButton";
import StatBadge from "../../components/ui/StatBadge";

type TabType = "browse" | "mine";

export default function MarketplaceScreen() {
  const itemTemplates = useGameStore((s) => s.items);
  const characterId = useAuthStore((s) => s.characterId);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [tab, setTab] = useState<TabType>("browse");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedRarity, setSelectedRarity] = useState("ALL");

  // Buy Modal States
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [buyQty, setBuyQty] = useState("1");

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
    }, [fetchListings]),
  );

  const handleConfirmBuy = async () => {
    if (!selectedListing) return;
    const qty = parseInt(buyQty);
    if (isNaN(qty) || qty <= 0 || qty > selectedListing.quantity) {
      Toast.show({ type: "error", text1: "Invalid Quantity" });
      return;
    }

    try {
      setIsActionLoading(true);
      const res = await gameApi.buyItem(selectedListing.id, qty);
      Toast.show({
        type: "success",
        text1: "Purchase Complete!",
        text2: res.message,
      });
      setIsBuyModalVisible(false);
      setSelectedListing(null);
      fetchListings();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Purchase Failed",
        text2: e.response?.data?.error || "Insufficient Gold",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async (listingId: string) => {
    try {
      setIsActionLoading(true);
      const res = await gameApi.cancelListing(listingId);
      Toast.show({ type: "success", text1: "Cancelled", text2: res.message });
      fetchListings();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Cancel Failed",
        text2: e.response?.data?.error || "Unknown error",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredListings = useMemo(() => {
    let list = listings;

    // Phase 1: Filter by tab (mine vs others)
    list =
      tab === "mine"
        ? list.filter((l) => l.sellerId === characterId)
        : list.filter((l) => l.sellerId !== characterId);

    // Phase 2: Search Query
    if (searchQuery) {
      list = list.filter((l) => {
        const meta = itemTemplates[l.itemCode];
        return meta?.name?.toLowerCase()?.includes(searchQuery.toLowerCase());
      });
    }

    // Phase 3: Type Filter
    if (selectedType !== "ALL") {
      list = list.filter((l) => {
        const meta = itemTemplates[l.itemCode];
        return meta?.type === selectedType;
      });
    }

    // Phase 4: Rarity Filter
    if (selectedRarity !== "ALL") {
      list = list.filter((l) => {
        const meta = itemTemplates[l.itemCode];
        return meta?.rarityId === selectedRarity;
      });
    }

    return list;
  }, [
    listings,
    tab,
    characterId,
    searchQuery,
    selectedType,
    selectedRarity,
    itemTemplates,
  ]);

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
        <ScreenHeader title="Market" subtitle="Global Economy" badge="5% Tax" />

        {/* Tab Bar Container */}
        <View className="flex-row mb-8">
          <StandardButton
            label="Browse All"
            className="flex-1 mr-2"
            variant={tab === "browse" ? "primary" : "secondary"}
            size="sm"
            onPress={() => setTab("browse")}
          />
          <StandardButton
            label="My Listings"
            className="flex-1 ml-2"
            variant={tab === "mine" ? "primary" : "secondary"}
            size="sm"
            onPress={() => setTab("mine")}
          />
        </View>

        <FilterButton
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          selectedRarity={selectedRarity}
          setSelectedRarity={setSelectedRarity}
        />

        {/* Listings */}
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchListings();
              }}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item: listing }) => {
            const meta = itemTemplates[listing.itemCode];
            const isMine = listing.sellerId === characterId;

            return (
              <View className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 mb-2 flex-row items-center">
                {/* Icon */}
                <ItemIcon
                  emoji={meta?.emoji || "📦"}
                  rarity={meta?.rarityId}
                  className="mr-3"
                  size="sm"
                />

                {/* Details */}
                <View className="flex-1">
                  <Text
                    className="text-white font-bold text-xs italic uppercase tracking-tight leading-tight font-sans"
                    numberOfLines={1}
                  >
                    {meta?.name}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons
                      name="cash-outline"
                      size={10}
                      color="#fbbf24"
                      style={{ marginRight: 4 }}
                    />
                    <Text className="text-amber-400 font-bold text-[10px] font-sans">
                      {listing.price}G
                    </Text>
                    <Text className="text-slate-600 text-[8px] ml-2 font-bold uppercase tracking-tighter font-sans">
                      x{listing.quantity}
                    </Text>
                  </View>
                </View>

                {/* Stats Preview (if any) */}
                <View className="flex-row space-x-1 mr-3">
                  {listing.rolledAtk > 0 && (
                    <StatBadge type="atk" value={listing.rolledAtk} size="xs" />
                  )}
                  {listing.rolledDef > 0 && (
                    <StatBadge type="def" value={listing.rolledDef} size="xs" />
                  )}
                  {listing.rolledStr > 0 && (
                    <StatBadge type="str" value={listing.rolledStr} size="xs" />
                  )}
                  {listing.rolledLuk > 0 && (
                    <StatBadge
                      type="luck"
                      value={listing.rolledLuk}
                      size="xs"
                    />
                  )}
                </View>

                {/* Actions */}
                <TouchableOpacity
                  onPress={() => {
                    if (isMine) handleCancel(listing.id);
                    else {
                      setSelectedListing(listing);
                      setIsBuyModalVisible(true);
                    }
                  }}
                  disabled={isActionLoading}
                  className={`px-4 py-2 rounded-xl border ${
                    isMine
                      ? "bg-slate-800 border-slate-700"
                      : "bg-white border-white"
                  } ${isActionLoading ? "opacity-40" : ""}`}
                >
                  <Text className={`font-bold uppercase text-[8px] tracking-widest leading-none font-sans ${isMine ? 'text-white' : 'text-black'}`}>
                    {isMine ? "Mine" : "Buy"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="storefront-outline" size={64} color="#1e293b" />
              <Text className="text-slate-600 mt-4 font-bold italic font-sans">
                {tab === "mine"
                  ? "You have no active listings"
                  : "No items listed yet..."}
              </Text>
            </View>
          }
          ListFooterComponent={<View className="h-20" />}
        />
      </View>

      {/* 🛍️ BUY MODAL */}
      <BaseModal
        visible={isBuyModalVisible}
        onClose={() => setIsBuyModalVisible(false)}
        position="bottom"
        title="Purchase Items"
      >
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-slate-500 font-bold uppercase text-[10px] tracking-widest font-sans">
            Market Listing
          </Text>
          <View className="bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
            <Text className="text-amber-400 font-bold text-xs font-sans">
              {selectedListing?.price} G / Unit
            </Text>
          </View>
        </View>

        {/* Quantity Input */}
        <View className="mb-10">
          <Text className="text-slate-500 font-bold uppercase text-[10px] mb-3 ml-1 tracking-widest font-sans">
            How many to buy? (Max: {selectedListing?.quantity})
          </Text>
          <View className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 flex-row items-center">
            <TextInput
              className="flex-1 text-white font-bold text-lg font-sans"
              value={buyQty}
              onChangeText={setBuyQty}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor="#334155"
            />
            <Ionicons name="cart-outline" size={20} color="#475569" />
          </View>
        </View>

        {/* Summary */}
        <View className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8">
          <View className="flex-row justify-between items-center">
            <Text className="text-white font-bold uppercase text-[10px] tracking-widest font-sans">
              Total cost
            </Text>
            <Text className="text-white font-bold text-xl italic font-sans">
              {(parseInt(buyQty) || 0) * (selectedListing?.price || 0)}G
            </Text>
          </View>
        </View>

        <View className="flex-row pb-6">
          <StandardButton
            label="Cancel"
            variant="secondary"
            className="flex-1 mr-2"
            onPress={() => setIsBuyModalVisible(false)}
          />
          <StandardButton
            label={isActionLoading ? "..." : "Confirm Purchase"}
            variant="primary"
            className="flex-2 ml-2"
            loading={isActionLoading}
            onPress={handleConfirmBuy}
          />
        </View>
      </BaseModal>
    </SafeAreaView>
  );
}
