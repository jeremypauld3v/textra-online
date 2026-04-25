import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, Pressable, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, FadeInUp } from "react-native-reanimated";
import * as Haptics from 'expo-haptics';
import Toast from "react-native-toast-message";
import { BattleLogPayload, CharacterStatus, gameApi } from "../../api/game";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../store/useAuthStore";
import { useEncounterStore } from "../../store/useEncounterStore";
import { useGameStore } from "../../store/useGameStore";

// UI Components
import BaseModal from "../../components/ui/BaseModal";

// Constants
import { GAME_CONFIG } from "../../constants/GameConfig";

const RUNNING_SPRITE = require("../../assets/sprites/beta_character_running.gif");
const IDLE_SPRITE = require("../../assets/sprites/beta_character_idle_side.gif");

export default function AdventureScreen() {
  const isMetadataLoaded = useGameStore((state) => state.isMetadataLoaded);
  const [character, setCharacter] = useState<CharacterStatus | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogPayload[]>([]);
  const { socket } = useSocket();
  const [journalVisible, setJournalVisible] = useState(false);
  const setSimBattle = useEncounterStore((s) => s.setSimBattle);
  const [isResolving, setIsResolving] = useState(false);
  const [countdown, setCountdown] = useState(GAME_CONFIG.DECISION_COUNTDOWN_SECONDS);
  const router = useRouter();
  const pathname = usePathname();

  const translateY = useSharedValue(0);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await gameApi.getStatus();
      setCharacter(data.character);
      setBattleLogs(data.latestBattles);
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 404) useAuthStore.getState().logout();
    }
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("pvp_battle_start", (data: any) => {
        setSimBattle({ ...data, isPvp: true });
        if (pathname !== "/encounter") router.push("/encounter");
      });
      socket.on("pvp_ambush", () => {
        fetchStatus();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      });
      socket.on("pvp_incoming", (data: any) => {
        fetchStatus();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "info",
          text1: "⚔️ INCOMING ATTACK!",
          text2: `${data.attackerName} is attacking you!`,
        });
      });
      socket.on("pvp_fled", (data: any) => {
        fetchStatus();
        Toast.show({
          type: "info",
          text1: "💨 Escaped!",
          text2: data.message,
        });
      });
    }
    return () => { 
      socket?.off("pvp_battle_start"); 
      socket?.off("pvp_ambush");
      socket?.off("pvp_incoming");
      socket?.off("pvp_fled");
    };
  }, [socket, router, pathname, setSimBattle, fetchStatus]);

  useFocusEffect(useCallback(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, GAME_CONFIG.STATUS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]));

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const resolveEncounter = useCallback(async (action: "attack" | "skip" | "gather" | "enter_dungeon") => {
    if (isResolving) return;
    try {
      setIsResolving(true);
      const result = await gameApi.resolveEncounter(action);
      if (result.log) {
        setSimBattle({ ...result, isGathering: action === "gather", isPvp: false });
        router.push("/encounter");
        return;
      }
      fetchStatus();
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 404) useAuthStore.getState().logout();
      fetchStatus();
    }
    finally { setIsResolving(false); }
  }, [isResolving, fetchStatus, router, setSimBattle]);

  useEffect(() => {
    const isMoving = character?.actionStatus.includes("TRAVELING");
    translateY.value = withRepeat(withSequence(withTiming(isMoving ? -15 : -5, { duration: isMoving ? 300 : 2000 }), withTiming(0, { duration: isMoving ? 300 : 2000 })), -1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.actionStatus]);

  useEffect(() => {
    let timer: any;
    if (character?.pendingEncounter && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (character?.pendingEncounter && countdown <= 0) {
      // Don't auto-skip PVP_WAITING, it should stay until resolved or force-fought
      if (character.pendingEncounter.type !== "PVP_WAITING") {
        resolveEncounter("skip");
      }
    }
    return () => clearInterval(timer);
  }, [character?.pendingEncounter, countdown, resolveEncounter]);

  useEffect(() => {
    if (character?.pendingEncounter) {
      setCountdown(GAME_CONFIG.DECISION_COUNTDOWN_SECONDS);
    }
  }, [character?.pendingEncounter?.name]); // Reset on new encounter

  const handleSetDirection = async (dir: "OUT" | "IN" | "CAMP") => {
    if (!character || character.actionStatus === dir) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await gameApi.travel(dir);
      fetchStatus();
    } catch (e: any) { Alert.alert("Travel Interrupted", e.response?.data?.error); }
  };

  if (!isMetadataLoaded || !character) {
    return (
      <View className="flex-1 bg-[#020617] justify-center items-center">
        <ActivityIndicator color="#fbbf24" size="large" />
      </View>
    );
  }

  const enc = character.pendingEncounter as any;

  return (
    <View className="flex-1 bg-[#020617]">
      {/* 🌌 AMBIENT OVERLAYS */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 600, backgroundColor: character.isSafe ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)' }} />
      <View 
        // @ts-ignore
        style={{ position: 'absolute', top: 200, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: character.isSafe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }} 
      />

      {/* 🏛️ REGION HEADER */}
      <View className="pt-20 px-8 pb-8 flex-row justify-between items-end">
         <View>
            <View className="flex-row items-center mb-1">
               <View className={`w-2 h-2 rounded-full mr-2 ${character.isSafe ? "bg-emerald-500" : "bg-rose-500 shadow-lg shadow-rose-500"}`} />
               <Text className={`text-[10px] font-pixel-bold uppercase tracking-[4px] ${character.isSafe ? "text-emerald-500" : "text-rose-500"}`}>
                 {character.isSafe ? "Safe Haven" : "Cursed Wilds"}
               </Text>
            </View>
            <Text className="text-white text-2xl font-pixel-bold tracking-tighter">{character.locationName.toUpperCase()}</Text>
            <Text className="text-slate-600 text-[10px] font-pixel-bold uppercase tracking-[3px] mt-1">{character.currentDepth} Kilometers Deep</Text>
         </View>
         <Pressable 
           onPress={() => setJournalVisible(true)} 
           className="w-14 h-14 bg-slate-900 rounded-2xl items-center justify-center border border-white/10"
         >
            <Ionicons name="book" size={22} color="#94a3b8" />
         </Pressable>
      </View>

      {/* 📊 QUICK STATS BAR */}
      <View className="px-8 pb-6 flex-row space-x-4">
         <View className="flex-1 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
            <View className="flex-row justify-between items-center mb-1.5">
               <Text className="text-rose-500 text-[8px] font-pixel-bold uppercase tracking-widest">Health</Text>
               <Text className="text-white text-[8px] font-pixel-bold">{Math.floor(character.hp)} / {character.maxHp}</Text>
            </View>
            <View className="h-1 bg-slate-800 rounded-full overflow-hidden">
               <View className="h-full bg-rose-500" style={{ width: `${(character.hp / character.maxHp) * 100}%` }} />
            </View>
         </View>
         <View className="flex-1 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
            <View className="flex-row justify-between items-center mb-1.5">
               <Text className="text-amber-500 text-[8px] font-pixel-bold uppercase tracking-widest">Energy</Text>
               <Text className="text-white text-[8px] font-pixel-bold">{Math.floor(character.energy)} / {character.maxEnergy}</Text>
            </View>
            <View className="h-1 bg-slate-800 rounded-full overflow-hidden">
               <View className="h-full bg-amber-500" style={{ width: `${(character.energy / character.maxEnergy) * 100}%` }} />
            </View>
         </View>
         <View className="flex-1 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
            <View className="flex-row justify-between items-center mb-1.5">
               <Text className="text-indigo-400 text-[8px] font-pixel-bold uppercase tracking-widest">Exp</Text>
               <Text className="text-white text-[8px] font-pixel-bold">{character.exp}</Text>
            </View>
            <View className="h-1 bg-slate-800 rounded-full overflow-hidden">
               <View className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (character.exp / (character.level * 100)) * 100)}%` }} />
            </View>
         </View>
      </View>

      {/* 🎭 ADVENTURE STAGE */}
      <View className="flex-1 items-center justify-center">
        {character.actionStatus === "IN_DUNGEON" && character.dungeonState ? (
          <Animated.View entering={FadeInUp} className="items-center w-full px-12">
            <View className="px-6 py-2 bg-fuchsia-950/40 rounded-full border border-fuchsia-500/30 mb-8">
               <Text className="text-fuchsia-400 text-[10px] font-pixel-bold uppercase tracking-[6px]">Floor {character.dungeonState.floorIndex + 1}</Text>
            </View>
            <View className="items-center mb-12 relative">
               <View className="w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl absolute opacity-30" />
               <Text className="text-9xl mb-6 shadow-2xl">{character.dungeonState.currentFloor.type === "BOSS" ? "👺" : "🧌"}</Text>
               <Text className="text-white text-2xl font-pixel-bold uppercase tracking-widest text-center">{character.dungeonState.currentFloor.name}</Text>
            </View>
            <TouchableOpacity onPress={async () => {
              setIsResolving(true);
              try {
                const r = await gameApi.dungeonFight();
                if (r.type === "COMBAT") {
                  setSimBattle({ ...r, startPlayerHp: character.dungeonState!.hp, startMaxPlayerHp: character.dungeonState!.maxHp, startEnemyHp: character.dungeonState!.currentFloor.maxHp, startMaxEnemyHp: character.dungeonState!.currentFloor.maxHp });
                  router.push("/encounter");
                } else fetchStatus();
              } finally { setIsResolving(false); }
            }} className="w-full py-6 bg-fuchsia-600 rounded-3xl items-center border-b-4 border-fuchsia-800 shadow-2xl">
               <Text className="text-white font-pixel-bold uppercase tracking-widest text-lg">Challenge Fate</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View className="items-center">
            {/* 🕯️ MYSTIC CIRCLE */}
            <View className="absolute top-1/2 left-1/2 -ml-32 -mt-32 w-64 h-64 border border-white/5 rounded-full opacity-40 border-dashed" />
            <Animated.View style={animatedStyle} className="shadow-2xl shadow-white/10">
              <Image source={character.actionStatus.includes("TRAVELING") ? RUNNING_SPRITE : IDLE_SPRITE} style={{ width: 240, height: 240 }} contentFit="contain" />
            </Animated.View>
            <View className="mt-16 items-center">
               <Text className="text-white text-2xl font-pixel-bold uppercase tracking-widest mb-1 shadow-lg shadow-white/10">
                 {character.actionStatus === "TRAVELING_OUT" ? "Venturing Forth" : character.actionStatus === "TRAVELING_IN" ? "Returning Home" : character.actionStatus === "CAMPING" ? "Resting at Camp" : "Awaiting Command"}
               </Text>
               <TouchableOpacity 
                  onPress={async () => {
                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                     try {
                        await gameApi.pause(!character.isPaused);
                        fetchStatus();
                     } catch {
                        Toast.show({ type: "error", text1: "Action Failed" });
                     }
                  }}
                  className={`px-6 py-2 rounded-full border flex-row items-center space-x-2 ${character.isPaused ? "bg-amber-900/40 border-amber-500/30" : "bg-slate-900 border-white/5"}`}
               >
                  <Ionicons name={character.isPaused ? "play" : "pause"} size={12} color={character.isPaused ? "#fbbf24" : "#475569"} />
                  <Text className={`${character.isPaused ? "text-amber-500" : "text-slate-600"} text-[9px] font-pixel-bold uppercase tracking-[4px]`}>
                    {character.isPaused ? "Resume Journey" : "Pause Journey"}
                  </Text>
               </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 🧭 RUNESTONE NAVIGATION */}
      {character.actionStatus !== "IN_DUNGEON" && (
        <View className="pb-24 px-8">
          <View className="flex-row justify-center items-center space-x-10">
            {[
              { id: "IN", icon: "home", label: "Return", active: character.actionStatus === "TRAVELING_IN", color: "#60a5fa" },
              { id: "CAMP", icon: "bonfire", label: "Camp", active: character.actionStatus === "CAMPING", color: "#f59e0b" },
              { id: "OUT", icon: "compass", label: "Venture", active: character.actionStatus === "TRAVELING_OUT", color: "#ef4444" }
            ].map((btn) => (
              <Pressable key={btn.id} onPress={() => handleSetDirection(btn.id as any)} className="items-center">
                 <View className={`w-16 h-16 rounded-2xl items-center justify-center border-2 ${btn.active ? "bg-slate-800 border-white" : "bg-slate-900 border-white/10"}`}>
                    <Ionicons name={btn.icon as any} size={24} color={btn.active ? "#fff" : "#475569"} />
                 </View>
                 <Text className={`text-[10px] font-pixel-bold mt-3 uppercase tracking-widest ${btn.active ? "text-white" : "text-slate-600"}`}>{btn.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ⚔️ MYSTIC ENCOUNTER MODAL */}
      <BaseModal visible={!!enc} showClose={false} position="bottom" onClose={() => {}}>
        <View className="items-center pb-12 pt-6">
           <View className={`w-24 h-24 ${enc?.type === "DUNGEON" ? "bg-fuchsia-500/10 border-fuchsia-500/20" : enc?.type?.startsWith("PVP") ? "bg-rose-500/10 border-rose-500/20" : "bg-indigo-500/10 border-indigo-500/20"} rounded-full items-center justify-center border mb-8 shadow-2xl`}>
              <Text className="text-5xl">
                {enc?.type === "GATHERING" ? "💎" : 
                 enc?.type === "DUNGEON" ? "🏰" : 
                 enc?.type?.startsWith("PVP") ? "⚔️" : "👹"}
              </Text>
           </View>
           
           <Text className="text-white text-xl font-pixel-bold uppercase mb-3 tracking-tighter">
             {enc?.type === "PVP_INCOMING" ? "INCOMING ATTACK!" : enc?.name}
           </Text>
           
           <Text className="text-slate-500 text-xs text-center px-8 mb-12 leading-relaxed font-pixel-bold uppercase tracking-widest opacity-60">
             {enc?.type === "DUNGEON" ? "A labyrinth of peril and riches awaits your descent." : 
              enc?.type === "PVP_INCOMING" ? `${enc?.name} has ambushed you! Defend yourself!` :
              enc?.type === "PVP_WAITING" ? "Waiting for your opponent to respond..." :
              enc?.type === "PVP" ? "You've spotted another player. Will you strike?" :
              "A fateful discovery awaits. Will you embrace the challenge?"}
           </Text>

           <View className="w-full space-y-4">
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => resolveEncounter(enc?.type === "GATHERING" ? "gather" : enc?.type === "DUNGEON" ? "enter_dungeon" : "attack")} 
                className={`w-full py-6 ${enc?.type === "DUNGEON" ? "bg-fuchsia-600 border-fuchsia-800" : enc?.type?.startsWith("PVP") ? "bg-rose-600 border-rose-800" : "bg-indigo-600 border-indigo-800"} rounded-3xl items-center border-b-4`}
              >
                 <Text className="text-white font-pixel-bold uppercase tracking-widest text-lg">
                   {enc?.type === "GATHERING" ? "Harvest Soul" : 
                    enc?.type === "DUNGEON" ? "Enter Dungeon" : 
                    enc?.type === "PVP" ? "Strike First" :
                    enc?.type === "PVP_INCOMING" ? "Defend" :
                    enc?.type === "PVP_WAITING" ? "Force Fight" : "Slay Foe"}
                 </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => resolveEncounter("skip")} 
                className="w-full py-4 items-center"
                disabled={enc?.type === "PVP_WAITING"}
              >
                 <Text className={`text-[10px] font-pixel-bold uppercase tracking-[4px] ${enc?.type === "PVP_WAITING" ? "text-slate-800" : "text-slate-600"}`}>
                   {enc?.type?.startsWith("PVP") ? "Attempt Escape" : "Retreat"} {enc?.type !== "PVP_WAITING" ? `(${countdown}s)` : ""}
                 </Text>
              </TouchableOpacity>
           </View>
        </View>
      </BaseModal>

      {/* 📜 ANCIENT JOURNAL */}
      <BaseModal visible={journalVisible} onClose={() => setJournalVisible(false)} title="Chronicle of Valor">
        <FlatList data={battleLogs} keyExtractor={(_, idx) => idx.toString()} renderItem={({ item }) => (
            <View className="mb-6 p-4 bg-slate-900/40 border border-white/5 rounded-2xl shadow-inner">
              <View className="flex-row justify-between mb-3 items-center">
                <View className={`px-2 py-1 rounded border ${item.isWin ? "bg-emerald-900/20 border-emerald-500/40" : "bg-rose-900/20 border-rose-500/40"}`}>
                   <Text className={`text-[8px] font-pixel-bold uppercase ${item.isWin ? "text-emerald-400" : "text-rose-400"}`}>{item.isWin ? "Victory" : "Defeat"}</Text>
                </View>
                <Text className="text-slate-700 text-[8px] font-pixel-bold">{new Date(item.createdAt).toLocaleTimeString()}</Text>
              </View>
              <Text className="text-slate-400 text-xs font-sans leading-relaxed italic" numberOfLines={2}>&quot;{item.logDetails[0]?.message}&quot;</Text>
            </View>
          )} />
      </BaseModal>
    </View>
  );
}
