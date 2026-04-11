import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, CharacterStatus } from "../../api/game";
import { useAuthStore } from "../../store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

type StatAttribute = "str" | "agi" | "dex" | "int" | "luk";

const STAT_INFO: { id: StatAttribute; name: string; icon: string; color: string; desc: string }[] = [
  { id: "str", name: "STR", icon: "fitness", color: "#f87171", desc: "Increases physical damage and maximum HP." },
  { id: "agi", name: "AGI", icon: "speedometer", color: "#60a5fa", desc: "Increases attack speed and evasion chance." },
  { id: "dex", name: "DEX", icon: "locate", color: "#4ade80", desc: "Improves accuracy and minimum damage consistency." },
  { id: "int", name: "INT", icon: "book", color: "#a78bfa", desc: "Increases magic power and maximum energy." },
  { id: "luk", name: "LUK", icon: "sparkles", color: "#fbbf24", desc: "Boosts critical hit rate and item drop chance." },
];

export default function CharacterScreen() {
  const [status, setStatus] = useState<CharacterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllocating, setIsAllocating] = useState(false);
  const logout = useAuthStore(s => s.logout);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await gameApi.getStatus();
      setStatus(data.character);
    } catch (e: any) {
      if (e.response?.status === 401) {
        useAuthStore.getState().logout();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, 10000); // Polling every 10s is enough for status tab
      return () => clearInterval(interval);
    }, [fetchStatus])
  );

  const handleAllocate = async (stat: StatAttribute) => {
    if (isAllocating) return;
    try {
      setIsAllocating(true);
      await gameApi.allocateStat(stat);
      Toast.show({ type: "success", text1: "Upgraded!", text2: `${stat.toUpperCase()} increased.` });
      fetchStatus();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.error || "Failed to allocate");
    } finally {
      setIsAllocating(false);
    }
  };

  const handleUnequip = async (slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS") => {
    try {
      await gameApi.unequip(slot);
      Toast.show({ type: "success", text1: "Unequipped" });
      fetchStatus();
    } catch (e: any) {
      Alert.alert("Unequip Failed", e.response?.data?.error || "Unknown error");
    }
  };

  const showStatInfo = (name: string, desc: string) => {
    Alert.alert(name, desc);
  };

  if (loading || !status) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  const expToNext = status.level * 100;
  const expPercentage = (status.exp / expToNext) * 100;
  const hpPercentage = (status.hp / status.maxHp) * 100;

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
      
      {/* 🟢 HEADER SECTION */}
      <View className="flex-row justify-between items-center mb-2">
         <View className="flex-1">
            <View className="flex-row items-center">
               <Text className="text-white text-2xl font-black italic mr-2 tracking-tight">{status.name}</Text>
               <View className="bg-indigo-600 px-3 py-1 rounded-md">
                  <Text className="text-white font-black text-[10px]">LV. {status.level}</Text>
               </View>
            </View>
            <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">{status.rankName} Class</Text>
         </View>
         <TouchableOpacity onPress={logout} className="p-2 bg-slate-900 rounded-xl border border-slate-800">
            <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
         </TouchableOpacity>
      </View>

      {/* 📊 PROGRESS BARS */}
      <View className="mb-4">
         <View className="flex-row justify-between mb-1 px-1">
            <Text className="text-rose-400 font-black text-[9px] uppercase">Vitality: {status.hp}/{status.maxHp}</Text>
            <Text className="text-indigo-400 font-black text-[9px] uppercase">EXP: {status.exp}/{expToNext}</Text>
         </View>
         <View className="h-1.5 bg-slate-900 rounded-full overflow-hidden mb-1 border border-slate-800">
            <View className="h-full bg-rose-500" style={{ width: `${Math.min(100, hpPercentage)}%` }} />
         </View>
         <View className="h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <View className="h-full bg-indigo-500" style={{ width: `${Math.min(100, expPercentage)}%` }} />
         </View>
      </View>

      {/* ⚡ COMBAT SUMMARY (4 Cards) */}
      <View className="flex-row justify-between mb-4">
         <StatSmallCard icon="flash" color="#fb7185" value={status.atk} label="ATTACK" />
         <StatSmallCard icon="shield" color="#34d399" value={status.def} label="DEFENSE" />
         <StatSmallCard icon="cash" color="#fbbf24" value={status.gold} label="GOLD" />
         <StatSmallCard icon="star" color="#818cf8" value={status.statPoints} label="POINTS" />
      </View>

      {/* 🛡️ EQUIPMENT ROW */}
      <View className="mb-6">
         <Text className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-3 px-1">Active Gear</Text>
         <View className="flex-row justify-between h-16">
            <SquareGearSlot label="Weapon" item={status.equippedWeapon} onUnequip={() => handleUnequip("WEAPON")} />
            <SquareGearSlot label="Armor" item={status.equippedChest} onUnequip={() => handleUnequip("CHEST")} />
            <SquareGearSlot label="Helmet" item={status.equippedHelmet} onUnequip={() => handleUnequip("HELMET")} />
            <SquareGearSlot label="Boots" item={status.equippedBoots} onUnequip={() => handleUnequip("BOOTS")} />
         </View>
      </View>

      {/* 🧬 ATTRIBUTE GRID (2 Columns) */}
      <View className="flex-1">
         <Text className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-3 px-1">Attributes</Text>
         <View className="flex-row flex-wrap justify-between">
            {STAT_INFO.map(stat => (
               <View key={stat.id} className="w-[48.5%] bg-slate-900 border border-slate-800 rounded-2xl mb-3 flex-row justify-between items-center h-16 relative overflow-hidden">
                  <TouchableOpacity 
                    className="flex-row items-center flex-1 h-full px-4"
                    onPress={() => showStatInfo(stat.name, stat.desc)}
                  >
                     <View className="w-7 h-7 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${stat.color}20` }}>
                        <Ionicons name={stat.icon as any} size={14} color={stat.color} />
                     </View>
                     <View>
                        <Text className="text-white font-black text-lg leading-tight">{status[stat.id] as number}</Text>
                        <Text className="text-slate-500 font-bold text-[9px] uppercase tracking-tighter">{stat.name}</Text>
                     </View>
                  </TouchableOpacity>
                  
                  {status.statPoints > 0 && (
                     <TouchableOpacity 
                        onPress={() => handleAllocate(stat.id)}
                        className="bg-indigo-600 w-8 h-full items-center justify-center border-l border-slate-800"
                     >
                        <Ionicons name="add" size={18} color="white" />
                     </TouchableOpacity>
                  )}
               </View>
            ))}
            {/* Empty placeholder to keep layout consistent */}
            <View className="w-[48.5%] h-16 opacity-0" />
         </View>
      </View>

      {/* 🧭 FOOTER */}
      <View className="py-4 border-t border-slate-900 mt-2">
         <Text className="text-center text-slate-500 font-bold text-[9px] uppercase italic tracking-widest">
            {status.locationName} • {status.isSafe ? "Protected Region" : "Hostile Territory"}
         </Text>
      </View>

    </SafeAreaView>
  );
}

