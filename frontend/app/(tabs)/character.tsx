import { View, Text, Pressable, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, CharacterStatus } from "../../api/game";
import { useAuthStore } from "../../store/useAuthStore";
import { useCharacterStore } from "../../store/useCharacterStore";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import ReportModal from "../../components/ReportModal";

// UI Components
import ItemIcon from "../../components/ui/ItemIcon";
import ProgressBar from "../../components/ui/ProgressBar";
import ScreenHeader from "../../components/ui/ScreenHeader";
import StandardButton from "../../components/ui/StandardButton";
import Card from "../../components/ui/Card";

type StatAttribute = "str" | "agi" | "dex" | "int" | "luk";

const STAT_INFO: { id: StatAttribute; name: string; icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string; effect: string }[] = [
  { id: "str", name: "STR", icon: "fitness", color: "#EF4444", bgColor: "bg-crimson/10", effect: "+ATK (physical)" },
  { id: "agi", name: "AGI", icon: "speedometer", color: "#10B981", bgColor: "bg-verdant/10", effect: "+DEF & Dodge" },
  { id: "dex", name: "DEX", icon: "locate", color: "#3B82F6", bgColor: "bg-blue-500/10", effect: "+Armor Pen & Gather" },
  { id: "int", name: "INT", icon: "book", color: "#8B5CF6", bgColor: "bg-purple-500/10", effect: "+Energy & Magic ATK" },
  { id: "luk", name: "LUK", icon: "sparkles", color: "#F59E0B", bgColor: "bg-gold/10", effect: "+Crit Chance" },
];

