import { View, Text, Modal, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../context/SocketContext";
import { useGameStore } from "../store/useGameStore";
import { gameApi, InventoryItem } from "../api/game";
import QuantityTradeModal from "./QuantityTradeModal";
import TradeHistoryView from "./TradeHistoryView";

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
  
  // Tabs: TRADE | HISTORY
  const [activeTab, setActiveTab] = useState<"TRADE" | "HISTORY">("TRADE");

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchInventory();
  }, [visible, fetchInventory]);

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
          Alert.alert("Success", "Trade completed successfully!");
          onClose();
       } else {
          Alert.alert("Failed", data.error || "Trade failed");
       }
    });

    return () => {
      socket.off("trade_sync");
      socket.off("trade_complete");
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
      <View className="flex-1 bg-slate-950 pt-20 px-6">
        <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-white text-3xl font-black italic uppercase">Exchange</Text>
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">Active Session with Player {targetUserId.substring(0,6)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="bg-slate-900 p-2 rounded-full border border-slate-800">
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
        </View>

        {/* Tab System */}
        <View className="flex-row bg-slate-900 rounded-2xl p-1 mb-8">
           <TouchableOpacity 
             onPress={() => setActiveTab("TRADE")}
             className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'TRADE' ? 'bg-indigo-600' : ''}`}
           >
              <Text className={`font-black uppercase text-[10px] tracking-widest ${activeTab === 'TRADE' ? 'text-white' : 'text-slate-500'}`}>Trade Booth</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             onPress={() => setActiveTab("HISTORY")}
             className={`flex-1 py-3 rounded-xl items-center ${activeTab === 'HISTORY' ? 'bg-indigo-600' : ''}`}
           >
              <Text className={`font-black uppercase text-[10px] tracking-widest ${activeTab === 'HISTORY' ? 'text-white' : 'text-slate-500'}`}>History</Text>
           </TouchableOpacity>
        </View>

        {activeTab === "HISTORY" ? (
           <TradeHistoryView />
        ) : (
           <>
              {/* 🛡️ TRADE BOOTH */}
              <View className="flex-row space-x-2 mb-4">
                 {/* MY SIDE */}
                 <View className={`flex-1 p-3 rounded-[24px] border ${myLocked ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-900 border-slate-800'}`}>
                    <View className="flex-row justify-between items-center mb-2">
                       <Text className="text-indigo-400 font-black text-[9px] uppercase tracking-tighter">Your Offer</Text>
                       {myLocked && <Ionicons name="lock-closed" size={10} color="#6366f1" />}
                    </View>
                    <View className="h-32 bg-black/20 rounded-xl mb-2 p-2 border border-white/5">
                       <FlatList
                         data={myItems}
                         keyExtractor={i => i.id}
                         nestedScrollEnabled
                         renderItem={({ item }) => (
                           <TouchableOpacity onPress={() => removeItem(item.id)} className="flex-row items-center mb-2 bg-slate-800/40 p-2 rounded-lg">
                              <Text className="text-base mr-2">{itemTemplates[item.itemCode]?.emoji || '📦'}</Text>
                              <View className="flex-1">
                                 <Text className="text-white text-[9px] font-bold" numberOfLines={1}>{itemTemplates[item.itemCode]?.name}</Text>
                                 <Text className="text-indigo-400 text-[8px] font-black">Qty: {item.quantity}</Text>
                              </View>
                           </TouchableOpacity>
                         )}
                       />
                    </View>
                    <TextInput 
                      placeholder="Gold" 
                      placeholderTextColor="#475569"
                      keyboardType="numeric"
                      className="text-white font-black bg-black/40 px-3 py-2 rounded-xl border border-white/5 text-xs"
                      value={myGold > 0 ? myGold.toString() : ""}
                      editable={!myLocked}
                      onChangeText={(v) => {
                         const n = parseInt(v) || 0;
                         setMyGold(n);
                      }}
                    />
                 </View>

                 {/* THEIR SIDE */}
                 <View className={`flex-1 p-3 rounded-[24px] border ${theirLocked ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900 border-slate-800'}`}>
                    <View className="flex-row justify-between items-center mb-2">
                       <Text className="text-emerald-400 font-black text-[9px] uppercase tracking-tighter">Partner Offer</Text>
                       {theirLocked && <Ionicons name="shield-checkmark" size={10} color="#10b981" />}
                    </View>
                    <View className="h-32 bg-black/20 rounded-xl mb-2 p-2 border border-white/5">
                       <FlatList
                         data={theirItems}
                         keyExtractor={i => i.id}
                         nestedScrollEnabled
                         renderItem={({ item }) => (
                           <View className="flex-row items-center mb-2 bg-slate-800/40 p-2 rounded-lg border border-white/5">
                              <Text className="text-base mr-2">{itemTemplates[item.itemCode]?.emoji || '📦'}</Text>
                              <View className="flex-1">
                                 <Text className="text-white text-[9px] font-bold" numberOfLines={1}>{itemTemplates[item.itemCode]?.name}</Text>
                                 <Text className="text-emerald-400 text-[8px] font-black">Qty: {item.quantity}</Text>
                              </View>
                           </View>
                         )}
                       />
                    </View>
                    <View className="bg-black/40 px-3 py-2 rounded-xl h-9 justify-center border border-white/5 shadow-inner">
                       <Text className="text-amber-400 font-black italic text-xs">{theirGold} G</Text>
                    </View>
                 </View>
              </View>

              {/* 📦 INVENTORY SELECTOR */}
              <View className="flex-1 bg-slate-900/50 rounded-t-[40px] p-6 border-t border-white/5 shadow-2xl">
                 <Text className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-4">Vault Items</Text>
                 {loading ? <ActivityIndicator color="#6366f1" /> : (
                   <FlatList
                      data={inventory}
                      numColumns={4}
                      keyExtractor={i => i.id}
                      columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          onPress={() => attemptAddItem(item)}
                          className="w-[22%] aspect-square bg-slate-800 rounded-2xl items-center justify-center border border-white/5 shadow-lg"
                        >
                           <Text className="text-2xl">{itemTemplates[item.itemCode]?.emoji || '📦'}</Text>
                           {item.quantity > 1 && (
                              <View className="absolute bottom-1 right-1 bg-indigo-600 px-1 rounded-md">
                                 <Text className="text-[8px] text-white font-black">{item.quantity}</Text>
                              </View>
                           )}
                        </TouchableOpacity>
                      )}
                   />
                 )}
              </View>

              {/* 🚀 ACTION BAR */}
              <View className="pt-4 pb-8 flex-row space-x-2">
                 <TouchableOpacity 
                   onPress={toggleLock} 
                   className={`flex-1 p-5 rounded-2xl items-center border ${myLocked ? 'bg-amber-600 border-amber-400' : 'bg-slate-800 border-slate-700'} shadow-lg`}
                 >
                    <Text className="text-white font-black uppercase tracking-widest text-[10px]">{myLocked ? "Revise" : "Lock In"}</Text>
                 </TouchableOpacity>

                 <TouchableOpacity 
                   onPress={commitTrade}
                   disabled={!myLocked || !theirLocked}
                   className={`flex-1 p-5 rounded-2xl items-center ${myLocked && theirLocked ? 'bg-emerald-600 shadow-emerald-500/20 shadow-lg' : 'bg-slate-800 opacity-50'}`}
                 >
                    <Text className="text-white font-black uppercase tracking-widest text-[10px]">Execute</Text>
                 </TouchableOpacity>
              </View>
           </>
        )}

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

