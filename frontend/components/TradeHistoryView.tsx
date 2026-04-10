import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { gameApi } from "../api/game";
import { Ionicons } from "@expo/vector-icons";

export default function TradeHistoryView() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await (gameApi as any).getTradeHistory();
      setTrades(data.trades);
    } catch (e) {
      console.error("Trade History Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        data={trades}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchHistory(); }} 
            tintColor="#6366f1" 
          />
        }
        renderItem={({ item }) => {
           const initiatorName = item.initiator.name;
           const partnerName = item.partner.name;
           
           return (
             <View className="bg-slate-900 border border-slate-800 p-6 rounded-[30px] mb-4">
               <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                     <View className="w-8 h-8 bg-indigo-500/10 rounded-full items-center justify-center mr-2">
                        <Ionicons name="swap-horizontal" size={14} color="#6366f1" />
                     </View>
                     <Text className="text-white font-bold text-sm">{initiatorName} ↔ {partnerName}</Text>
                  </View>
                  <Text className="text-slate-500 text-[10px] font-bold uppercase">{new Date(item.timestamp).toLocaleDateString()}</Text>
               </View>

               <View className="flex-row space-x-2">
                  <View className="flex-1 bg-black/20 p-3 rounded-2xl">
                     <Text className="text-slate-500 text-[8px] font-black uppercase mb-1">Offered</Text>
                     <Text className="text-white text-[10px] font-bold">
                        {item.initiatorOffer.gold} G
                     </Text>
                     {item.initiatorOffer.items.map((it: any, idx: number) => (
                        <Text key={idx} className="text-indigo-400 text-[10px]">{it.quantity}x {it.name}</Text>
                     ))}
                  </View>
                  <View className="flex-1 bg-black/20 p-3 rounded-2xl">
                     <Text className="text-slate-500 text-[8px] font-black uppercase mb-1">Received</Text>
                     <Text className="text-white text-[10px] font-bold">
                        {item.partnerOffer.gold} G
                     </Text>
                     {item.partnerOffer.items.map((it: any, idx: number) => (
                        <Text key={idx} className="text-emerald-400 text-[10px]">{it.quantity}x {it.name}</Text>
                     ))}
                  </View>
               </View>
             </View>
           );
        }}
        ListEmptyComponent={
          <View className="items-center py-20">
             <Text className="text-slate-600 italic">No trade history found...</Text>
          </View>
        }
      />
    </View>
  );
}
