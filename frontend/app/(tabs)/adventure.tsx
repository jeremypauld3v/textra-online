import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback, useRef } from "react";
import { useFocusEffect, useRouter, usePathname } from "expo-router";
import { gameApi, CharacterStatus, BattleLogPayload } from "../../api/game";
import Toast from "react-native-toast-message";
import { useAuthStore } from "../../store/useAuthStore";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useGameStore } from "../../store/useGameStore";
import { useSocket } from "../../context/SocketContext";
import { useEncounterStore } from "../../store/useEncounterStore";

export default function AdventureScreen() {
  const isMetadataLoaded = useGameStore((state) => state.isMetadataLoaded);
  const [character, setCharacter] = useState<CharacterStatus | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogPayload[]>([]);
  const [nearbyCount, setNearbyCount] = useState(0);
  const { socket } = useSocket();
  const [journalVisible, setJournalVisible] = useState(false);
  const setSimBattle = useEncounterStore((s) => s.setSimBattle);
  const [isResolving, setIsResolving] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const timerActiveRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 🔄 Fetch Status

  // 🎭 Reanimated Values
  const translateY = useSharedValue(0);

  const fetchStatus = useCallback(async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    try {
      const data = await gameApi.getStatus();
      setCharacter(data.character);
      setBattleLogs(data.latestBattles);
    } catch (e: any) {
      if (e.response?.status === 401) {
        useAuthStore.getState().logout();
      }
    }
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("zone_update", (data: { nearbyCount: number }) => {
        setNearbyCount(data.nearbyCount);
      });
      // Encounter popup handled inline — just refresh status
      socket.on("pvp_ambush", fetchStatus);
      socket.on("pvp_incoming", fetchStatus);
      // Battle result → set simBattle + navigate to battle screen
      socket.on("pvp_battle_start", (data: any) => {
        setSimBattle({
          log: data.log,
          startPlayerHp: data.startPlayerHp,
          startMaxPlayerHp: data.startMaxPlayerHp,
          startEnemyHp: data.startEnemyHp,
          startMaxEnemyHp: data.startMaxEnemyHp,
          playerName: data.playerName,
          enemyName: data.enemyName,
          isPvp: true,
          isWin: data.isWin,
          goldStolen: data.goldStolen,
        });
        if (pathname !== '/encounter') router.push('/encounter');
      });
      socket.on("pvp_fled", (data: any) => {
        Toast.show({ type: 'info', text1: '⚡ Escaped!', text2: data.message || 'Target fled!' });
        fetchStatus();
      });
    }
    return () => {
      socket?.off("zone_update");
      socket?.off("pvp_ambush");
      socket?.off("pvp_incoming");
      socket?.off("pvp_battle_start");
      socket?.off("pvp_fled");
    };
  }, [socket, fetchStatus, router, pathname, setSimBattle]);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }, [fetchStatus])
  );

  // 🎭 Character Animation Logic
  useEffect(() => {
    const isMoving = character?.actionStatus === "TRAVELING_OUT" || character?.actionStatus === "TRAVELING_IN";
    translateY.value = 0;
    
    if (isMoving) {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-20, { duration: 250 }),
          withTiming(0, { duration: 250 })
        ),
        -1)
    } else {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1)
    }
  }, [character?.actionStatus, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: translateY.value }],
    };
  }, [translateY]);


  // ── Encounter resolve — handles all types inline ─────────────────────────
  const resolveEncounter = useCallback(async (action: "attack" | "skip" | "gather" | "enter_dungeon") => {
    if (isResolving) return;
    try {
      setIsResolving(true);
      const prevEncounter = character?.pendingEncounter as any;
      const prevChar = character;
      const result = await gameApi.resolveEncounter(action);

      if (prevChar && result.updatedChar && result.updatedChar.level > prevChar.level) {
        Toast.show({ type: 'success', text1: '✨ LEVEL UP!', text2: `Level ${result.updatedChar.level} reached!`, visibilityTime: 3000 });
      }

      // PVP Step 1: P2 attacked → show PVP_WAITING
      if (action === "attack" && prevEncounter?.type === "PVP") {
        fetchStatus(); return;
      }

      // PVP Step 2 / PVE / Gathering → battle animation
      if ((action === "attack" || action === "gather") && result.log) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerActiveRef.current = null;
        setSimBattle({
          ...result,
          isGathering: action === "gather",
          startPlayerHp: action === "attack" && (prevEncounter?.type === "PVP_INCOMING" || prevEncounter?.type === "PVP_WAITING")
            ? result.startPlayerHp
            : (prevChar?.hp || 100),
          startMaxPlayerHp: action === "attack" && (prevEncounter?.type === "PVP_INCOMING" || prevEncounter?.type === "PVP_WAITING")
            ? result.startMaxPlayerHp
            : (prevChar?.maxHp || 100),
          startEnemyHp: action === "gather" ? (result.startIntegrity || 20) : (result.startEnemyHp || prevEncounter?.hp || 50),
          startMaxEnemyHp: action === "gather" ? (result.startIntegrity || 20) : (result.startMaxEnemyHp || prevEncounter?.maxHp || 50),
          playerName: result.playerName,
          enemyName: result.enemyName,
          isPvp: prevEncounter?.type === "PVP_INCOMING" || prevEncounter?.type === "PVP_WAITING",
          isWin: result.isWin,
          goldStolen: result.goldStolen,
        });
        router.push('/encounter');
        return;
      }

      fetchStatus();
    } catch {
      Alert.alert("Error", "Failed to resolve encounter");
    } finally {
      setIsResolving(false);
    }
  }, [character, isResolving, fetchStatus, router, setSimBattle]);

  // ── Encounter AFK Timer — stable key prevents restarts ───────────────────
  const enc = character?.pendingEncounter as any;
  const encounterKey = enc ? `${enc.type}::${enc.name ?? ''}::${enc.targetId ?? ''}` : null;

  useEffect(() => {
    if (!encounterKey) { timerActiveRef.current = null; return; }
    if (timerActiveRef.current === encounterKey) return;
    timerActiveRef.current = encounterKey;
    setCountdown(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          const encType = (character?.pendingEncounter as any)?.type;
          resolveEncounter(encType === "PVP_WAITING" ? "attack" : "skip");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [encounterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isProcessingDirection, setIsProcessingDirection] = useState(false);

  const handleSetDirection = async (dir: "OUT" | "IN" | "CAMP") => {
    if (!character || isProcessingDirection || character.actionStatus === dir) return;
    setIsProcessingDirection(true);
    try {
      await gameApi.travel(dir);
      fetchStatus();
    } catch (e: any) {
      Alert.alert("Action Failed", e.response?.data?.error || "Unknown error");
    } finally {
      setTimeout(() => setIsProcessingDirection(false), 800);
    }
  };


  if (!isMetadataLoaded || !character) {
    return (
      <View className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator color="#6366f1" size="large" />
        <Text className="text-slate-500 font-bold mt-4 uppercase tracking-widest text-xs">Synchronizing world data...</Text>
      </View>
    );
  }

  const inDungeon = character.actionStatus === "IN_DUNGEON";
  const dungeon = character.dungeonState;
  const isSafe = character.isSafe;

  return (
    <View className="flex-1 bg-slate-950 px-6 pt-16">
      
      {/* 🚀 HUD Status Plate (Top) */}
      <View className="flex-row justify-between items-start mb-6 w-full">
        <View className="flex-1">
          <Text className={`font-bold uppercase text-[10px] tracking-[2px] mb-1 ${isSafe ? 'text-emerald-400' : 'text-rose-500'}`}>
            {isSafe ? "SAFE ZONE" : "DANGER ZONE"}
          </Text>
          <Text className="text-3xl font-black text-white italic uppercase tracking-tighter mb-3">
            {character.locationName}
          </Text>
          
          <View className="space-y-2">
            <View className="flex-row items-center w-48">
               <View className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden mr-3">
                  <View className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" style={{ width: `${(character.hp / character.maxHp) * 100}%` }} />
               </View>
               <Text className="text-slate-500 font-bold text-[8px] uppercase w-10">{Math.floor(character.hp)} HP</Text>
            </View>
            <View className="flex-row items-center w-48">
               <View className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden mr-3">
                  <View className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" style={{ width: `${(character.exp / (character.level * 100)) * 100}%` }} />
               </View>
               <Text className="text-slate-500 font-bold text-[8px] uppercase w-10">{character.exp} XP</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={() => setJournalVisible(true)} className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <Ionicons name="journal-outline" size={20} color="#818cf8" />
        </TouchableOpacity>
      </View>

      {/* 🧭 RADIAL DEPTH GAUGE & MODIFIERS */}
      {!inDungeon && (
        <View>
          <View className="flex-row items-center justify-center bg-slate-900/50 py-3 rounded-3xl border border-white/5 mb-3">
            <Ionicons name="compass" size={14} color={isSafe ? "#10b981" : "#f43f5e"} style={{marginRight: 6}} />
            <Text className="text-white font-black uppercase text-xs tracking-widest">
               {character.currentDepth} KM FROM CITY {character.rankName !== 'Standard' && <Text className="text-indigo-400"> • {character.rankName}</Text>}
            </Text>
          </View>

          {/* 💎 MODIFIER PLATE */}
          <View className="flex-row space-x-2 mb-4">
             <View className="flex-1 bg-amber-500/10 border border-amber-500/20 py-2 rounded-2xl items-center flex-row justify-center">
                <Text className="text-amber-500 text-xs mr-2">💎</Text>
                <Text className="text-amber-200 text-[9px] font-black uppercase">+{character.lootBonus}% LOOT</Text>
             </View>
             <View className="flex-1 bg-cyan-500/10 border border-cyan-500/20 py-2 rounded-2xl items-center flex-row justify-center">
                <Text className="text-cyan-500 text-xs mr-2">📈</Text>
                <Text className="text-cyan-200 text-[9px] font-black uppercase">+{character.expBonus}% EXP</Text>
             </View>
             <View className="flex-1 bg-rose-500/10 border border-rose-500/20 py-2 rounded-2xl items-center flex-row justify-center">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-rose-500 mr-2 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    <Text className="text-rose-400 font-black text-[10px] uppercase tracking-widest">{character.dangerLevel}</Text>
                  </View>
                  {nearbyCount > 0 && (
                    <View className="flex-row items-center ml-4">
                      <Ionicons name="people" size={12} color="#94a3b8" />
                      <Text className="text-slate-400 font-bold text-[10px] ml-1 uppercase tracking-tighter">Nearby: {nearbyCount}</Text>
                    </View>
                  )}
             </View>
          </View>
        </View>
      )}

      {/* 🎭 CHARACTER STAGE (Center) */}
      <View className="flex-1 justify-center items-center">
         {inDungeon && dungeon ? (
           <View className="items-center w-full">
              <Text className="text-fuchsia-400 font-black uppercase text-xs tracking-[5px] mb-2">Floor {dungeon.floorIndex + 1} / {dungeon.totalFloors}</Text>
              <Text className="text-3xl font-black text-white italic uppercase mb-8 text-center">{dungeon.name}</Text>
              
              <View className="bg-slate-900 border border-fuchsia-500/30 p-8 rounded-[40px] w-full items-center shadow-lg shadow-fuchsia-500/20 mb-8">
                 <Text className="text-6xl mb-4">{dungeon.currentFloor.type === "BOSS" ? "👹" : dungeon.currentFloor.type === "TREASURE" ? "🎁" : "🧌"}</Text>
                 <Text className="text-white font-bold text-xl">{dungeon.currentFloor.name || "Treasure Room"}</Text>
                 {dungeon.currentFloor.type !== "TREASURE" && (
                    <Text className="text-slate-400 mt-2 font-bold">HP: {dungeon.currentFloor.hp} / {dungeon.currentFloor.maxHp}</Text>
                 )}
              </View>

              <TouchableOpacity 
                 disabled={isResolving}
                 onPress={async () => {
                    if (isResolving) return;
                    setIsResolving(true);
                    try {
                       const result = await gameApi.dungeonFight();
                       if (result.type === "COMBAT") {
                          setSimBattle({ ...result, startPlayerHp: dungeon.hp, startMaxPlayerHp: dungeon.maxHp, startEnemyHp: dungeon.currentFloor.maxHp, startMaxEnemyHp: dungeon.currentFloor.maxHp });
                          router.push('/encounter');
                       } else if (result.type === "TREASURE") {
                          Toast.show({ type: 'success', text1: 'Loot Found!', text2: result.message });
                          fetchStatus();
                       }
                    } catch(e: any) {
                       Alert.alert("Dungeon Error", e.response?.data?.error || "Unknown error");
                    } finally {
                       setIsResolving(false);
                    }
                 }}
                 className="bg-fuchsia-600 p-5 rounded-3xl w-full items-center"
              >
                 <Text className="text-white font-black uppercase tracking-widest text-lg">
                    {dungeon.currentFloor.type === "TREASURE" ? "Open Chest" : "Fight"}
                 </Text>
              </TouchableOpacity>
           </View>
         ) : (
           <>
             <Animated.View style={animatedStyle} className="items-center">
                <View className="bg-slate-900/50 p-12 rounded-full border border-indigo-500/10 shadow-3xl">
                   <Text className="text-8xl">
                      {character.actionStatus === "TRAVELING_OUT" ? "🏃‍♂️" : character.actionStatus === "TRAVELING_IN" ? "🏃‍♂️" : character.currentDepth === 0 ? "🧘" : "⛺"}
                   </Text>
                </View>
                <View className="w-24 h-4 bg-black/20 rounded-full mt-4 blur-xl" style={{ transform: [{ scale: 1.2 }] }} />
             </Animated.View>
             
             <Text className="text-slate-700 font-black uppercase text-xs tracking-[8px] mt-10 text-center">
                {character.actionStatus === "TRAVELING_OUT" ? "VENTURING OUT" : character.actionStatus === "TRAVELING_IN" ? "RETURNING HOME" : character.actionStatus === "CAMPING" ? "CAMPED / FARMING" : "IDLE"}
             </Text>
           </>
         )}
      </View>

      {/* 🧭 MOVEMENT CONTROLS (Bottom) */}
      {!inDungeon && (
        <View className="pb-12 space-y-3">
          <View className="flex-row space-x-3">
            <TouchableOpacity 
              disabled={isProcessingDirection || character.actionStatus === 'TRAVELING_OUT'}
              onPress={() => handleSetDirection("OUT")} 
              className={`flex-1 p-5 rounded-3xl flex-row justify-center items-center shadow-lg ${character.actionStatus === 'TRAVELING_OUT' ? 'bg-indigo-600 shadow-indigo-500/40 border border-indigo-400/50' : 'bg-slate-900 border border-slate-800'}`}
            >
              <Ionicons name="compass-outline" size={20} color={character.actionStatus === 'TRAVELING_OUT' ? "white" : "#6366f1"} />
              <Text className={`font-black uppercase tracking-widest ml-3 ${character.actionStatus === 'TRAVELING_OUT' ? 'text-white' : 'text-slate-400'}`}>Venture Out</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              disabled={isProcessingDirection || character.actionStatus === 'CAMPING'}
              onPress={() => handleSetDirection("CAMP")} 
              className={`flex-1 p-5 rounded-3xl flex-row justify-center items-center shadow-lg ${character.actionStatus === 'CAMPING' ? 'bg-amber-600 shadow-amber-500/40 border border-amber-400/50' : 'bg-slate-900 border border-slate-800'}`}
            >
              <Ionicons name="bonfire-outline" size={20} color={character.actionStatus === 'CAMPING' ? "white" : "#d97706"} />
              <Text className={`font-black uppercase tracking-widest ml-3 ${character.actionStatus === 'CAMPING' ? 'text-white' : 'text-slate-400'}`}>Pitch Camp</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={() => handleSetDirection("IN")} 
            disabled={character.currentDepth === 0 || isProcessingDirection || character.actionStatus === 'TRAVELING_IN'}
            className={`w-full p-5 rounded-3xl flex-row justify-center items-center shadow-lg ${character.actionStatus === 'TRAVELING_IN' ? 'bg-emerald-600 shadow-emerald-500/40 border border-emerald-400/50' : character.currentDepth === 0 ? 'bg-slate-900 opacity-30 shadow-none' : 'bg-slate-900 border border-slate-800'}`}
          >
            <Ionicons name="home-outline" size={20} color={character.actionStatus === 'TRAVELING_IN' ? "white" : "#10b981"} />
            <Text className={`font-black uppercase tracking-widest ml-3 ${character.actionStatus === 'TRAVELING_IN' ? 'text-white' : character.currentDepth === 0 ? 'text-slate-700' : 'text-slate-400'}`}>Return Home</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 📜 JOURNAL MODAL */}
      <Modal visible={journalVisible} transparent animationType="slide">
         <View className="flex-1 bg-slate-950/95 justify-end">
            <View className="bg-slate-900 rounded-t-[50px] p-8 border-t border-slate-800 h-[70%]">
               <View className="flex-row justify-between items-center mb-8">
                  <Text className="text-white text-3xl font-black italic uppercase">Journal</Text>
                  <TouchableOpacity onPress={() => setJournalVisible(false)} className="bg-slate-800 p-2 rounded-full">
                     <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
               </View>

               <FlatList
                 data={battleLogs}
                 keyExtractor={(i) => i.id}
                 renderItem={({ item }) => (
                   <View className="bg-slate-950 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center">
                     <View className={`w-10 h-10 rounded-xl justify-center items-center ${item.isWin ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                       <Ionicons name={item.isWin ? "shield-checkmark" : "skull"} size={20} color={item.isWin ? "#10b981" : "#f43f5e"} />
                     </View>
                     <View className="ml-4 flex-1">
                       <Text className="text-white font-bold">{item.enemyName}</Text>
                       <Text className="text-slate-500 text-xs">+{item.expGained} XP • {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                     </View>
                   </View>
                 )}
                 ListEmptyComponent={<Text className="text-slate-600 text-center py-20 italic">No records found...</Text>}
               />
            </View>
         </View>
      </Modal>
      {/* ⚔️ ENCOUNTER MODAL (decision only — battle plays on /encounter screen) */}
      {character.pendingEncounter && (
        <Modal transparent animationType="fade">
          <View className="flex-1 bg-slate-950/90 justify-center items-center px-6">
            <View className="bg-slate-900 border border-indigo-500/30 p-8 rounded-[40px] w-full shadow-2xl overflow-hidden">
              {/* Countdown bar */}
              <View className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                <View className="h-full bg-amber-500" style={{ width: `${(countdown / 30) * 100}%` }} />
              </View>

              <View className="items-center mb-6">
                {enc?.type === 'PVP_INCOMING' ? (
                  <Text className="text-rose-400 font-bold uppercase tracking-widest text-[10px] mb-2">⚔️ You&apos;ve been attacked!</Text>
                ) : enc?.type === 'PVP_WAITING' ? (
                  <Text className="text-amber-400 font-bold uppercase tracking-widest text-[10px] mb-2">⏳ Awaiting response... ({countdown}s)</Text>
                ) : enc?.type === 'PVP' ? (
                  <Text className="text-orange-400 font-bold uppercase tracking-widest text-[10px] mb-2">⚠️ AMBUSH! {countdown}s to decide</Text>
                ) : (
                  <Text className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-2">ENCOUNTER! Skip in {countdown}s</Text>
                )}
                <Text className="text-3xl font-black text-white italic uppercase text-center">{enc?.name}</Text>
                {(enc?.type === 'PVP' || enc?.type === 'PVP_INCOMING') && (
                  <Text className="text-slate-400 text-xs mt-1">Lv.{enc?.level} · {enc?.hp} HP</Text>
                )}
              </View>

              <View className="space-y-3">
                {enc?.type === "DUNGEON" && (
                  <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("enter_dungeon")} className="bg-fuchsia-600 p-5 rounded-3xl flex-row justify-center items-center">
                    <Ionicons name="skull-outline" size={20} color="white" />
                    <Text className="text-white font-black uppercase tracking-widest ml-3">Delve Dungeon</Text>
                  </TouchableOpacity>
                )}
                {enc?.type === "GATHERING" && (
                  <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("gather")} className="bg-emerald-600 p-5 rounded-3xl flex-row justify-center items-center">
                    <Ionicons name="leaf-outline" size={20} color="white" />
                    <Text className="text-white font-black uppercase tracking-widest ml-3">Gather</Text>
                  </TouchableOpacity>
                )}
                {enc?.type === "PVE" && (
                  <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("attack")} className="bg-rose-600 p-5 rounded-3xl flex-row justify-center items-center">
                    <Ionicons name="bonfire-outline" size={20} color="white" />
                    <Text className="text-white font-black uppercase tracking-widest ml-3">Fight</Text>
                  </TouchableOpacity>
                )}
                {enc?.type === "PVP" && (
                  <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("attack")} className="bg-orange-600 p-5 rounded-3xl flex-row justify-center items-center">
                    <Ionicons name="flash-outline" size={20} color="white" />
                    <Text className="text-white font-black uppercase tracking-widest ml-3">⚔️ Attack</Text>
                  </TouchableOpacity>
                )}
                {enc?.type === "PVP_INCOMING" && (
                  <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("attack")} className="bg-rose-700 p-5 rounded-3xl flex-row justify-center items-center border border-rose-500/50">
                    <Ionicons name="shield-outline" size={20} color="white" />
                    <Text className="text-white font-black uppercase tracking-widest ml-3">⚔️ Fight Back</Text>
                  </TouchableOpacity>
                )}
                {enc?.type === "PVP_WAITING" && (
                  <View className="bg-slate-800/60 p-5 rounded-3xl flex-row justify-center items-center">
                    <ActivityIndicator size="small" color="#f59e0b" />
                    <Text className="text-amber-400 font-black uppercase tracking-widest ml-3">Waiting for response...</Text>
                  </View>
                )}
                {enc?.type !== "PVP_WAITING" && (
                  <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("skip")} className="bg-slate-800 p-5 rounded-3xl justify-center items-center">
                    <Text className="text-slate-400 font-black uppercase tracking-widest">
                      {enc?.type === 'PVP' ? 'Say Hello (Flee)' :
                       enc?.type === 'PVP_INCOMING' ? 'Flee (AGI-based)' : 'Bypass'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}