export default function CharacterScreen() {
  const insets = useSafeAreaInsets();
  
  // Bind to global character store
  const status = useCharacterStore((state) => state.character);
  const loading = useCharacterStore((state) => state.loading);
  const fetchStatus = useCharacterStore((state) => state.fetchStatus);

  const [isAllocating, setIsAllocating] = useState(false);
  const [pendingStats, setPendingStats] = useState<Record<StatAttribute, number>>({ str: 0, agi: 0, dex: 0, int: 0, luk: 0 });
  const logout = useAuthStore((s) => s.logout);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchStatus();
    setPendingStats({ str: 0, agi: 0, dex: 0, int: 0, luk: 0 });
  }, [fetchStatus]));

  const totalPending = Object.values(pendingStats).reduce((a, b) => a + b, 0);
  const availablePoints = (status?.statPoints || 0) - totalPending;

  const handleAllocate = (stat: StatAttribute, amount: number) => {
    if (availablePoints < amount) return;
    setPendingStats(prev => ({ ...prev, [stat]: prev[stat] + amount }));
  };

  const handleUndo = (stat: StatAttribute) => {
    setPendingStats(prev => ({ ...prev, [stat]: Math.max(0, prev[stat] - 1) }));
  };

  // 📈 Projected stats with pending allocations applied
  const projected = useMemo(() => {
    if (!status) return null;
    const s = status;
    const p = pendingStats;
    const str = s.str + p.str;
    const agi = s.agi + p.agi;
    const dex = s.dex + p.dex;
    const int = s.int + p.int;
    const luk = s.luk + p.luk;
    
    const ct = s.classType || (s.weaponCode?.startsWith('ARCHER') ? 'ARCHER' : s.weaponCode?.startsWith('MAGE') ? 'MAGE' : 'WARRIOR');
    const hasWeapon = !!s.equippedWeapon;
    let atkMult = 2;
    if (ct === 'WARRIOR' && hasWeapon) atkMult = 3;
    else if (ct === 'ARCHER') atkMult = 3;
    else if (ct === 'MAGE') atkMult = 3;
    else if (!hasWeapon) atkMult = 1.5;
    
    const baseAtk = (s.atk || 0) - (hasWeapon ? (ct === 'WARRIOR' ? str * atkMult : ct === 'ARCHER' ? agi * atkMult : ct === 'MAGE' ? int * atkMult : str * atkMult) : str * atkMult);
    const newAtk = baseAtk + (ct === 'WARRIOR' ? str * atkMult : ct === 'ARCHER' ? agi * atkMult : ct === 'MAGE' ? int * atkMult : str * atkMult);
    
    const baseDef = (s.def || 0) - (agi * 1);
    const newDef = baseDef + (agi * 1);
    
    return {
      atk: Math.floor(newAtk),
      def: Math.floor(newDef),
      crit: Math.min(80, luk * 0.003 * 100).toFixed(1) + '%',
      dodge: Math.min(40, agi / 10).toFixed(1) + '%',
      armorPen: Math.min(80, dex / 10).toFixed(1) + '%',
      gather: Math.floor(dex * 2 + int * 0.5),
      pvpFlee: Math.min(80, agi / 1.5).toFixed(1) + '%',
      maxEnergy: 100 + int,
    };
  }, [status, pendingStats]);

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
      <View className="flex-1 bg-void justify-center items-center">
        <ActivityIndicator color="#A78BFA" size="large" />
        <Text className="mt-4 text-frost-muted font-pixel-bold uppercase tracking-widest text-[9px]">Entering Sanctum...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-void">
      <ScrollView 
        className="flex-1 px-6" 
        style={{ paddingTop: Math.max(insets.top, 12) }}
        showsVerticalScrollIndicator={false}
      >
        
        <ScreenHeader 
          title="Sanctum" 
          subtitle="Character Identity" 
          rightElement={
            <View className="flex-row space-x-2">
              <TouchableOpacity onPress={() => setIsReportModalVisible(true)} className="bg-white/5 p-2 rounded-xl border border-white/10 active:bg-white/10">
                <Ionicons name="bug-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => logout()} className="bg-white/5 p-2 rounded-xl border border-white/10 active:bg-white/10">
                <Ionicons name="log-out-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
              </TouchableOpacity>
            </View>
          }
        />

        {/* 🏛️ HERO HEADER */}
        <Animated.View entering={FadeInDown.duration(300)} className="mb-6 items-center">
           
           <View className="flex-row items-center mb-1">
              <Ionicons name="ribbon" size={12} color="rgba(255, 255, 255, 0.4)" className="mr-1.5" />
              <Text className="text-white/40 text-[8px] font-pixel-bold uppercase tracking-[3px]">
                 {status.rankName || "Fledgling"} • Level {status.level}
              </Text>
           </View>
           <Text className="text-white text-xl font-pixel-bold text-center mb-4">
              {status.name.toUpperCase()}
           </Text>
           
           <View className="w-full space-y-3 bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06]">
              <ProgressBar current={status.hp} max={status.maxHp} color="verdant" label="Health" size="sm" />
              <ProgressBar current={status.energy} max={status.maxEnergy} color="amber" label="Energy" size="sm" />
              <ProgressBar current={status.exp} max={status.level * 100} color="indigo" label="Experience" size="xs" />
           </View>
        </Animated.View>

        {/* ⚠️ UNSPENT ATTRIBUTES WARNING */}
        {status.statPoints > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} className="mb-6 mx-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-full bg-amber-500/20 items-center justify-center">
              <Ionicons name="warning" size={16} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-amber-400 text-[10px] font-pixel-bold uppercase tracking-wider">Unspent Attributes</Text>
              <Text className="text-amber-400/60 text-[8px] font-pixel-bold mt-0.5">{status.statPoints} point{status.statPoints !== 1 ? 's' : ''} available — scroll down to allocate</Text>
            </View>
          </Animated.View>
        )}

        {/* ⚔️ EQUIPMENT SILHOUETTE */}
        <View className="flex-row justify-between mb-8 px-4">
           {/* Left Column: Armor */}
           <View className="space-y-3">
              <ItemIcon emoji={status.equippedHelmet?.template?.emoji || ""} rarity={status.equippedHelmet?.template?.rarityId} isEquipped={!!status.equippedHelmet} onPress={() => status.equippedHelmet && handleUnequip("HELMET")} />
              <ItemIcon emoji={status.equippedChest?.template?.emoji || ""} rarity={status.equippedChest?.template?.rarityId} isEquipped={!!status.equippedChest} onPress={() => status.equippedChest && handleUnequip("CHEST")} />
              <ItemIcon emoji={status.equippedBoots?.template?.emoji || ""} rarity={status.equippedBoots?.template?.rarityId} isEquipped={!!status.equippedBoots} onPress={() => status.equippedBoots && handleUnequip("BOOTS")} />
           </View>

           {/* Center: Hero Stats Overlay */}
           <View className="flex-1 items-center justify-center">
              <View className="w-full items-center">
                <View className="bg-white/[0.05] px-4 py-2 rounded-full border border-white/10 mb-3">
                   <Text className="text-gold text-[8px] font-pixel-bold uppercase tracking-wider">{status.gold} GOLD</Text>
                </View>
                
                <View className="flex-row space-x-3">
                  <View className="items-center">
                    <Text className="text-crimson text-base font-pixel-bold">{status.atk}</Text>
                    <Text className="text-white/30 text-[7px] font-pixel-bold uppercase">ATK</Text>
                  </View>
                  <View className="w-[1px] h-5 bg-white/10" />
                  <View className="items-center">
                    <Text className="text-mystic text-base font-pixel-bold">{status.def}</Text>
                    <Text className="text-white/30 text-[7px] font-pixel-bold uppercase">DEF</Text>
                  </View>
                </View>
              </View>
           </View>

           {/* Right Column: Offense/Accessory */}
           <View className="space-y-3 items-end">
              <ItemIcon emoji={status.equippedWeapon?.template?.emoji || ""} rarity={status.equippedWeapon?.template?.rarityId} isEquipped={!!status.equippedWeapon} onPress={() => status.equippedWeapon && handleUnequip("WEAPON")} />
              <ItemIcon emoji={status.equippedGloves?.template?.emoji || ""} rarity={status.equippedGloves?.template?.rarityId} isEquipped={!!status.equippedGloves} onPress={() => status.equippedGloves && handleUnequip("GLOVES")} />
              <ItemIcon emoji={status.equippedCape?.template?.emoji || ""} rarity={status.equippedCape?.template?.rarityId} isEquipped={!!status.equippedCape} onPress={() => status.equippedCape && handleUnequip("CAPE")} />
           </View>
        </View>

        {/* 🎭 CLASS IDENTITY */}
        {(() => {
          const ct = status.classType;
          const code = (status.weaponCode || '').toUpperCase();
          
          // Determine class: classType first, then code prefix fallback
          let className = 'Warrior';
          let classColor = '#EF4444';
          let classEmoji = '⚔️';
          let abilities: string[] = [];
          let statNote = '';
          let hasWeapon = !!status.equippedWeapon;

          const resolvedClass = ct || (
            code.startsWith('WARRIOR') || code === 'EXCALIBUR' || code === 'CHAOS_BLADE' ? 'WARRIOR' :
            code.startsWith('ARCHER') || code === 'ARTEMIS_BOW' ? 'ARCHER' :
            code.startsWith('MAGE') || code === 'MERLIN_STAFF' ? 'MAGE' :
            hasWeapon ? 'WARRIOR' : null
          );

          if (resolvedClass === 'WARRIOR') {
            className = 'Warrior';
            classColor = '#EF4444';
            classEmoji = hasWeapon ? '⚔️' : '👊';
            abilities = hasWeapon 
              ? ['🛡️ Shield Slam — DEF×1.5 dmg + stun (20%)', '🩸 Berserk — +50% ATK at <30% HP']
              : ['No weapon equipped — using fists'];
            statNote = hasWeapon ? 'ATK scales with STR ×3' : 'ATK scales with STR ×1.5 (unarmed)';
          } else if (resolvedClass === 'ARCHER') {
            className = 'Archer';
            classColor = '#10B981';
            classEmoji = '🏹';
            abilities = ['🏹 Double Shot — two rapid arrows', '💨 Defensive Roll — dodge next hit'];
            statNote = 'ATK scales with AGI ×3';
          } else if (resolvedClass === 'MAGE') {
            className = 'Mage';
            classColor = '#8B5CF6';
            classEmoji = '🔮';
            abilities = ['🔥 Fireball — INT×3.5 dmg (25%)', '✨ Rejuvenate — heal INT×4 at <40% HP'];
            statNote = 'ATK scales with INT ×3';
          } else {
            // No weapon equipped — show unarmed state
            return (
              <Animated.View entering={FadeInDown.duration(300)} className="mb-8 mx-2 rounded-2xl border p-4" style={{ borderColor: '#64748B30', backgroundColor: '#64748B08' }}>
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">👊</Text>
                  <View>
                    <Text className="text-frost-muted text-sm font-pixel-bold uppercase tracking-wider">No Class</Text>
                    <Text className="text-frost-faint text-[7px] font-pixel-bold uppercase mt-0.5">Equip a weapon to gain a class</Text>
                  </View>
                </View>
              </Animated.View>
            );
          }

          return (
            <Animated.View entering={FadeInDown.duration(300)} className="mb-8 mx-2 rounded-2xl border p-4" style={{ borderColor: classColor + '30', backgroundColor: classColor + '08' }}>
              <View className="flex-row items-center gap-3 mb-3">
                <Text className="text-2xl">{classEmoji}</Text>
                <View>
                  <Text className="text-sm font-pixel-bold uppercase tracking-wider" style={{ color: classColor }}>{className}</Text>
                  <Text className="text-frost-muted text-[7px] font-pixel-bold uppercase mt-0.5">{statNote}</Text>
                </View>
                {!code && (
                  <View className="ml-auto bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                    <Text className="text-amber-400 text-[7px] font-pixel-bold uppercase">No Weapon</Text>
                  </View>
                )}
              </View>
              <View className="gap-1">
                {abilities.map((a, i) => (
                  <Text key={i} className="text-frost-muted text-[8px] font-pixel-bold leading-relaxed">{a}</Text>
                ))}
              </View>
            </Animated.View>
          );
        })()}

        {/* 💍 ACCESSORIES ROW */}
        <View className="flex-row justify-center space-x-4 mb-10 bg-white/[0.02] py-3 rounded-2xl mx-6 border border-white/[0.04]">
           <ItemIcon emoji={status.equippedNecklace?.template?.emoji || ""} rarity={status.equippedNecklace?.template?.rarityId} isEquipped={!!status.equippedNecklace} size="sm" onPress={() => status.equippedNecklace && handleUnequip("NECKLACE")} />
           <ItemIcon emoji={status.equippedRing1?.template?.emoji || ""} rarity={status.equippedRing1?.template?.rarityId} isEquipped={!!status.equippedRing1} size="sm" onPress={() => status.equippedRing1 && handleUnequip("RING1")} />
           <ItemIcon emoji={status.equippedRing2?.template?.emoji || ""} rarity={status.equippedRing2?.template?.rarityId} isEquipped={!!status.equippedRing2} size="sm" onPress={() => status.equippedRing2 && handleUnequip("RING2")} />
        </View>

        {/* 🧬 ATTRIBUTES (CHARACTER SHEET STYLE) */}
        <Card delay={100} className="mb-10 p-6 rounded-2xl shadow-inner">
           
           <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white/40 text-[9px] font-pixel-bold uppercase tracking-[2px]">Attributes</Text>
              <View className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                 <Text className="text-white/70 text-[8px] font-pixel-bold uppercase tracking-widest">{availablePoints} Available</Text>
              </View>
           </View>

           {STAT_INFO.map((stat) => (
             <View key={stat.id} className="flex-row items-center justify-between mb-4 pb-4 border-b border-white/[0.04]">
                <View className="flex-row items-center flex-1">
                   <View className={`w-10 h-10 rounded-xl items-center justify-center border mr-3 ${stat.bgColor}`} style={{ borderColor: stat.color + '30' }}>
                      <Ionicons name={stat.icon} size={16} color={stat.color} />
                   </View>
                   <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white/30 text-[7px] font-pixel-bold uppercase mb-0.5">{stat.name}</Text>
                        <Text className="text-[7px] font-pixel-bold uppercase mb-0.5" style={{ color: stat.color }}>{stat.effect}</Text>
                      </View>
                      <View className="flex-row items-center">
                         <Text className="text-white text-xl font-pixel-bold leading-none">{status[stat.id] as number}</Text>
                         {pendingStats[stat.id] > 0 && (
                           <Animated.Text entering={FadeIn.duration(200)} className="text-xs ml-2 font-pixel-bold" style={{ color: stat.color }}>+{pendingStats[stat.id]}</Animated.Text>
                         )}
                      </View>
                   </View>
                </View>

                <View className="flex-row items-center gap-1.5">
                  {/* Undo button */}
                  {pendingStats[stat.id] > 0 && (
                    <Pressable 
                      onPress={() => handleUndo(stat.id)} 
                      className="w-8 h-8 bg-crimson/10 rounded-lg items-center justify-center border border-crimson/20 active:bg-crimson/20"
                    >
                      <Ionicons name="remove" size={12} color="#EF4444" />
                    </Pressable>
                  )}
                  {/* Add buttons */}
                  {availablePoints > 0 && (
                    <>
                      <Pressable 
                        onPress={() => handleAllocate(stat.id, 1)} 
                        className="w-10 h-10 bg-white/5 rounded-xl items-center justify-center border border-white/10 active:bg-white/10"
                      >
                        <Ionicons name="add" size={14} color="white" />
                      </Pressable>
                      {availablePoints >= 10 && (
                        <Pressable 
                          onPress={() => handleAllocate(stat.id, 10)} 
                          className="px-3 h-10 bg-white/10 rounded-xl items-center justify-center border border-white/20 active:bg-white/20"
                        >
                          <Text className="text-white text-[9px] font-pixel-bold">+10</Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
             </View>
           ))}

           {totalPending > 0 && (
             <View className="mt-2 space-y-3">
               <StandardButton 
                 label="Confirm Ascension"
                 onPress={confirmAllocation}
                 variant="primary"
                 loading={isAllocating}
                 size="lg"
                 className="w-full"
               />
               <TouchableOpacity onPress={resetPending} className="items-center py-1.5">
                 <Text className="text-white/35 text-[8px] font-pixel-bold uppercase tracking-widest">Reset Pending</Text>
               </TouchableOpacity>
             </View>
           )}
        </Card>

        {/* 📊 COMBAT DETAILS */}
        <View className="mb-24 px-1">
           <Text className="text-white/35 text-[8px] font-pixel-bold uppercase tracking-[2px] ml-2 mb-4">Combat Details</Text>
           
           {/* Offense */}
           <Card delay={100} className="mb-3 p-4 rounded-2xl">
             <Text className="text-crimson text-[7px] font-pixel-bold uppercase tracking-[2px] mb-3">Offense</Text>
             {[
               ["Attack Power", status.atk, projected?.atk, "#EF4444"],
               ["Crit Chance", (status.critChance ?? (status.luk * 0.003 * 100)).toFixed(1) + "%", projected?.crit, "#F59E0B"],
               ["Armor Pen", (status.armorPen ?? (status.dex / 1000 * 100)).toFixed(1) + "%", projected?.armorPen, "#3B82F6"],
               ["Gather Power", status.gatherPower ?? Math.floor(status.dex * 2 + status.int * 0.5), projected?.gather, "#8B5CF6"],
             ].map(([label, val, proj, color], i) => (
               <View key={i} className="flex-row justify-between items-center py-1.5 border-b border-white/[0.03]">
                 <Text className="text-white/50 text-[9px] font-pixel-bold">{label as string}</Text>
                 <View className="flex-row items-center gap-1">
                   {totalPending > 0 && proj !== undefined && String(proj) !== String(val) && (
                     <Text className="text-white/30 text-[8px] line-through mr-1">{String(val)}</Text>
                   )}
                   <Text className="text-white text-[10px] font-pixel-bold" style={{ color: color as string }}>
                     {totalPending > 0 && proj !== undefined ? proj : val}
                   </Text>
                 </View>
               </View>
             ))}
           </Card>

           {/* Defense */}
           <Card delay={150} className="mb-3 p-4 rounded-2xl">
             <Text className="text-mystic text-[7px] font-pixel-bold uppercase tracking-[2px] mb-3">Defense</Text>
             {[
               ["Defense Rating", status.def, projected?.def, "#A78BFA"],
               ["Dodge Chance", (status.dodgeChance ?? (status.agi / 1000 * 100)).toFixed(1) + "%", projected?.dodge, "#10B981"],
               ["PVP Flee", (status.pvpFlee ?? (status.agi / 150 * 100)).toFixed(1) + "%", projected?.pvpFlee, "#64748B"],
               ["Thorns", (status.thorns ?? 0).toFixed(1) + "%", null, "#F59E0B"],
             ].map(([label, val, proj, color], i) => (
               <View key={i} className="flex-row justify-between items-center py-1.5 border-b border-white/[0.03]">
                 <Text className="text-white/50 text-[9px] font-pixel-bold">{label as string}</Text>
                 <View className="flex-row items-center gap-1">
                   {totalPending > 0 && proj !== undefined && proj !== null && String(proj) !== String(val) && (
                     <Text className="text-white/30 text-[8px] line-through mr-1">{String(val)}</Text>
                   )}
                   <Text className="text-white text-[10px] font-pixel-bold" style={{ color: color as string }}>
                     {totalPending > 0 && proj !== undefined && proj !== null ? proj : val}
                   </Text>
                 </View>
               </View>
             ))}
           </Card>

           {/* Sustain */}
           <Card delay={200} className="mb-3 p-4 rounded-2xl">
             <Text className="text-verdant text-[7px] font-pixel-bold uppercase tracking-[2px] mb-3">Sustain</Text>
             {[
               ["Max Energy", status.maxEnergy, projected?.maxEnergy, "#F59E0B"],
               ["Life Steal", (status.lifesteal ?? 0).toFixed(1) + "%", null, "#EF4444"],
               ["HP Regen", (status.hpRegen ?? 0).toFixed(0) + "%", null, "#10B981"],
             ].map(([label, val, proj, color], i) => (
               <View key={i} className="flex-row justify-between items-center py-1.5 border-b border-white/[0.03]">
                 <Text className="text-white/50 text-[9px] font-pixel-bold">{label as string}</Text>
                 <View className="flex-row items-center gap-1">
                   {totalPending > 0 && proj !== undefined && proj !== null && String(proj) !== String(val) && (
                     <Text className="text-white/30 text-[8px] line-through mr-1">{String(val)}</Text>
                   )}
                   <Text className="text-white text-[10px] font-pixel-bold" style={{ color: color as string }}>
                     {totalPending > 0 && proj !== undefined && proj !== null ? proj : val}
                   </Text>
                 </View>
               </View>
             ))}
           </Card>

           {/* Utility */}
           <Card delay={250} className="p-4 rounded-2xl">
             <Text className="text-gold text-[7px] font-pixel-bold uppercase tracking-[2px] mb-3">Utility</Text>
             {[
               ["Gold Bonus", (status.goldBonus ?? 0).toFixed(0) + "%", "#F59E0B"],
               ["EXP Bonus", (status.equipExpBonus ?? 0).toFixed(0) + "%", "#3B82F6"],
               ["Move Speed", (status.moveSpeed ?? 0).toFixed(0) + "%", "#10B981"],
             ].map(([label, val, color], i) => (
               <View key={i} className="flex-row justify-between items-center py-1.5 border-b border-white/[0.03]">
                 <Text className="text-white/50 text-[9px] font-pixel-bold">{label as string}</Text>
                 <Text className="text-white text-[10px] font-pixel-bold" style={{ color: color as string }}>{val as string}</Text>
               </View>
             ))}
           </Card>
        </View>

      </ScrollView>

      <ReportModal visible={isReportModalVisible} onClose={() => setIsReportModalVisible(false)} />
    </View>
  );
}
