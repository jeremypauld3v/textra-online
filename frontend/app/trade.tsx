import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../context/SocketContext";
import { useGameStore } from "../store/useGameStore";
import { gameApi, InventoryItem, CharacterStatus } from "../api/game";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import QuantityTradeModal from "@/components/QuantityTradeModal";

// UI Components
import StandardButton from "@/components/ui/StandardButton";
import BaseModal from "@/components/ui/BaseModal";
import StatBadge from "../components/ui/StatBadge";
import ItemIcon from "../components/ui/ItemIcon";
import ScreenHeader from "../components/ui/ScreenHeader";

interface OfferItem {
  id: string;
  itemCode: string;
  quantity: number;
}

export default function TradeScreen() {
  const { socket, tradeWith, setTradeWith } = useSocket();
  const itemTemplates = useGameStore((state) => state.items);
  const router = useRouter();

  const [character, setCharacter] = useState<CharacterStatus | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // My state
  const [myItems, setMyItems] = useState<OfferItem[]>([]);
  const [myGold, setMyGold] = useState(0);
  const [myLocked, setMyLocked] = useState(false);
  const [myFinalized, setMyFinalized] = useState(false);

  // Their state
  const [theirItems, setTheirItems] = useState<OfferItem[]>([]);
  const [theirGold, setTheirGold] = useState(0);
  const [theirLocked, setTheirLocked] = useState(false);
  const [theirFinalized, setTheirFinalized] = useState(false);

  // Modals state
  const [pendingItem, setPendingItem] = useState<InventoryItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<InventoryItem | null>(null);

  const targetUserId = tradeWith ?? "";

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, invRes] = await Promise.all([
        gameApi.getStatus(),
        gameApi.getInventory()
      ]);
      setCharacter(statusRes.character);
      setInventory(invRes.inventory);
    } catch (e) {
      console.error("Trade: Failed to fetch data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (targetUserId) fetchData();
  }, [targetUserId, fetchData]);

  // Filter out equipped items
  const tradableInventory = useMemo(() => {
    if (!character) return inventory;
    const equippedIds = [
      character.equippedWeapon?.id,
      character.equippedChest?.id,
      character.equippedHelmet?.id,
      character.equippedBoots?.id,
      character.equippedGloves?.id,
      character.equippedCape?.id,
      character.equippedNecklace?.id,
      character.equippedRing1?.id,
      character.equippedRing2?.id,
    ].filter(Boolean);
    return inventory.filter(item => !equippedIds.includes(item.id));
  }, [inventory, character]);

  const safeBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/inventory");
    }
  }, [router]);

  const handleClose = useCallback(() => {
    if (socket && targetUserId) {
      socket.emit("trade_cancel", { targetUserId });
    }
    setTradeWith(null);
    safeBack();
  }, [socket, targetUserId, setTradeWith, safeBack]);

  useEffect(() => {
    if (!socket) return;

    socket.on("trade_sync", (data: any) => {
      if (data.fromUserId === targetUserId) {
        setTheirItems(data.items);
        setTheirGold(data.gold);
        setTheirLocked(data.locked);
        setTheirFinalized(data.finalized || false);
        if (!data.finalized) setMyFinalized(false);
      }
    });

    socket.on("trade_complete", (data: any) => {
      if (data.success) {
        Toast.show({ type: 'success', text1: '✅ Trade Complete', text2: 'Transaction completed!' });
        setTradeWith(null);
        safeBack();
      } else {
        Alert.alert("Trade Failed", data.error || "Something went wrong.");
        setMyFinalized(false);
      }
    });

    socket.on("trade_cancelled", () => {
      Toast.show({ type: 'error', text1: 'Trade Cancelled', text2: 'Partner ended the session.' });
      setTradeWith(null);
      safeBack();
    });

    return () => {
      socket.off("trade_sync");
      socket.off("trade_complete");
      socket.off("trade_cancelled");
    };
  }, [socket, targetUserId, setTradeWith, safeBack]);

  useEffect(() => {
    if (socket && targetUserId && !myLocked) {
      socket.emit("trade_update", {
        toUserId: targetUserId,
        items: myItems,
        gold: myGold,
        locked: myLocked,
      });
    }
  }, [myItems, myGold, myLocked, socket, targetUserId]);

  const toggleLock = () => {
    if (myFinalized) return;
    const next = !myLocked;
    setMyLocked(next);
    socket?.emit("trade_update", {
      toUserId: targetUserId,
      items: myItems,
      gold: myGold,
      locked: next,
    });
  };

  const commitTrade = () => {
    if (!myLocked || !theirLocked) {
      Alert.alert("Wait", "Both players must lock their offers first.");
      return;
    }
    setMyFinalized(true);
    socket?.emit("trade_commit", { targetUserId });
  };

  const attemptAddItem = (item: InventoryItem) => {
    if (myLocked || myItems.find(i => i.id === item.id)) return;
    if (item.quantity > 1) {
      setPendingItem(item);
    } else {
      setMyItems(prev => [...prev, { id: item.id, itemCode: item.itemCode, quantity: 1 }]);
    }
  };

  const confirmQuantity = (qty: number) => {
    if (pendingItem) {
      setMyItems(prev => [...prev, { id: pendingItem.id, itemCode: pendingItem.itemCode, quantity: qty }]);
      setPendingItem(null);
    }
  };

  const removeItem = (id: string) => {
    if (!myLocked) setMyItems(prev => prev.filter(i => i.id !== id));
  };

  useEffect(() => {
    if (!targetUserId) {
      safeBack();
    }
  }, [targetUserId, safeBack]);

  if (!targetUserId) return null;

  return (
    <View className="flex-1 bg-black">
      <View className="flex-1 px-6 pt-20">
        {/* ── Header ── */}
        <ScreenHeader
          title="Exchange"
          subtitle={`Session · ${targetUserId.substring(0, 8)}`}
          rightElement={
            <TouchableOpacity onPress={handleClose} className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          }
        />

      {/* ── Trade Booth ── */}
      <View className="flex-row space-x-2 mb-4">
        {/* My Side */}
        <View className={`flex-1 p-4 rounded-[32px] bg-slate-900 border ${
          myFinalized ? "border-emerald-500 bg-emerald-500/5" : myLocked ? "border-white bg-white/5" : "border-slate-800"
        }`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-[10px] uppercase tracking-widest font-sans">Your Offer</Text>
            {myFinalized ? (
               <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            ) : myLocked ? (
               <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
            ) : null}
          </View>
          
          <View className="h-32 bg-slate-950/50 rounded-2xl p-2 mb-3 border border-slate-800/50">
            <FlatList
              data={myItems}
              keyExtractor={i => i.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => removeItem(item.id)} className="flex-row items-center mb-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800/50">
                  <Text className="text-lg mr-2">{itemTemplates[item.itemCode]?.emoji || "📦"}</Text>
                  <View className="flex-1">
                    <Text className="text-white text-[9px] uppercase font-sans" numberOfLines={1}>{itemTemplates[item.itemCode]?.name}</Text>
                    <Text className="text-white text-[8px] font-sans">x{item.quantity}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
          
          <View className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex-row items-center">
             <TextInput
               placeholder="Gold"
               placeholderTextColor="#334155"
               keyboardType="numeric"
               className="flex-1 text-white text-xs text-center font-sans"
               value={myGold > 0 ? myGold.toString() : ""}
               editable={!myLocked}
               onChangeText={v => setMyGold(parseInt(v) || 0)}
             />
             <Ionicons name="cash" size={12} color="#fbbf24" className="ml-2" />
          </View>
        </View>

        {/* Their Side */}
        <View className={`flex-1 p-4 rounded-[32px] bg-slate-900 border ${
          theirFinalized ? "border-emerald-500 bg-emerald-500/5" : theirLocked ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800"
        }`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-emerald-400 text-[10px] uppercase tracking-widest font-sans">Partner Offer</Text>
            {theirFinalized ? (
               <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            ) : theirLocked ? (
               <Ionicons name="shield-checkmark" size={12} color="#10b981" />
            ) : null}
          </View>
          
          <View className="h-32 bg-slate-950/50 rounded-2xl p-2 mb-3 border border-slate-800/50">
            <FlatList
              data={theirItems}
              keyExtractor={i => i.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                   onPress={() => setDetailsItem(item as any)} 
                   className="flex-row items-center mb-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800/50"
                >
                  <Text className="text-lg mr-2">{itemTemplates[item.itemCode]?.emoji || "📦"}</Text>
                  <View className="flex-1">
                    <Text className="text-white text-[9px] uppercase font-sans" numberOfLines={1}>{itemTemplates[item.itemCode]?.name}</Text>
                    <Text className="text-emerald-400 text-[8px] font-sans">x{item.quantity}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
          
          <View className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 items-center justify-center">
             <Text className="text-amber-400 text-xs font-sans">{theirGold} Gold</Text>
          </View>
        </View>
      </View>

      {/* ── Inventory ── */}
      <View className="flex-1 bg-slate-900/50 rounded-[40px] p-6 mb-4 border border-slate-800/50">
        <View className="flex-row justify-between items-center mb-6 px-1">
          <Text className="text-slate-500 text-[10px] uppercase tracking-[2px] font-sans">Inventory</Text>
          <View className="bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
            <Text className="text-slate-600 text-[9px] font-sans">{tradableInventory.length} Items</Text>
          </View>
        </View>
        
        {loading ? (
          <ActivityIndicator color="#FFFFFF" className="mt-10" />
        ) : (
          <FlatList
            data={tradableInventory}
            numColumns={4}
            keyExtractor={i => i.id}
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ItemIcon
                emoji={itemTemplates[item.itemCode]?.emoji || "📦"}
                quantity={item.quantity}
                onPress={() => setDetailsItem(item)}
                className="w-[22.5%]"
              />
            )}
          />
        )}
      </View>

      {/* ── Action Bar ── */}
      <View className="flex-row mb-6 space-x-3">
        <StandardButton
          label={myLocked ? "Revise Offer" : "Lock Proposal"}
          onPress={toggleLock}
          disabled={myFinalized}
          variant={myLocked ? "warning" : "secondary"}
          className="flex-1"
          size="sm"
        />
        <StandardButton
          label={myFinalized ? "Awaiting Partner..." : "Finalize Trade"}
          onPress={commitTrade}
          loading={myFinalized && theirFinalized}
          disabled={!myLocked || !theirLocked || myFinalized}
          variant={myLocked && theirLocked ? "success" : "ghost"}
          className="flex-1"
          size="sm"
        />
      </View>

      {/* 📦 QUANTITY MODAL */}
      <QuantityTradeModal
        visible={!!pendingItem}
        item={pendingItem}
        onConfirm={confirmQuantity}
        onCancel={() => setPendingItem(null)}
      />

      {/* 🔍 DETAILS MODAL */}
      <BaseModal
        visible={!!detailsItem}
        onClose={() => setDetailsItem(null)}
      >
        {detailsItem && (
          (() => {
            const meta = itemTemplates[detailsItem.itemCode];
            const isMine = inventory.some(i => i.id === detailsItem.id);
            const inTrade = myItems.some(i => i.id === detailsItem.id);
            return (
              <>
                <View className="items-center mb-6">
                  <ItemIcon emoji={meta?.emoji || "📦"} size="lg" rarity={meta?.rarityId} className="mb-4" />
                  <Text className="text-white text-2xl uppercase text-center font-sans">{meta?.name}</Text>
                  <Text className="text-slate-500 text-[10px] uppercase tracking-widest mt-1 font-sans">{meta?.type || "Standard"}</Text>
                </View>

                {(detailsItem.rolledAtk || detailsItem.rolledDef || detailsItem.rolledStr || detailsItem.rolledAgi) ? (
                   <View className="flex-row justify-center space-x-2 mb-8">
                     <StatBadge type="atk" value={detailsItem.rolledAtk ?? 0} />
                     <StatBadge type="def" value={detailsItem.rolledDef ?? 0} />
                     <StatBadge type="str" value={detailsItem.rolledStr ?? 0} />
                     <StatBadge type="agi" value={detailsItem.rolledAgi ?? 0} />
                   </View>
                ) : null}

                <Text className="text-slate-400 text-center mb-10 leading-relaxed px-4 font-sans">
                  &quot;{meta?.description || "A solid item found in the wild. Perfect for trading or personal use."}&quot;
                </Text>

                {isMine && !inTrade && (
                  <StandardButton
                    label="Add to Offer"
                    variant="primary"
                    onPress={() => {
                      attemptAddItem(detailsItem);
                      setDetailsItem(null);
                    }}
                  />
                )}
                
                <StandardButton
                  label="Close"
                  variant="secondary"
                  className="mt-3"
                  onPress={() => setDetailsItem(null)}
                />
              </>
            );
          })()
        )}
      </BaseModal>
      </View>
    </View>
  );
}
