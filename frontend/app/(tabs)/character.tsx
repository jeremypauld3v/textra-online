import { View, Text, Pressable, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, CharacterStatus } from "../../api/game";
import { useAuthStore } from "../../store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import Animated, { FadeIn } from "react-native-reanimated";

// UI Components
import ItemIcon from "../../components/ui/ItemIcon";
import ProgressBar from "../../components/ui/ProgressBar";
import ScreenHeader from "../../components/ui/ScreenHeader";
import StandardButton from "../../components/ui/StandardButton";

type StatAttribute = "str" | "agi" | "dex" | "int" | "luk";

const STAT_INFO: { id: StatAttribute; name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: "str", name: "STR", icon: "fitness", color: "#ef4444" },
  { id: "agi", name: "AGI", icon: "speedometer", color: "#3b82f6" },
  { id: "dex", name: "DEX", icon: "locate", color: "#10b981" },
  { id: "int", name: "INT", icon: "book", color: "#8b5cf6" },
  { id: "luk", name: "LUK", icon: "sparkles", color: "#f59e0b" },
];

export default function CharacterScreen() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<CharacterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllocating, setIsAllocating] = useState(false);
  const [pendingStats, setPendingStats] = useState<Record<StatAttribute, number>>({ str: 0, agi: 0, dex: 0, int: 0, luk: 0 });
  const logout = useAuthStore((s) => s.logout);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await gameApi.getStatus();
      setStatus(data.character);
    } catch (e: any) {
      if (e.response?.status === 401) logout();
    } finally { setLoading(false); }
  }, [logout]);

  useFocusEffect(useCallback(() => {
    fetchStatus();
    setPendingStats({ str: 0, agi: 0, dex: 0, int: 0, luk: 0 });
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]));

  const totalPending = Object.values(pendingStats).reduce((a, b) => a + b, 0);
  const availablePoints = (status?.statPoints || 0) - totalPending;

  const handleAllocate = (stat: StatAttribute, amount: number) => {
    if (availablePoints < amount) return;
    setPendingStats(prev => ({ ...prev, [stat]: prev[stat] + amount }));
  };

  const resetPending = () => setPendingStats({ str: 0, agi: 0, dex: 0, int: 0, luk: 0 });

  const confirmAllocation = async () => {
    if (totalPending === 0 || isAllocating || !status) return;
    setIsAllocating(true);
    try {
      for (const [stat, amount] of Object.entries(pendingStats)) {
        if (amount > 0) await gameApi.allocateStat(stat as StatAttribute, amount);
      }
      Toast.show({ type: 'success', text1: 'Attributes Ascended' });
      resetPending();
      await fetchStatus();
    } catch (e: any) { Alert.alert("Ascension Failed", e.response?.data?.error); }
    finally { setIsAllocating(false); }
  };

  const handleUnequip = async (slot: string) => {
    try {
      await gameApi.unequip(slot as any);
      Toast.show({ type: "success", text1: "Unequipped" });
      fetchStatus();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  if (loading || !status) {
    return (
      <View className="flex-1 bg-[#020617] justify-center items-center">
        <ActivityIndicator color="#fbbf24" size="large" />
        <Text className="mt-4 text-amber-500 font-pixel-bold uppercase tracking-widest">Entering Sanctum...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#020617]">
      {/* 🌌 AMBIENT MAGICAL GLOWS */}
      <View style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(79, 70, 229, 0.05)' }} />
      <View style={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(239, 68, 68, 0.03)' }} />
      <View style={{ position: 'absolute', top: '40%', left: '20%', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(251, 191, 36, 0.02)' }} />

      <ScrollView 
        className="flex-1 px-6" 
        style={{ paddingTop: Math.max(insets.top, 16) }}
        showsVerticalScrollIndicator={false}
      >
        
        <ScreenHeader 
          title="Sanctum" 
          subtitle="Character Identity" 
          rightElement={
            <TouchableOpacity onPress={() => logout()} className="bg-slate-900/50 p-2.5 rounded-2xl border border-white/5">
              <Ionicons name="log-out-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          }
        />

        {/* 🏛️ HERO HEADER */}
        <Animated.View entering={FadeIn.duration(300)} className="mb-10 items-center">
           <View className="w-24 h-24 bg-slate-900 rounded-full items-center justify-center border-2 border-amber-500/20 mb-4 shadow-2xl">
              <Text className="text-5xl">🧙</Text>
           </View>
           
           <View className="flex-row items-center mb-1">
              <Ionicons name="ribbon" size={14} color="#fbbf24" className="mr-2" />
              <Text className="text-amber-500 text-[10px] font-pixel-bold uppercase tracking-[4px]">
                 {status.rankName || "Fledgling"} • Level {status.level}
              </Text>
           </View>
           <Text className="text-white text-2xl font-pixel-bold text-center mb-6">
              {status.name.toUpperCase()}
           </Text>
           
           <View className="w-full space-y-4 bg-slate-900/40 p-5 rounded-[32px] border border-white/5">
              <ProgressBar current={status.hp} max={status.maxHp} color="rose" label="Vitality" size="sm" />
              <ProgressBar current={status.energy} max={status.maxEnergy} color="amber" label="Essence" size="sm" />
              <ProgressBar current={status.exp} max={status.level * 100} color="emerald" label="Ascension" size="xs" />
           </View>
        </Animated.View>

        {/* ⚔️ EQUIPMENT SILHOUETTE */}
        <View className="flex-row justify-between mb-12">
           {/* Left Column: Armor */}
           <View className="space-y-4">
              <ItemIcon emoji={status.equippedHelmet?.template?.emoji || "🪖"} rarity={status.equippedHelmet?.template?.rarityId} isEquipped={!!status.equippedHelmet} onPress={() => status.equippedHelmet && handleUnequip("HELMET")} />
              <ItemIcon emoji={status.equippedChest?.template?.emoji || "👕"} rarity={status.equippedChest?.template?.rarityId} isEquipped={!!status.equippedChest} onPress={() => status.equippedChest && handleUnequip("CHEST")} />
              <ItemIcon emoji={status.equippedBoots?.template?.emoji || "👞"} rarity={status.equippedBoots?.template?.rarityId} isEquipped={!!status.equippedBoots} onPress={() => status.equippedBoots && handleUnequip("BOOTS")} />
           </View>

           {/* Center: Hero Stats Overlay */}
           <View className="flex-1 items-center justify-center">
              <View className="w-full items-center">
                <View className="bg-indigo-500/10 px-6 py-3 rounded-full border border-indigo-500/20 mb-4">
                   <Text className="text-indigo-400 text-[10px] font-pixel-bold uppercase tracking-widest">{status.gold} GOLD</Text>
                </View>
                
                <View className="flex-row space-x-4">
                  <View className="items-center">
                    <Text className="text-white text-lg font-pixel-bold">{status.atk}</Text>
                    <Text className="text-slate-600 text-[7px] font-pixel-bold uppercase">ATK</Text>
                  </View>
                  <View className="w-[1px] h-6 bg-white/10" />
                  <View className="items-center">
                    <Text className="text-white text-lg font-pixel-bold">{status.def}</Text>
                    <Text className="text-slate-600 text-[7px] font-pixel-bold uppercase">DEF</Text>
                  </View>
                </View>
              </View>
           </View>

           {/* Right Column: Offense/Accessory */}
           <View className="space-y-4 items-end">
              <ItemIcon emoji={status.equippedWeapon?.template?.emoji || "⚔️"} rarity={status.equippedWeapon?.template?.rarityId} isEquipped={!!status.equippedWeapon} onPress={() => status.equippedWeapon && handleUnequip("WEAPON")} />
              <ItemIcon emoji={status.equippedGloves?.template?.emoji || "🧤"} rarity={status.equippedGloves?.template?.rarityId} isEquipped={!!status.equippedGloves} onPress={() => status.equippedGloves && handleUnequip("GLOVES")} />
              <ItemIcon emoji={status.equippedCape?.template?.emoji || "🧥"} rarity={status.equippedCape?.template?.rarityId} isEquipped={!!status.equippedCape} onPress={() => status.equippedCape && handleUnequip("CAPE")} />
           </View>
        </View>

        {/* 💍 ACCESSORIES ROW */}
        <View className="flex-row justify-center space-x-6 mb-16 bg-white/5 py-4 rounded-3xl mx-4">
           <ItemIcon emoji={status.equippedNecklace?.template?.emoji || "📿"} rarity={status.equippedNecklace?.template?.rarityId} isEquipped={!!status.equippedNecklace} size="sm" onPress={() => status.equippedNecklace && handleUnequip("NECKLACE")} />
           <ItemIcon emoji={status.equippedRing1?.template?.emoji || "💍"} rarity={status.equippedRing1?.template?.rarityId} isEquipped={!!status.equippedRing1} size="sm" onPress={() => status.equippedRing1 && handleUnequip("RING1")} />
           <ItemIcon emoji={status.equippedRing2?.template?.emoji || "💍"} rarity={status.equippedRing2?.template?.rarityId} isEquipped={!!status.equippedRing2} size="sm" onPress={() => status.equippedRing2 && handleUnequip("RING2")} />
        </View>

        {/* 🧬 ATTRIBUTES (CHARACTER SHEET STYLE) */}
        <View className="bg-slate-900/60 p-8 rounded-[40px] border border-amber-900/10 mb-16 shadow-inner overflow-hidden">
           <View style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, backgroundColor: 'rgba(251, 191, 36, 0.03)', borderRadius: 50, transform: [{ scale: 2 }] }} />
           
           <View className="flex-row justify-between items-center mb-8">
              <Text className="text-amber-500/60 text-[10px] font-pixel-bold uppercase tracking-[4px]">Attributes</Text>
              <View className="px-4 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                 <Text className="text-amber-400 text-[9px] font-pixel-bold uppercase tracking-widest">{availablePoints} Available</Text>
              </View>
           </View>

           {STAT_INFO.map((stat) => (
             <View key={stat.id} className="flex-row items-center justify-between mb-6 pb-6 border-b border-white/5">
                <View className="flex-row items-center">
                   <View className="w-12 h-12 rounded-2xl items-center justify-center bg-slate-950 border border-white/10 mr-4">
                      <Ionicons name={stat.icon} size={18} color={stat.color} />
                   </View>
                   <View>
                      <Text className="text-slate-500 text-[8px] font-pixel-bold uppercase mb-1 tracking-tighter">{stat.name}</Text>
                      <View className="flex-row items-center">
                         <Text className="text-white text-2xl font-pixel-bold leading-none">{status[stat.id] as number}</Text>
                         {pendingStats[stat.id] > 0 && (
                           <Animated.Text entering={FadeIn.duration(200)} className="text-indigo-400 text-sm ml-3 font-pixel-bold">+{pendingStats[stat.id]}</Animated.Text>
                         )}
                      </View>
                   </View>
                </View>

                {availablePoints > 0 && (
                  <View className="flex-row space-x-2">
                     <Pressable 
                        onPress={() => handleAllocate(stat.id, 1)} 
                        className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10 active:bg-white/10"
                      >
                        <Ionicons name="add" size={16} color="white" />
                     </Pressable>
                     {availablePoints >= 10 && (
                       <Pressable 
                          onPress={() => handleAllocate(stat.id, 10)} 
                          className="px-4 h-12 bg-indigo-500/10 rounded-2xl items-center justify-center border border-indigo-500/20 active:bg-indigo-500/20"
                        >
                          <Text className="text-indigo-400 text-[10px] font-pixel-bold">+10</Text>
                       </Pressable>
                     )}
                  </View>
                )}
             </View>
           ))}

           {totalPending > 0 && (
             <View className="mt-4 space-y-4">
               <StandardButton 
                 label="Confirm Ascension"
                 onPress={confirmAllocation}
                 variant="warning"
                 loading={isAllocating}
                 size="lg"
                 className="w-full"
               />
               <TouchableOpacity onPress={resetPending} className="items-center py-2">
                 <Text className="text-slate-600 text-[9px] font-pixel-bold uppercase tracking-widest">Reset Pending</Text>
               </TouchableOpacity>
             </View>
           )}
        </View>

        {/* 📊 PERFORMANCE METRICS */}
        <View className="mb-32">
           <Text className="text-slate-500 text-[9px] font-pixel-bold uppercase tracking-[4px] ml-4 mb-6">Combat Mastery</Text>
           <View className="flex-row flex-wrap justify-between px-2">
              {[
                { label: "Attack Power", val: status.atk, icon: "flash", color: "#f87171" },
                { label: "Defense Rating", val: status.def, icon: "shield", color: "#60a5fa" },
                { label: "Critical Strike", val: (status.luk * 0.2).toFixed(1) + "%", icon: "sparkles", color: "#f472b6" },
                { label: "Dodge Chance", val: (status.agi * 0.15).toFixed(1) + "%", icon: "footsteps", color: "#34d399" }
              ].map((m, i) => (
                <View key={i} className="w-[48%] mb-4 bg-slate-900/40 p-5 rounded-[24px] border border-white/5 items-center">
                   <Ionicons name={m.icon as any} size={14} color={m.color} className="mb-2 opacity-50" />
                   <Text className="text-white text-lg font-pixel-bold mb-1">{m.val}</Text>
                   <Text className="text-slate-600 text-[7px] font-pixel-bold uppercase tracking-widest">{m.label}</Text>
                </View>
              ))}
           </View>
        </View>

      </ScrollView>

    </View>
  );
}
