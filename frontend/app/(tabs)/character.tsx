import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, CharacterStatus } from "../../api/game";
import { useAuthStore } from "../../store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

// UI Components
import StatBadge from "../../components/ui/StatBadge";
import ItemIcon from "../../components/ui/ItemIcon";
import ScreenHeader from "../../components/ui/ScreenHeader";
import ProgressBar from "../../components/ui/ProgressBar";

type StatAttribute = "str" | "agi" | "dex" | "int" | "luk";

const STAT_INFO: { id: StatAttribute; name: string; icon: keyof typeof Ionicons.glyphMap; color: string; desc: string }[] = [
  { id: "str", name: "STR", icon: "fitness", color: "#fbbf24", desc: "Increases physical damage and maximum HP." },
  { id: "agi", name: "AGI", icon: "speedometer", color: "#60a5fa", desc: "Increases attack speed and evasion chance." },
  { id: "dex", name: "DEX", icon: "locate", color: "#4ade80", desc: "Improves accuracy and minimum damage consistency." },
  { id: "int", name: "INT", icon: "book", color: "#a78bfa", desc: "Increases magic power and maximum energy." },
  { id: "luk", name: "LUK", icon: "sparkles", color: "#f472b6", desc: "Boosts critical hit rate and item drop chance." },
];

export default function CharacterScreen() {
  const [status, setStatus] = useState<CharacterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllocating, setIsAllocating] = useState(false);
  const logout = useAuthStore((s) => s.logout);

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

  const handleUnequip = async (slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS" | "GLOVES" | "CAPE" | "NECKLACE" | "RING1" | "RING2") => {
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

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1 px-6 pt-10" showsVerticalScrollIndicator={false}>
        {/* 🟢 HEADER SECTION */}
        <ScreenHeader
          title={status.name}
          subtitle={`${status.rankName} Class`}
          rightElement={
            <TouchableOpacity onPress={logout} className="p-3 bg-slate-900 rounded-2xl border border-slate-800">
              <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
            </TouchableOpacity>
          }
        />

        {/* 📊 PROGRESS BARS */}
        <View className="mb-6 space-y-4">
          <View className="bg-slate-900/50 p-4 rounded-3xl border border-slate-800/50">
            <ProgressBar current={status.hp} max={status.maxHp} label="Vitality" color="rose" className="mb-3" size="sm" />
            <ProgressBar current={status.exp} max={expToNext} label="Experience" color="indigo" size="sm" />
          </View>
        </View>

        {/* ⚡ COMBAT SUMMARY */}
        <View className="flex-row justify-between mb-6">
          <StatBadge type="atk" value={status.atk} label="ATK" className="flex-1 mx-1 py-1.5" />
          <StatBadge type="def" value={status.def} label="DEF" className="flex-1 mx-1 py-1.5" />
          <StatBadge type="gold" value={status.gold} label="GOLD" className="flex-1 mx-1 py-1.5" />
          <StatBadge type="points" value={status.statPoints} label="PTS" className="flex-1 mx-1 py-1.5" />
        </View>

        {/* 🛡️ EQUIPMENT GRID */}
        <View className="mb-10">
          <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-4 px-1 font-sans">Active Gear</Text>
          
          {/* Row 1: Core Armor */}
          <View className="flex-row justify-between mb-4">
            <ItemIcon emoji={status.equippedWeapon?.template.emoji || "➖"} isEquipped={!!status.equippedWeapon} onPress={() => status.equippedWeapon && handleUnequip("WEAPON")} className="w-[23%]" rarity={status.equippedWeapon?.template.rarityId} />
            <ItemIcon emoji={status.equippedChest?.template.emoji || "➖"} isEquipped={!!status.equippedChest} onPress={() => status.equippedChest && handleUnequip("CHEST")} className="w-[23%]" rarity={status.equippedChest?.template.rarityId} />
            <ItemIcon emoji={status.equippedHelmet?.template.emoji || "➖"} isEquipped={!!status.equippedHelmet} onPress={() => status.equippedHelmet && handleUnequip("HELMET")} className="w-[23%]" rarity={status.equippedHelmet?.template.rarityId} />
            <ItemIcon emoji={status.equippedBoots?.template.emoji || "➖"} isEquipped={!!status.equippedBoots} onPress={() => status.equippedBoots && handleUnequip("BOOTS")} className="w-[23%]" rarity={status.equippedBoots?.template.rarityId} />
          </View>

          {/* Row 2: Accessories & Combat Gear */}
          <View className="flex-row justify-between">
            <ItemIcon emoji={status.equippedGloves?.template.emoji || "➖"} isEquipped={!!status.equippedGloves} onPress={() => status.equippedGloves && handleUnequip("GLOVES")} className="w-[18%]" rarity={status.equippedGloves?.template.rarityId} />
            <ItemIcon emoji={status.equippedCape?.template.emoji || "➖"} isEquipped={!!status.equippedCape} onPress={() => status.equippedCape && handleUnequip("CAPE")} className="w-[18%]" rarity={status.equippedCape?.template.rarityId} />
            <ItemIcon emoji={status.equippedNecklace?.template.emoji || "➖"} isEquipped={!!status.equippedNecklace} onPress={() => status.equippedNecklace && handleUnequip("NECKLACE")} className="w-[18%]" rarity={status.equippedNecklace?.template.rarityId} />
            <ItemIcon emoji={status.equippedRing1?.template.emoji || "➖"} isEquipped={!!status.equippedRing1} onPress={() => status.equippedRing1 && handleUnequip("RING1")} className="w-[18%]" rarity={status.equippedRing1?.template.rarityId} />
            <ItemIcon emoji={status.equippedRing2?.template.emoji || "➖"} isEquipped={!!status.equippedRing2} onPress={() => status.equippedRing2 && handleUnequip("RING2")} className="w-[18%]" rarity={status.equippedRing2?.template.rarityId} />
          </View>
        </View>

        {/* 🧬 ATTRIBUTE GRID */}
        <View className="flex-1 mb-6">
          <Text className="text-slate-500 font-bold text-[8px] uppercase tracking-widest mb-3 px-1 font-sans">Attributes</Text>
          <View className="flex-row flex-wrap justify-between">
            {STAT_INFO.map((stat) => (
              <View key={stat.id} className="w-[48.5%] bg-slate-900 border border-slate-800 rounded-2xl mb-2 flex-row justify-between items-center h-14 overflow-hidden">
                <TouchableOpacity className="flex-row items-center flex-1 h-full px-3" onPress={() => showStatInfo(stat.name, stat.desc)}>
                  <View className="w-7 h-7 rounded-lg items-center justify-center mr-2.5" style={{ backgroundColor: `${stat.color}15` }}>
                    <Ionicons name={stat.icon} size={12} color={stat.color} />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-sm leading-tight font-sans">{status[stat.id] as number}</Text>
                    <Text className="text-slate-500 font-bold text-[8px] uppercase tracking-tighter font-sans">{stat.name}</Text>
                  </View>
                </TouchableOpacity>

                {status.statPoints > 0 && (
                  <TouchableOpacity onPress={() => handleAllocate(stat.id)} className="bg-white w-9 h-full items-center justify-center border-l border-slate-800">
                    <Ionicons name="add" size={16} color="black" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* 🧭 FOOTER */}
        <View className="py-10 border-t border-slate-900">
          <Text className="text-center text-slate-500 font-bold text-[9px] uppercase italic tracking-[4px] font-sans">
            {status.locationName} • {status.isSafe ? "Protected Region" : "Hostile Territory"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
