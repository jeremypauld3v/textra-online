import { View, Text, Modal, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../context/SocketContext";
import { useGameStore } from "../store/useGameStore";
import { gameApi, InventoryItem } from "../api/game";
import QuantityTradeModal from "@/components/QuantityTradeModal";
import Toast from "react-native-toast-message";

// UI Components
import StandardButton from "@/components/ui/StandardButton";
import ItemIcon from "@/components/ui/ItemIcon";
import ScreenHeader from "@/components/ui/ScreenHeader";

interface TradeModalProps {
  visible: boolean;
  targetUserId: string;
  onClose: () => void;
}

interface OfferItem {
  id: string;
  itemCode: string;
  quantity: number;
}

export default function DirectTradeModal({ visible, targetUserId, onClose }: TradeModalProps) {
  const { socket } = useSocket();
  const itemTemplates = useGameStore((state) => state.items);
  
  // My State
  const [myItems, setMyItems] = useState<OfferItem[]>([]);
  const [myGold, setMyGold] = useState(0);
  const [myLocked, setMyLocked] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Partial Stack Handling
  const [pendingItem, setPendingItem] = useState<InventoryItem | null>(null);

  // Their State (Received via Socket)
  const [theirItems, setTheirItems] = useState<OfferItem[]>([]);
  const [theirGold, setTheirGold] = useState(0);
  const [theirLocked, setTheirLocked] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      const data = await gameApi.getInventory();
      setInventory(data.inventory);
    } catch (e) {
      console.error("Trade Modal: Failed to fetch inventory", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualClose = useCallback(() => {
     if (socket && targetUserId) {
        socket.emit("trade_cancel", { targetUserId });
     }
     onClose();
  }, [socket, targetUserId, onClose]);

  useEffect(() => {
    if (visible && targetUserId) {
       fetchInventory();
    } else if (!visible) {
       // 🧹 SANITIZE STATE ON CLOSE
       setMyItems([]);
       setMyGold(0);
       setMyLocked(false);
       setTheirItems([]);
       setTheirGold(0);
       setTheirLocked(false);
    }
  }, [visible, fetchInventory, targetUserId]);

  useEffect(() => {
    if (!socket || !visible) return;

    // Listen for their updates
    socket.on("trade_sync", (data: any) => {
      if (data.fromUserId === targetUserId) {
        setTheirItems(data.items);
        setTheirGold(data.gold);
        setTheirLocked(data.locked);
      }
    });

    socket.on("trade_complete", (data: any) => {
       if (data.success) {
          Toast.show({ type: "success", text1: "Trade Success", text2: "Transaction completed!" });
          onClose();
       } else {
          Alert.alert("Failed", data.error || "Trade failed");
       }
    });

    socket.on("trade_cancelled", () => {
       onClose();
    });

    return () => {
      socket.off("trade_sync");
      socket.off("trade_complete");
      socket.off("trade_cancelled");
    };
  }, [socket, visible, targetUserId, onClose]);

  // Sync my state to them
  useEffect(() => {
    if (socket && visible && !myLocked) {
      socket.emit("trade_update", {
        toUserId: targetUserId,
        items: myItems,
        gold: myGold,
        locked: myLocked
      });
    }
  }, [myItems, myGold, myLocked, socket, visible, targetUserId]);

  const toggleLock = () => {
    const nextLocked = !myLocked;
    setMyLocked(nextLocked);
    socket?.emit("trade_update", {
      toUserId: targetUserId,
      items: myItems,
      gold: myGold,
      locked: nextLocked
    });
  };

  const commitTrade = () => {
    if (!myLocked || !theirLocked) {
       Alert.alert("Wait", "Both players must lock their offers first.");
       return;
    }
    socket?.emit("trade_commit", {
       targetUserId,
       myItems,
       myGold,
       hisItems: theirItems,
       hisGold: theirGold
    });
  };

  const attemptAddItem = (item: InventoryItem) => {
    if (myLocked) return;
    if (myItems.find(i => i.id === item.id)) return;
    
    // If stackable, show quantity selector
    if (item.quantity > 1) {
       setPendingItem(item);
    } else {
       setMyItems([...myItems, { id: item.id, itemCode: item.itemCode, quantity: 1 }]);
    }
  };

  const confirmQuantity = (qty: number) => {
     if (pendingItem) {
        setMyItems([...myItems, { id: pendingItem.id, itemCode: pendingItem.itemCode, quantity: qty }]);
        setPendingItem(null);
     }
  };

  const removeItem = (id: string) => {
    if (myLocked) return;
    setMyItems(myItems.filter(i => i.id !== id));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View className="flex-1 bg-slate-950 pt-16 px-6">
        <ScreenHeader
           title="Exchange"
           subtitle={`Session • Player ${targetUserId.substring(0,8)}`}
           rightElement={
             <TouchableOpacity onPress={handleManualClose} className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
               <Ionicons name="close" size={24} color="white" />
             </TouchableOpacity>
           }
        />

        {/* 🛡️ TRADE BOOTH */}
        <View className="flex-row space-x-2 mb-4">
                 {/* MY SIDE */}
                 <View className={`flex-1 p-4 rounded-[32px] border ${myLocked ? "bg-indigo-500/5 border-indigo-500/50 shadow-lg shadow-indigo-500/20" : "bg-slate-900 border-white/5"}`}>
                    <View className="flex-row justify-between items-center mb-4 px-1">
                       <Text className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">Your Offer</Text>
                       {myLocked && <Ionicons name="lock-closed" size={14} color="#6366f1" />}
                    </View>
                    <View className="h-40 bg-slate-950/50 rounded-2xl mb-4 p-2 border border-white/5">
                       <FlatList
                         data={myItems}
                         keyExtractor={i => i.id}
                         showsVerticalScrollIndicator={false}
                         renderItem={({ item }) => (
                           <TouchableOpacity onPress={() => removeItem(item.id)} className="flex-row items-center mb-2 bg-slate-900/80 p-2 rounded-xl border border-white/5">
                              <Text className="text-xl mr-2">{itemTemplates[item.itemCode]?.emoji || "📦"}</Text>
                              <View className="flex-1">
                                 <Text className="text-white text-[9px] font-bold uppercase" numberOfLines={1}>{itemTemplates[item.itemCode]?.name}</Text>
                                 <Text className="text-indigo-400 text-[8px] font-black italic">Qty: {item.quantity}</Text>
                              </View>
                           </TouchableOpacity>
                         )}
                       />
                    </View>
                    <View className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex-row items-center">
                       <TextInput 
                         placeholder="Gold" 
                         placeholderTextColor="#334155"
                         keyboardType="numeric"
                         className="flex-1 text-white font-black text-xs text-center"
                         value={myGold > 0 ? myGold.toString() : ""}
                         editable={!myLocked}
                         onChangeText={(v) => {
                            const n = parseInt(v) || 0;
                            setMyGold(n);
                         }}
                       />
                       <Ionicons name="cash" size={14} color="#fbbf24" className="ml-2" />
                    </View>
                 </View>

                 {/* THEIR SIDE */}
                 <View className={`flex-1 p-4 rounded-[32px] border ${theirLocked ? "bg-emerald-500/5 border-emerald-500/50 shadow-lg shadow-emerald-500/20" : "bg-slate-900 border-white/5"}`}>
                    <View className="flex-row justify-between items-center mb-4 px-1">
                       <Text className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">Partner Offer</Text>
                       {theirLocked && <Ionicons name="shield-checkmark" size={14} color="#10b981" />}
                    </View>
                    <View className="h-40 bg-slate-950/50 rounded-2xl mb-4 p-2 border border-white/5">
                       <FlatList
                         data={theirItems}
                         keyExtractor={i => i.id}
                         showsVerticalScrollIndicator={false}
                         renderItem={({ item }) => (
                           <View className="flex-row items-center mb-2 bg-slate-900/80 p-2 rounded-xl border border-white/5">
                              <Text className="text-xl mr-2">{itemTemplates[item.itemCode]?.emoji || "📦"}</Text>
                              <View className="flex-1">
                                 <Text className="text-white text-[9px] font-bold uppercase" numberOfLines={1}>{itemTemplates[item.itemCode]?.name}</Text>
                                 <Text className="text-emerald-400 text-[8px] font-black italic">Qty: {item.quantity}</Text>
                              </View>
                           </View>
                         )}
                       />
                    </View>
                    <View className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 items-center justify-center">
                       <Text className="text-amber-400 font-black italic text-xs text-center">{theirGold} Gold</Text>
                    </View>
                 </View>
        </View>

        {/* 📦 INVENTORY SELECTOR */}
        <View className="flex-1 bg-slate-900/50 rounded-t-[48px] p-6 border-t border-white/5 shadow-2xl">
                 <View className="flex-row justify-between items-center mb-6 px-1">
                    <Text className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Vault Inventory</Text>
                    <View className="bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                       <Text className="text-slate-600 text-[9px] font-bold">{inventory.length} Used</Text>
                    </View>
                 </View>

                 {loading ? <ActivityIndicator color="#6366f1" className="mt-10" /> : (
                   <FlatList
                      data={inventory}
                      numColumns={4}
                      keyExtractor={i => i.id}
                      columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 12 }}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <ItemIcon
                           emoji={itemTemplates[item.itemCode]?.emoji || "📦"}
                           quantity={item.quantity}
                           onPress={() => attemptAddItem(item)}
                           className="w-[22.5%]"
                        />
                      )}
                   />
                 )}
        </View>

        {/* 🚀 ACTION BAR */}
        <View className="pt-4 pb-12 flex-row space-x-3">
                 <StandardButton
                    label={myLocked ? "Revise Offer" : "Lock Proposal"}
                    variant={myLocked ? "warning" : "secondary"}
                    className="flex-1"
                    onPress={toggleLock}
                 />
                 <StandardButton
                    label="Finalize"
                    variant="success"
                    className="flex-1"
                    disabled={!myLocked || !theirLocked}
                    onPress={commitTrade}
                 />
        </View>

        {/* Partial Stack Modal */}
        <QuantityTradeModal
           visible={!!pendingItem}
           item={pendingItem}
           onConfirm={confirmQuantity}
           onCancel={() => setPendingItem(null)}
        />
      </View>
    </Modal>
  );
}