function StatSmallCard({ icon, color, value, label }: any) {
   return (
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex-1 mx-1 items-center justify-center">
         <Text className="text-white font-black text-sm mb-0.5" numberOfLines={1}>{value}</Text>
         <View className="flex-row items-center">
            <Ionicons name={icon} size={8} color={color} style={{ marginRight: 3 }} />
            <Text className="text-slate-500 font-black text-[8px] uppercase tracking-tighter" numberOfLines={1}>{label}</Text>
         </View>
      </View>
   )
}

function SquareGearSlot({ label, item, onUnequip }: any) {
   return (
      <TouchableOpacity 
         onLongPress={item ? onUnequip : undefined}
         className={`w-[23.5%] rounded-2xl border items-center justify-center ${
            item ? 'bg-slate-900 border-indigo-500/30 shadow-lg' : 'bg-slate-900/10 border-slate-800 border-dashed'
         }`}
      >
         <Text className="text-2xl mb-1">{item ? item.template.emoji : "➖"}</Text>
         <Text className="text-slate-700 font-black text-[7px] uppercase tracking-tighter">{label}</Text>
         {item && (
            <View className="absolute top-1 right-1">
               <Ionicons name="checkmark-circle" size={10} color="#818cf8" />
            </View>
         )}
      </TouchableOpacity>
   )
}
