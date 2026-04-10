import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, CharacterStatus } from "../../api/game";
import { useAuthStore } from "../../store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

type StatAttribute = "str" | "agi" | "dex" | "int" | "luk";

const STAT_INFO: { id: StatAttribute; name: string; icon: string; color: string; desc: string }[] = [
  { id: "str", name: "Strength", icon: "fitness", color: "#f87171", desc: "Attack Power & HP" },
  { id: "agi", name: "Agility", icon: "speedometer", color: "#60a5fa", desc: "Evasion & Speed" },
  { id: "dex", name: "Dexterity", icon: "locate", color: "#4ade80", desc: "Accuracy & Damage" },
  { id: "int", name: "Intelligence", icon: "book", color: "#a78bfa", desc: "Mana & Magic" },
  { id: "luk", name: "Luck", icon: "sparkles", color: "#fbbf24", desc: "Critical Rate & Drops" },
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
        console.log("Session expired, RootLayout will handle redirect.");
        useAuthStore.getState().logout();
      } else {
        console.warn("Fetch Status Error:", e.name === "AxiosError" ? e.message : e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000); // Poll for HP/EXP updates
      return () => clearInterval(interval);
    }, [fetchStatus])
  );

  const handleLogout = async () => {
    await logout();
    // Redirect will be handled by the Global Auth Watcher in _layout.tsx
  };

  const handleAllocate = async (stat: StatAttribute) => {
    if (isAllocating) return;
    try {
      setIsAllocating(true);
      await gameApi.allocateStat(stat);
      Toast.show({ type: "success", text1: "Stat Increased", text2: `${stat.toUpperCase()} is now higher!` });
      fetchStatus();
    } catch (e: any) {
      Alert.alert("Allocation Failed", e.response?.data?.error || "Unknown error");
    } finally {
      setIsAllocating(false);
    }
  };

  const handleUnequip = async (slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS") => {
    try {
      await gameApi.unequip(slot);
      Toast.show({ type: "success", text1: "Success", text2: "Gear unequipped" });
      fetchStatus();
    } catch (e: any) {
      Alert.alert("Unequip Failed", e.response?.data?.error || "Unknown error");
    }
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
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1 px-6 pt-10">
        <View className="flex-row justify-between items-center mb-10">
          <View>
            <Text className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-1">Immortal Presence</Text>
            <Text className="text-4xl font-black text-white italic uppercase tracking-tighter">{status.name}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
          </TouchableOpacity>
        </View>

        {/* Level & HP Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 mb-10 overflow-hidden shadow-2xl">
          <View className="flex-row items-center mb-6">
            <View className="flex-row items-baseline">
              <Text className="text-slate-500 font-bold text-2xl mr-2">LVL</Text>
              <Text className="text-white text-6xl font-black">{String(status.level || 1)}</Text>
            </View>
            <View className="ml-6 flex-1">
               <View className="flex-row justify-between items-end mb-2">
                  <Text className="text-rose-400 font-black uppercase text-[10px] tracking-widest">Vitality</Text>
                  <Text className="text-white font-bold text-xs">{status.hp} / {status.maxHp}</Text>
               </View>
               <View className="w-full h-2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                  <View 
                    className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                    style={{ width: `${Math.min(100, hpPercentage)}%` }} 
                  />
               </View>
            </View>
          </View>
          
          <View className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
            <View 
              className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
              style={{ width: `${Math.min(100, expPercentage)}%` }} 
            />
          </View>
          <View className="flex-row justify-between mt-3">
            <Text className="text-slate-500 font-bold text-[10px]">{status.exp} EXP</Text>
            <Text className="text-slate-500 font-bold text-[10px]">{expToNext} FOR NEXT</Text>
          </View>
        </View>

        <View className="mb-10">
          <Text className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-6 px-2">Core Attributes</Text>
          
          <View className="flex-row flex-wrap justify-between">
            {STAT_INFO.map(item => {
              const val = status[item.id] as number;
              return (
                <View key={item.id} className="w-[48%] bg-slate-900 border border-slate-800 rounded-[32px] p-5 mb-4 shadow-lg">
                  <View className="flex-row justify-between items-center mb-4">
                    <View className="p-2 rounded-xl" style={{ backgroundColor: `${item.color}20` }}>
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    {status.statPoints > 0 && (
                      <TouchableOpacity 
                        onPress={() => handleAllocate(item.id)}
                        className="bg-indigo-600 w-8 h-8 rounded-full justify-center items-center"
                      >
                        <Ionicons name="add" size={20} color="white" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text className="text-white font-black text-2xl">{val || 0}</Text>
                  <Text className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">{item.name}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="flex-row justify-between mb-20 px-1">
          <View className="bg-indigo-600/10 border border-indigo-500/20 rounded-[32px] p-6 flex-1 mr-2 flex-row items-center justify-between">
            <View>
              <Text className="text-indigo-400 font-black text-xl italic">{status.statPoints} Points</Text>
              <Text className="text-indigo-500/50 font-bold uppercase text-[9px] tracking-widest mt-1">Available</Text>
            </View>
            <View className="bg-indigo-600 w-8 h-8 rounded-xl items-center justify-center">
              <Text className="text-white font-black uppercase text-[10px]">UP</Text>
            </View>
          </View>

          <View className="bg-amber-600/10 border border-amber-500/20 rounded-[32px] p-6 flex-1 ml-2 flex-row items-center justify-between">
            <View>
              <Text className="text-amber-400 font-black text-xl italic">{status.gold} G</Text>
              <Text className="text-amber-500/50 font-bold uppercase text-[9px] tracking-widest mt-1">Coin Purse</Text>
            </View>
            <View className="bg-amber-600 w-8 h-8 rounded-xl items-center justify-center">
              <Ionicons name="cash" size={14} color="white" />
            </View>
          </View>
        </View>

        {/* ⚔️ Combat Power Card */}
        <View className="flex-row justify-between mb-10">
          <View className="flex-1 bg-rose-600/10 border border-rose-500/20 p-6 rounded-[32px] mr-2">
            <Text className="text-rose-400 font-black text-3xl italic">{status.atk}</Text>
            <Text className="text-rose-500/50 font-bold uppercase text-[9px] tracking-widest mt-1">Attack Power</Text>
          </View>
          <View className="flex-1 bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-[32px] ml-2">
            <Text className="text-emerald-400 font-black text-3xl italic">{status.def}</Text>
            <Text className="text-emerald-500/50 font-bold uppercase text-[9px] tracking-widest mt-1">Defense Power</Text>
          </View>
        </View>

        {/* 🛡️ Equipment Slots */}
        <View className="mb-20">
          <Text className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-6 px-2">Gear Slots</Text>
          <View className="flex-row justify-between mb-4">
             <GearSlot label="Weapon" item={status.equippedWeapon} onUnequip={() => handleUnequip("WEAPON")} />
             <GearSlot label="Helmet" item={status.equippedHelmet} onUnequip={() => handleUnequip("HELMET")} />
          </View>
          <View className="flex-row justify-between">
             <GearSlot label="Armor" item={status.equippedChest} onUnequip={() => handleUnequip("CHEST")} />
             <GearSlot label="Boots" item={status.equippedBoots} onUnequip={() => handleUnequip("BOOTS")} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GearSlot({ label, item, onUnequip }: any) {
  return (
    <TouchableOpacity 
      disabled={!item}
      onLongPress={onUnequip}
      className={`w-[48%] h-24 rounded-[32px] border p-4 justify-between items-center flex-row ${
        item ? 'bg-slate-900 border-indigo-500/50' : 'bg-slate-900/30 border-slate-800 border-dashed'
      }`}
    >
      <View>
         <Text className="text-white font-black text-xl">{item ? item.template.emoji : "🕳️"}</Text>
         <Text className="text-slate-600 font-bold uppercase text-[8px] tracking-widest mt-1">{label}</Text>
      </View>
      {item && (
        <View className="bg-indigo-600/10 px-2 py-1 rounded-md border border-indigo-500/20">
           <Text className="text-indigo-400 font-bold text-[8px]">Equipped</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
