import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, StyleSheet, Modal, ScrollView } from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../context/SocketContext";
import { useGameStore } from "../store/useGameStore";
import { gameApi, InventoryItem, CharacterStatus } from "../api/game";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import QuantityTradeModal from "../components/QuantityTradeModal";

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
        // If they unlocked/changed, backend resets our finalized status too
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

  // Sync my offer to partner whenever it changes
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

  // Guard: if no active trade partner, navigate back safely (can't call router.back() during render)
  useEffect(() => {
    if (!targetUserId) {
      safeBack();
    }
  }, [targetUserId, safeBack]);

  if (!targetUserId) return null;

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Exchange</Text>
          <Text style={styles.subtitle}>Active Session · {targetUserId.substring(0, 8)}</Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* ── Trade Booth ── */}
      <View style={styles.booth}>
        {/* My Side */}
        <View style={[styles.side, myLocked && styles.sideLocked, myFinalized && styles.sideFinalized]}>
          <View style={styles.sideHeader}>
            <Text style={styles.sideTitle}>Your Offer</Text>
            {myFinalized ? (
               <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            ) : myLocked ? (
               <Ionicons name="lock-closed" size={12} color="#6366f1" />
            ) : null}
          </View>
          <View style={styles.itemBox}>
            <FlatList
              data={myItems}
              keyExtractor={i => i.id}
              nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.itemRow}>
                  <Text style={styles.itemEmoji}>{itemTemplates[item.itemCode]?.emoji || '📦'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{itemTemplates[item.itemCode]?.name}</Text>
                    <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
          <TextInput
            placeholder="Gold"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            style={styles.goldInput}
            value={myGold > 0 ? myGold.toString() : ""}
            editable={!myLocked}
            onChangeText={v => setMyGold(parseInt(v) || 0)}
          />
        </View>

        {/* Their Side */}
        <View style={[styles.side, theirLocked && styles.sideLockedThem, theirFinalized && styles.sideFinalizedThem]}>
          <View style={styles.sideHeader}>
            <Text style={[styles.sideTitle, { color: '#10b981' }]}>Partner Offer</Text>
            {theirFinalized ? (
               <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            ) : theirLocked ? (
               <Ionicons name="shield-checkmark" size={12} color="#10b981" />
            ) : null}
          </View>
          <View style={styles.itemBox}>
            <FlatList
              data={theirItems}
              keyExtractor={i => i.id}
              nestedScrollEnabled
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {
                   // Let users see details of partner items TOO
                   setDetailsItem(item as any);
                }} style={styles.itemRow}>
                  <Text style={styles.itemEmoji}>{itemTemplates[item.itemCode]?.emoji || '📦'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>{itemTemplates[item.itemCode]?.name}</Text>
                    <Text style={[styles.itemQty, { color: '#10b981' }]}>Qty: {item.quantity}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
          <View style={styles.goldDisplay}>
            <Text style={styles.goldDisplayText}>{theirGold} G</Text>
          </View>
        </View>
      </View>

      {/* ── Inventory ── */}
      <View style={styles.inventorySection}>
        <View style={styles.invHeader}>
          <Text style={styles.invTitle}>Your Inventory (Unequipped)</Text>
          <View style={styles.invBadge}>
            <Text style={styles.invBadgeText}>{tradableInventory.length} Slots</Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={tradableInventory}
            numColumns={4}
            keyExtractor={i => i.id}
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setDetailsItem(item)} style={styles.invSlot} activeOpacity={0.7}>
                <Text style={{ fontSize: 24 }}>{itemTemplates[item.itemCode]?.emoji || '📦'}</Text>
                {item.quantity > 1 && (
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{item.quantity}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* ── Action Bar ── */}
      <View style={styles.actionBar}>
        <TouchableOpacity onPress={toggleLock} disabled={myFinalized} style={[styles.actionBtn, myLocked ? styles.actionBtnLocked : styles.actionBtnDefault, myFinalized && { opacity: 0.5 }]}>
          <Text style={styles.actionBtnText}>{myLocked ? "Revise Offer" : "Lock Proposal"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={commitTrade}
          disabled={!myLocked || !theirLocked || myFinalized}
          style={[styles.actionBtn, myLocked && theirLocked ? (myFinalized ? styles.actionBtnFinalized : styles.actionBtnFinalize) : styles.actionBtnDisabled]}
        >
          <Text style={styles.actionBtnText}>
             {myFinalized ? "Awaiting Partner..." : "Finalize"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 📦 QUANTITY MODAL */}
      <QuantityTradeModal
        visible={!!pendingItem}
        item={pendingItem}
        onConfirm={confirmQuantity}
        onCancel={() => setPendingItem(null)}
      />

      {/* 🔍 DETAILS MODAL */}
      <Modal visible={!!detailsItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <View style={styles.detailsBox}>
              <View style={styles.detailsHeader}>
                 <Text style={{ fontSize: 40 }}>{detailsItem && itemTemplates[detailsItem.itemCode]?.emoji}</Text>
                 <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={styles.detailsName}>{detailsItem && itemTemplates[detailsItem.itemCode]?.name}</Text>
                    <Text style={styles.detailsType}>{detailsItem && itemTemplates[detailsItem.itemCode]?.type || "Common Item"}</Text>
                 </View>
                 <TouchableOpacity onPress={() => setDetailsItem(null)} style={styles.detailsClose}>
                    <Ionicons name="close" size={20} color="white" />
                 </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 200, marginTop: 16 }}>
                 <View style={styles.statsGrid}>
                    <StatItem label="ATK" value={detailsItem?.rolledAtk} color="#ef4444" />
                    <StatItem label="DEF" value={detailsItem?.rolledDef} color="#3b82f6" />
                    <StatItem label="STR" value={detailsItem?.rolledStr} color="#f59e0b" />
                    <StatItem label="AGI" value={detailsItem?.rolledAgi} color="#10b981" />
                 </View>
                 <Text style={styles.detailsDescription}>
                    {detailsItem && itemTemplates[detailsItem.itemCode]?.description || "A solid item found in the wild. Perfect for trading or personal use."}
                 </Text>
              </ScrollView>

              {/* Only show "Add to Trade" if it's our item and not already in trade */}
              {detailsItem && inventory.find(i => i.id === detailsItem.id) && !myItems.find(i => i.id === detailsItem.id) && (
                 <TouchableOpacity 
                   onPress={() => {
                     attemptAddItem(detailsItem);
                     setDetailsItem(null);
                   }} 
                   style={styles.addBtn}
                 >
                    <Text style={styles.addBtnText}>Add to Offer</Text>
                 </TouchableOpacity>
              )}
           </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function StatItem({ label, value, color }: { label: string, value?: number | null, color: string }) {
   if (value === undefined || value === null) return null;
   return (
      <View style={[styles.statItem, { borderColor: color + '40' }]}>
         <Text style={[styles.statValue, { color }]}>{value > 0 ? `+${value}` : value}</Text>
         <Text style={styles.statLabel}>{label}</Text>
      </View>
   );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  title: { color: 'white', fontSize: 28, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' },
  subtitle: { color: '#475569', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  closeBtn: { backgroundColor: '#1e293b', padding: 10, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  booth: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  side: { flex: 1, padding: 12, borderRadius: 24, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b' },
  sideLocked: { backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.4)' },
  sideLockedThem: { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.4)' },
  sideFinalized: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: '#10b981' },
  sideFinalizedThem: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: '#10b981' },
  sideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sideTitle: { color: '#818cf8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  itemBox: { height: 120, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 6, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, backgroundColor: 'rgba(51,65,85,0.5)', padding: 6, borderRadius: 10 },
  itemEmoji: { fontSize: 18, marginRight: 6 },
  itemName: { color: 'white', fontSize: 9, fontWeight: '700' },
  itemQty: { color: '#818cf8', fontSize: 8, fontWeight: '900', fontStyle: 'italic' },
  goldInput: { color: 'white', fontWeight: '900', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', fontSize: 11, textAlign: 'center' },
  goldDisplay: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#1e293b' },
  goldDisplayText: { color: '#fbbf24', fontWeight: '900', fontStyle: 'italic', fontSize: 11, textAlign: 'center' },
  inventorySection: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: 32, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b' },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  invTitle: { color: '#475569', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 },
  invBadge: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: '#334155' },
  invBadgeText: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  invSlot: { width: '23%', aspectRatio: 1, backgroundColor: '#1e293b', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  qtyBadge: { position: 'absolute', bottom: 3, right: 3, backgroundColor: '#6366f1', paddingHorizontal: 4, borderRadius: 6 },
  qtyBadgeText: { color: 'white', fontSize: 8, fontWeight: '900' },
  actionBar: { flexDirection: 'row', gap: 10, paddingBottom: 10 },
  actionBtn: { flex: 1, padding: 18, borderRadius: 24, alignItems: 'center' },
  actionBtnDefault: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  actionBtnLocked: { backgroundColor: '#d97706', borderWidth: 1, borderColor: '#f59e0b' },
  actionBtnFinalize: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  actionBtnFinalized: { backgroundColor: '#059669' },
  actionBtnDisabled: { backgroundColor: '#1e293b', opacity: 0.4 },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  detailsBox: { backgroundColor: '#0f172a', width: '100%', borderRadius: 40, padding: 24, borderWidth: 1, borderColor: '#1e293b' },
  detailsHeader: { flexDirection: 'row', alignItems: 'center' },
  detailsName: { color: 'white', fontSize: 24, fontWeight: '900' },
  detailsType: { color: '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  detailsClose: { backgroundColor: '#1e293b', padding: 8, borderRadius: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statItem: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  detailsDescription: { color: '#94a3b8', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  addBtn: { backgroundColor: '#6366f1', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 24 },
  addBtnText: { color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
});
