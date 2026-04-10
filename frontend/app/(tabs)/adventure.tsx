import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { gameApi, CharacterStatus, BattleLogPayload } from "../../api/game";
import Toast from "react-native-toast-message";
import { useAuthStore } from "../../store/useAuthStore";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { useGameStore } from "../../store/useGameStore";
import { useSocket } from "../../context/SocketContext";

const AFK_TIMEOUT = 10; // 10 seconds to act or skip

export default function AdventureScreen() {
  const isMetadataLoaded = useGameStore((state) => state.isMetadataLoaded);
  const [character, setCharacter] = useState<CharacterStatus | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogPayload[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);
  const { socket } = useSocket();
  const [journalVisible, setJournalVisible] = useState(false);
  const [countdown, setCountdown] = useState(AFK_TIMEOUT);
  
  // Battle Simulation State
  const [simBattle, setSimBattle] = useState<any>(null);
  const [simTurn, setSimTurn] = useState(0);

  // 🎭 Reanimated Values
  const translateY = useSharedValue(0);

  // 🔄 Fetch Status
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
      socket.on("pvp_ambush", (data: any) => {
        fetchStatus(); // Force refresh to show ambush modal
      });
    }
    return () => {
      socket?.off("zone_update");
      socket?.off("pvp_ambush");
    };
  }, [socket, fetchStatus]);

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

  const resolveEncounter = useCallback(async (action: "attack" | "skip" | "gather" | "enter_dungeon") => {
    if (isResolving) return;
    try {
      setIsResolving(true);
      const prevCharacter = character;
      const result = await gameApi.resolveEncounter(action);
      
      if (character && result.updatedChar && result.updatedChar.level > character.level) {
        Toast.show({ type: 'success', text1: '✨ LEVEL UP!', text2: `Level ${result.updatedChar.level} reached!`, visibilityTime: 3000 });
      }

      if ((action === "attack" || action === "gather") && result.log) {
        setSimBattle({
           ...result,
           isGathering: action === "gather",
           startPlayerHp: prevCharacter?.hp || 100,
           startMaxPlayerHp: prevCharacter?.maxHp || 100,
           startEnemyHp: action === "gather" ? (result.startIntegrity || 20) : (prevCharacter?.pendingEncounter?.hp || 50),
           startMaxEnemyHp: action === "gather" ? (result.startIntegrity || 20) : (prevCharacter?.pendingEncounter?.maxHp || 50),
        });
        setSimTurn(0);
      } else {
        fetchStatus();
      }
    } catch {
       Alert.alert("Error", "Failed to resolve encounter");
    } finally {
       setIsResolving(false);
    }
  }, [character, isResolving, fetchStatus]);

  // ⏳ AFK Timer Logic
  const encounterId = character?.pendingEncounter ? JSON.stringify(character.pendingEncounter) : null;
  
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (character?.pendingEncounter) {
      setCountdown(AFK_TIMEOUT); 
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            resolveEncounter("skip");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [encounterId, resolveEncounter, character?.pendingEncounter]);

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

  const combatSimulation = useMemo(() => {
    if (!simBattle) return null;
    let currentP = simBattle.startPlayerHp;
    let currentE = simBattle.startEnemyHp;
    for (let i = 0; i <= simTurn; i++) {
       const turn = simBattle.log.logDetails[i];
       if (!turn) break;
       if (turn.attacker === "Player") currentE = Math.max(0, currentE - turn.damage);
       else currentP = Math.max(0, currentP - turn.damage);
    }
    return {
       playerHpPercent: (currentP / simBattle.startMaxPlayerHp) * 100,
       enemyHpPercent: (currentE / simBattle.startMaxEnemyHp) * 100,
       playerHp: currentP,
       enemyHp: currentE
    };
  }, [simBattle, simTurn]);

  useEffect(() => {
    if (simBattle && simTurn < simBattle.log.logDetails.length - 1) {
      const t = setTimeout(() => setSimTurn(v => v + 1), 1200);
      return () => clearTimeout(t);
    } else if (simBattle && simTurn === simBattle.log.logDetails.length - 1) {
       const t = setTimeout(() => { setSimBattle(null); setSimTurn(0); fetchStatus(); }, 2500);
       return () => clearTimeout(t);
    }
  }, [simBattle, simTurn, fetchStatus]);

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
                          setSimTurn(0);
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

      {/* ⚠️ ENCOUNTER AMBUSH MODAL */}
      {character.pendingEncounter && (
        <Modal transparent animationType="fade">
           <View className="flex-1 bg-slate-950/90 justify-center items-center px-6">
              <View className="bg-slate-900 border border-indigo-500/30 p-8 rounded-[40px] w-full shadow-2xl overflow-hidden">
                 <View className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                    <View className="h-full bg-amber-500" style={{ width: `${(countdown / AFK_TIMEOUT) * 100}%` }} />
                 </View>

                 <View className="items-center mb-6">
                    <Text className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mb-2">Ambush! Auto-skip in {countdown}s</Text>
                    <Text className="text-3xl font-black text-white italic uppercase text-center">{character.pendingEncounter.name}</Text>
                 </View>

                  <View className="space-y-3">
                    {character.pendingEncounter.type === "DUNGEON" ? (
                      <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("enter_dungeon")} className="bg-fuchsia-600 p-5 rounded-3xl flex-row justify-center items-center shadow-lg shadow-fuchsia-500/30">
                         <Ionicons name="skull-outline" size={20} color="white" />
                         <Text className="text-white font-black uppercase tracking-widest ml-3">Delve Dungeon</Text>
                      </TouchableOpacity>
                    ) : character.pendingEncounter.type === "GATHERING" ? (
                      <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("gather")} className="bg-emerald-600 p-5 rounded-3xl flex-row justify-center items-center">
                         <Ionicons name="leaf-outline" size={20} color="white" />
                         <Text className="text-white font-black uppercase tracking-widest ml-3">Gather</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("attack")} className={`p-5 rounded-3xl flex-row justify-center items-center ${character.pendingEncounter.type === 'PVP' ? 'bg-orange-600' : 'bg-rose-600'}`}>
                         <Ionicons name={character.pendingEncounter.type === 'PVP' ? "flash-outline" : "bonfire-outline"} size={20} color="white" />
                         <Text className="text-white font-black uppercase tracking-widest ml-3">
                            {character.pendingEncounter.type === 'PVP' ? "Duel Player" : "Fight"}
                         </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity disabled={isResolving} onPress={() => resolveEncounter("skip")} className="bg-slate-800 p-5 rounded-3xl justify-center items-center mt-3">
                       <Text className="text-slate-400 font-black uppercase tracking-widest">
                          {character.pendingEncounter.type === 'PVP' ? "Attempt Escape" : "Bypass"}
                       </Text>
                    </TouchableOpacity>
                  </View>
              </View>
           </View>
        </Modal>
      )}

      {/* ⚔️ BATTLE SIMULATION OVERLAY */}
      {simBattle && combatSimulation && (
        <Modal transparent>
           <View className="flex-1 bg-slate-950/95 justify-center items-center p-6 pt-20">
              <View className="w-full flex-row justify-between items-center mb-10 px-4">
                 <View className="items-center flex-1">
                    <Text className="text-indigo-400 font-black text-xl mb-2">
                       {simBattle.isGathering ? "⚒️ Worker" : character.name}
                    </Text>
                    <View className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                       <View className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${combatSimulation.playerHpPercent}%` }} />
                    </View>
                    <Text className="text-slate-500 text-[10px] mt-1 font-bold">
                       {simBattle.isGathering ? "Efficiency" : `${Math.floor(combatSimulation.playerHp)} HP`}
                    </Text>
                 </View>
                 
                 <Text className="text-white font-black mx-6 text-2xl italic">
                    {simBattle.isGathering ? "AT" : "VS"}
                 </Text>
                 
                 <View className="items-center flex-1">
                    <Text className="text-rose-400 font-black text-xl mb-2">
                       {simBattle.isGathering ? "Resource" : simBattle.log.enemyName}
                    </Text>
                    <View className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                       <View className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${combatSimulation.enemyHpPercent}%` }} />
                    </View>
                    <Text className="text-slate-500 text-[10px] mt-1 font-bold">
                       {simBattle.isGathering ? "Integrity" : `${Math.floor(combatSimulation.enemyHp)} HP`}
                    </Text>
                 </View>
              </View>

              <View className="flex-1 w-full justify-center">
                 <View className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl">
                    <Text className="text-white text-center text-xl font-bold leading-relaxed">{simBattle.log.logDetails[simTurn]?.message}</Text>
                 </View>
              </View>

              <View className="flex-row space-x-2 mt-8">
                 {simBattle.log.logDetails.map((_: any, idx: number) => (
                    <View key={idx} className={`h-1.5 rounded-full ${idx === simTurn ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-800'}`} />
                 ))}
              </View>
           </View>
        </Modal>
      )}
    </View>
  );
}
