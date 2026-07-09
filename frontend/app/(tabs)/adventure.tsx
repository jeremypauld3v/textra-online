import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useState, useRef } from "react";
import { ActivityIndicator, Alert, FlatList, Text, Pressable, TouchableOpacity, View, Dimensions, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from 'expo-haptics';
import Toast from "react-native-toast-message";
import { BattleLogPayload, CharacterStatus, gameApi } from "../../api/game";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../store/useAuthStore";
import { useEncounterStore } from "../../store/useEncounterStore";
import { useGameStore } from "../../store/useGameStore";
import { useCharacterStore } from "../../store/useCharacterStore";

// UI Components
import BaseModal from "../../components/ui/BaseModal";
import EncounterRewardModal from "../../components/EncounterRewardModal";

// Constants
import { GAME_CONFIG } from "../../constants/GameConfig";

const RUNNING_SPRITE = require("../../assets/sprites/beta_character_running.gif");
const IDLE_SPRITE = require("../../assets/sprites/beta_character_idle_side.gif");
const ATTACK_SPRITE = require("../../assets/sprites/beta_character_attack.gif");

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SPRITE_SIZE = SCREEN_HEIGHT < 750 ? 180 : 240;

export default function AdventureScreen() {
  const isMetadataLoaded = useGameStore((state) => state.isMetadataLoaded);
  
  // Central character state
  const character = useCharacterStore((state) => state.character);
  const battleLogs = useCharacterStore((state) => state.battleLogs);
  const fetchStatus = useCharacterStore((state) => state.fetchStatus);

  const { socket } = useSocket();
  const [journalVisible, setJournalVisible] = useState(false);
  const [rewardData, setRewardData] = useState<{ isWin: boolean; lootedItems: any[]; experienceGained: number; goldGained: number } | null>(null);
  const setSimBattle = useEncounterStore((s) => s.setSimBattle);
  const [isResolving, setIsResolving] = useState(false);
  const resolvingRef = useRef(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [countdown, setCountdown] = useState(GAME_CONFIG.DECISION_COUNTDOWN_SECONDS);
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  // 🤖 AUTO-PLAY STATE
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(false);
  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);

  // 💀 Stop autoplay on death
  useEffect(() => {
    if (character && character.hp <= 0 && autoPlay) {
      setAutoPlay(false);
    }
  }, [character?.hp, autoPlay]);

  // 🖥️ SCREENSAVER STATE
  const screensaverActive = useCharacterStore((state) => state.screensaverActive);
  const setScreensaverActive = useCharacterStore((state) => state.setScreensaverActive);
  const lastInteraction = useRef(Date.now());
  const SCREENSAVER_DELAY = 30_000; // 30 seconds idle triggers screensaver

  // Track user interaction to reset screensaver timer
  const resetIdle = useCallback(() => {
    lastInteraction.current = Date.now();
    if (screensaverActive) setScreensaverActive(false);
  }, [screensaverActive]);

  // Screensaver idle check — only when autoPlay is on
  useEffect(() => {
    if (!autoPlay) {
      if (screensaverActive) setScreensaverActive(false);
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() - lastInteraction.current > SCREENSAVER_DELAY && !screensaverActive) {
        setScreensaverActive(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [autoPlay, screensaverActive]);

  const translateY = useSharedValue(0);

  // Play satisfying alert haptic when a new encounter spawns
  useEffect(() => {
    if (character?.pendingEncounter) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [character?.pendingEncounter]);

  useEffect(() => {
    if (socket) {
      socket.on("pvp_battle_start", (data: any) => {
        setSimBattle({ ...data, isPvp: true });
        const char = useCharacterStore.getState().character;
        if (char) {
          useCharacterStore.getState().setCharacter({
            ...char,
            pendingEncounter: null
          });
        }
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
          autoHide: true,
          visibilityTime: 4000 // Longer for incoming attacks
        });
      });
      socket.on("pvp_fled", (data: any) => {
        fetchStatus();
        Toast.show({
          type: "info",
          text1: "💨 Escaped!",
          text2: data.message,
          autoHide: true,
          visibilityTime: 3000
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
  }, [fetchStatus]));

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const resolveEncounter = useCallback(async (action: "attack" | "skip" | "gather" | "enter_dungeon") => {
    if (resolvingRef.current) return;
    try {
      resolvingRef.current = true;
      setIsResolving(true);
      if (action === "attack" || action === "gather") {
        setIsAttacking(true);
        setTimeout(() => setIsAttacking(false), 1000);
      }
      const result = await gameApi.resolveEncounter(action);
      if (result.log) {
        // Auto-play: skip battle animation, show rewards briefly then continue
        if (autoPlayRef.current) {
          setRewardData({
            isWin: result.isWin ?? true,
            lootedItems: result.lootedItems || [],
            experienceGained: result.experienceGained || 0,
            goldGained: result.goldGained || 0,
          });
          fetchStatus();
          return;
        }
        // Manual: navigate to encounter screen for battle animation
        setSimBattle({ ...result, isGathering: action === "gather", isPvp: false });
        const char = useCharacterStore.getState().character;
        if (char) {
          useCharacterStore.getState().setCharacter({
            ...char,
            pendingEncounter: null
          });
        }
        router.push("/encounter");
        return;
      }
      fetchStatus();
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 404) useAuthStore.getState().logout();
      fetchStatus();
    }
    finally { 
      resolvingRef.current = false;
      setIsResolving(false); 
    }
  }, [fetchStatus, router, setSimBattle]);

  useEffect(() => {
    const status = character?.actionStatus;
    const isMoving = status?.includes("TRAVELING");
    translateY.value = withRepeat(withSequence(withTiming(isMoving ? -15 : -5, { duration: isMoving ? 300 : 2000 }), withTiming(0, { duration: isMoving ? 300 : 2000 })), -1);
  }, [character?.actionStatus]);

  // ⚡ AUTO-ACCEPT: only when autoPlay is on — PVE & Gathering resolve automatically
  useEffect(() => {
    const enc = character?.pendingEncounter;
    if (!enc || !autoPlay) return;
    
    const isAuto = enc.type === "PVE" || enc.type === "GATHERING";
    if (!isAuto) return;

    const action = enc.type === "GATHERING" ? "gather" : "attack";
    const delay = setTimeout(() => resolveEncounter(action as "attack" | "gather"), 1500);
    return () => clearTimeout(delay);
  }, [character?.pendingEncounter, autoPlay, resolveEncounter]);

  // ⏳ COUNTDOWN: for manual encounters (PVP / Dungeon), auto-skip when timer expires
  useEffect(() => {
    let timer: any;
    if (character?.pendingEncounter && countdown > 0) {
      const isAuto = character.pendingEncounter.type === "PVE" || character.pendingEncounter.type === "GATHERING";
      if (!isAuto) {
        timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
      }
    } else if (character?.pendingEncounter && countdown <= 0) {
      if (character.pendingEncounter.type !== "PVP_WAITING") {
        resolveEncounter("skip");
      }
    }
    return () => clearInterval(timer);
  }, [character?.pendingEncounter, countdown, resolveEncounter]);

  // 🤖 AUTO-DISMISS REWARD MODAL when autoPlay is on
  useEffect(() => {
    if (!autoPlay || !rewardData) return;
    const delay = setTimeout(() => setRewardData(null), 2000);
    return () => clearTimeout(delay);
  }, [rewardData, autoPlay]);

  useEffect(() => {
    if (character?.pendingEncounter) {
      setCountdown(GAME_CONFIG.DECISION_COUNTDOWN_SECONDS);
    }
  }, [character?.pendingEncounter]); // Reset on new encounter

  const handleSetDirection = async (dir: "OUT" | "IN" | "CAMP") => {
    if (!character || character.actionStatus === dir) return;
    resetIdle();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await gameApi.travel(dir);
      fetchStatus();
    } catch (e: any) { Alert.alert("Travel Interrupted", e.response?.data?.error); }
  };

  if (!isMetadataLoaded || !character) {
    return (
      <View className="flex-1 bg-void justify-center items-center">
        <ActivityIndicator color="#A78BFA" size="large" />
      </View>
    );
  }

  const enc = character.pendingEncounter as any;

  return (
    <Pressable onPress={resetIdle} style={{ flex: 1 }}>
    <StatusBar hidden />
    <Animated.View entering={FadeIn.duration(400)} className="flex-1 bg-void">

      {/* 🏛️ REGION HEADER */}
      {!screensaverActive && (
      <View 
        style={{ paddingTop: Math.max(insets.top, 12) }}
        className="px-6 pb-2 flex-row justify-between items-end"
      >
         <View>
            <View className="flex-row items-center mb-1">
               <View 
                 key={character.isSafe ? "safe-dot" : "danger-dot"}
                 className={`w-2 h-2 rounded-full mr-2 ${character.isSafe ? "bg-verdant" : "bg-crimson/40"}`} 
               />
               <Text className={`text-[8px] font-pixel-bold uppercase tracking-[3px] ${character.isSafe ? "text-verdant-400" : "text-crimson-400"}`}>
                 {character.isSafe ? "Safe Haven" : "Cursed Wilds"}
               </Text>
            </View>
            <Text className="text-white text-xl font-pixel-bold tracking-tighter">{character.locationName.toUpperCase()}</Text>
            <Text className="text-white/40 text-[8px] font-pixel-bold uppercase tracking-[2px] mt-0.5">{character.currentDepth} Kilometers Deep</Text>
         </View>
      </View>
      )}

      {/* 📊 QUICK STATS BAR */}
      {!screensaverActive && (
      <View className="px-6 pb-2 gap-2">
         <View className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
            <View className="flex-row justify-between items-center mb-1.5">
               <Text className="text-white/60 text-[8px] font-pixel-bold uppercase tracking-wider">Health</Text>
               <Text className="text-white text-[8px] font-pixel-bold">{Math.floor(character.hp)} / {character.maxHp}</Text>
            </View>
            <View className="h-2 bg-white/10 rounded-full overflow-hidden">
               <View className="h-full bg-verdant rounded-full" style={{ width: `${(character.hp / character.maxHp) * 100}%` }} />
            </View>
         </View>
         <View className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
            <View className="flex-row justify-between items-center mb-1.5">
               <Text className="text-white/60 text-[8px] font-pixel-bold uppercase tracking-wider">Energy</Text>
               <Text className="text-white text-[8px] font-pixel-bold">{Math.floor(character.energy)} / {character.maxEnergy}</Text>
            </View>
            <View className="h-2 bg-white/10 rounded-full overflow-hidden">
               <View className="h-full bg-amber-500 rounded-full" style={{ width: `${(character.energy / character.maxEnergy) * 100}%` }} />
            </View>
         </View>
         <View className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
            <View className="flex-row justify-between items-center mb-1.5">
               <Text className="text-white/60 text-[8px] font-pixel-bold uppercase tracking-wider">Exp</Text>
               <Text className="text-white text-[8px] font-pixel-bold">{character.exp}</Text>
            </View>
            <View className="h-2 bg-white/10 rounded-full overflow-hidden">
               <View className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (character.exp / (character.level * 100)) * 100)}%` }} />
            </View>
         </View>
      </View>
      )}

      {/* 🎭 ADVENTURE STAGE */}
      <View className="flex-1 items-center justify-center">
        {character.actionStatus === "IN_DUNGEON" && character.dungeonState ? (() => {
          const currentFloor = character.dungeonState.currentFloor;
          const floorType = currentFloor.type;
          
          let floorEmoji = "🧌";
          let actionLabel = "Challenge Fate";
          let isShrine = floorType === "SHRINE";
          
          if (floorType === "BOSS") {
            floorEmoji = "👺";
            actionLabel = "Slay Boss";
          } else if (floorType === "SHRINE") {
            floorEmoji = "🏺";
            actionLabel = "Pray at Shrine";
          } else if (floorType === "TRAP") {
            floorEmoji = "🕸️";
            actionLabel = "Disarm Trap";
          } else if (floorType === "TREASURE") {
            floorEmoji = "🎁";
            actionLabel = "Open Chest";
          }

          return (
            <Animated.View entering={FadeInDown.duration(300)} className="items-center w-full px-8">
              <View className="px-4 py-1.5 bg-white/[0.05] rounded-full border border-white/10 mb-4">
                 <Text className="text-white/60 text-[8px] font-pixel-bold uppercase tracking-[4px]">Floor {character.dungeonState.floorIndex + 1}</Text>
              </View>
              <View className="items-center mb-6 relative">
                 <Text className={`${SCREEN_HEIGHT < 750 ? "text-6xl" : "text-8xl"} mb-3 shadow-2xl`}>{floorEmoji}</Text>
                 <Text className="text-white text-lg font-pixel-bold uppercase tracking-wider text-center">{currentFloor.name || (floorType === "TREASURE" ? "Hidden Treasure" : floorType)}</Text>
              </View>
              <TouchableOpacity 
                disabled={isResolving}
                onPress={async () => {
                  setIsResolving(true);
                  try {
                    const r = await gameApi.dungeonFight();
                    if (r.type === "COMBAT") {
                      setSimBattle({ ...r, startPlayerHp: character.dungeonState!.hp, startMaxPlayerHp: character.dungeonState!.maxHp, startEnemyHp: character.dungeonState!.currentFloor.maxHp, startMaxEnemyHp: character.dungeonState!.currentFloor.maxHp });
                      router.push("/encounter");
                    } else {
                      if (r.type === "TREASURE") {
                          setRewardData({
                            isWin: true,
                            lootedItems: r.lootedItems || [],
                            experienceGained: 0,
                            goldGained: 0
                          });
                      }

                      if (r.message) {
                        Toast.show({
                          type: isShrine ? "success" : floorType === "TRAP" ? "error" : "info",
                          text1: isShrine ? "🏺 Blessing Received" : 
                                 floorType === "TRAP" ? "🕸️ Trap Triggered!" : 
                                 "🎁 Loot Found",
                          text2: r.message,
                          autoHide: true,
                          visibilityTime: 3000
                        });
                      }
                      fetchStatus();
                    }
                  } catch (e: any) {
                    const msg = e.response?.data?.error || "Combat Initiation Failed";
                    Toast.show({ 
                      type: "error", 
                      text1: "Dungeon Error", 
                      text2: msg,
                      autoHide: true,
                      visibilityTime: 3000
                    });
                  } finally { setIsResolving(false); }
                }} 
                className={`w-full py-4 bg-white rounded-2xl items-center border border-white/20 active:opacity-95`}
              >
                 {isResolving ? (
                   <ActivityIndicator color="black" size="small" />
                 ) : (
                   <Text className="text-black font-pixel-bold uppercase tracking-widest text-sm">{actionLabel}</Text>
                 )}
              </TouchableOpacity>
            </Animated.View>
          );
        })() : (
          <View className="items-center">
            {/* 🕯️ MYSTIC CIRCLE */}
            <View className="absolute top-1/2 left-1/2 -ml-28 -mt-28 w-56 h-56 border border-white/[0.04] rounded-full opacity-30 border-dashed" />
            <Animated.View style={animatedStyle} className="shadow-2xl shadow-white/5">
              <Image source={isAttacking ? ATTACK_SPRITE : character.actionStatus.includes("TRAVELING") ? RUNNING_SPRITE : IDLE_SPRITE} style={{ width: SPRITE_SIZE, height: SPRITE_SIZE }} contentFit="contain" />
            </Animated.View>
            <View className={`${SCREEN_HEIGHT < 750 ? "mt-4" : "mt-8"} items-center`}>
               <Text className="text-white text-lg font-pixel-bold uppercase tracking-widest mb-2">
                 {character.actionStatus === "TRAVELING_OUT" ? "Traveling" : character.actionStatus === "TRAVELING_IN" ? "Returning Home" : character.actionStatus === "CAMPING" ? "Resting at Camp" : "Awaiting Command"}
               </Text>
            </View>
          </View>
        )}
      </View>

      {/* 🧭 ACTION CONTROLS — pyramid layout */}
      {character.actionStatus !== "IN_DUNGEON" && !screensaverActive && (
        <View className="pb-6 px-8 items-center">
          {/* Top row: AutoPlay + Journal */}
          <View className="flex-row gap-4 mb-3">
            <Pressable 
              onPress={() => { setAutoPlay(!autoPlay); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              className={`w-14 h-14 rounded-xl items-center justify-center border active:bg-white/10 ${autoPlay ? "bg-mystic/20 border-mystic/40" : "bg-white/5 border-white/10"}`}
            >
              <View className="items-center">
                <Ionicons name="play" size={18} color={autoPlay ? "#A78BFA" : "rgba(255, 255, 255, 0.4)"} />
                <Text className={`text-[7px] font-pixel-bold mt-1 uppercase tracking-wider ${autoPlay ? "text-mystic-400" : "text-white/20"}`}>Auto</Text>
              </View>
            </Pressable>
            <Pressable 
              onPress={() => setJournalVisible(true)} 
              className="w-14 h-14 rounded-xl items-center justify-center bg-white/5 border border-white/10 active:bg-white/10"
            >
              <View className="items-center">
                <Ionicons name="book" size={18} color="rgba(255, 255, 255, 0.5)" />
                <Text className="text-white/20 text-[7px] font-pixel-bold mt-1 uppercase tracking-wider">Log</Text>
              </View>
            </Pressable>
          </View>

          {/* Bottom row: Return / Camp / Travel */}
          <View className="flex-row justify-center items-center gap-5">
            {[
              { id: "IN", icon: "home", label: "Return", active: character.actionStatus === "TRAVELING_IN" },
              { id: "CAMP", icon: "bonfire", label: "Camp", active: character.actionStatus === "CAMPING" },
              { id: "OUT", icon: "compass", label: "Travel", active: character.actionStatus === "TRAVELING_OUT" }
            ].map((btn) => (
              <Pressable key={btn.id} onPress={() => handleSetDirection(btn.id as any)} className={`w-16 h-16 rounded-xl items-center justify-center border active:bg-white/10 ${btn.active ? "bg-mystic/20 border-mystic/40" : "bg-white/5 border-white/10"}`}>
                <View className="items-center">
                  <Ionicons name={btn.icon as any} size={20} color={btn.active ? "#A78BFA" : "rgba(255,255,255,0.4)"} />
                  <Text className={`text-[7px] font-pixel-bold mt-0.5 uppercase tracking-wider ${btn.active ? "text-mystic-400" : "text-white/20"}`}>{btn.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ⚔️ MYSTIC ENCOUNTER MODAL */}
      <BaseModal visible={!!enc && isFocused} showClose={false} position="bottom" onClose={() => {}}>
        <View className="items-center pb-4 pt-4">
           <View className={`w-20 h-20 bg-white/[0.04] rounded-full items-center justify-center border border-white/10 mb-3`}>
              <Text className="text-4xl">
                {enc?.type === "GATHERING" ? "💎" : 
                 enc?.type === "DUNGEON" ? "🏰" : 
                 enc?.type?.startsWith("PVP") ? "⚔️" : "👹"}
              </Text>
           </View>
           
           <Text className="text-white text-lg font-pixel-bold uppercase mb-2 tracking-tighter">
             {enc?.type === "PVP_INCOMING" ? "INCOMING ATTACK!" : enc?.name}
           </Text>
           
           <Text className="text-white/40 text-[8px] text-center px-6 mb-4 leading-relaxed font-pixel-bold uppercase tracking-wider">
              {enc?.type === "DUNGEON" ? "A labyrinth of peril and riches awaits your descent." : 
               enc?.type === "PVP_INCOMING" ? `${enc?.name} has ambushed you! Defend yourself!` :
               enc?.type === "PVP_WAITING" ? "Waiting for your opponent to respond..." :
               enc?.type === "PVP" ? "You've spotted another player. Will you strike?" :
               "A fateful discovery awaits. Will you embrace the challenge?"}
            </Text>

            <View className="w-full space-y-3">
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => resolveEncounter(enc?.type === "GATHERING" ? "gather" : enc?.type === "DUNGEON" ? "enter_dungeon" : "attack")} 
                disabled={isResolving}
                className={`w-full py-4 bg-white rounded-2xl items-center border border-white/25 ${isResolving ? "opacity-50" : ""}`}
              >
                 <Text className="text-black font-pixel-bold uppercase tracking-widest text-sm">
                   {enc?.type === "GATHERING" ? "Harvest Soul" : 
                    enc?.type === "DUNGEON" ? "Enter Dungeon" : 
                    enc?.type === "PVP" ? "Strike First" :
                    enc?.type === "PVP_INCOMING" ? "Defend" :
                    enc?.type === "PVP_WAITING" ? "Force Fight" : "Slay Foe"}
                 </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => resolveEncounter("skip")} 
                className={`w-full py-3 items-center ${isResolving ? "opacity-50" : ""}`}
                disabled={isResolving || enc?.type === "PVP_WAITING"}
              >
                 <Text className={`text-[8px] font-pixel-bold uppercase tracking-[3px] ${(isResolving || enc?.type === "PVP_WAITING") ? "text-white/10" : "text-white/40"}`}>
                   {enc?.type?.startsWith("PVP") ? "Attempt Escape" : "Retreat"} {enc?.type !== "PVP_WAITING" ? `(${countdown}s)` : ""}
                 </Text>
              </TouchableOpacity>
           </View>
        </View>
      </BaseModal>

      {/* 📜 ANCIENT JOURNAL */}
      <BaseModal visible={journalVisible} onClose={() => setJournalVisible(false)} title="Chronicle of Valor">
        <FlatList data={battleLogs} keyExtractor={(_, idx) => idx.toString()} renderItem={({ item }) => (
            <View className="mb-4 p-3 bg-white/[0.04] border border-white/10 rounded-xl">
              <View className="flex-row justify-between mb-2 items-center">
                <View className={`px-2 py-0.5 rounded border ${item.isWin ? "bg-white/10 border-white/20" : "bg-white/[0.02] border-white/5"}`}>
                   <Text className={`text-[7px] font-pixel-bold uppercase ${item.isWin ? "text-white" : "text-white/40"}`}>{item.isWin ? "Victory" : "Defeat"}</Text>
                </View>
                <Text className="text-white/30 text-[7px] font-pixel-bold">{new Date(item.createdAt).toLocaleTimeString()}</Text>
              </View>
              <Text className="text-white/60 text-xs font-sans leading-relaxed italic" numberOfLines={2}>&quot;{item.logDetails[0]?.message}&quot;</Text>
            </View>
          )} />
      </BaseModal>

      <EncounterRewardModal
        visible={!!rewardData}
        onClose={() => setRewardData(null)}
        isWin={rewardData?.isWin || false}
        lootedItems={rewardData?.lootedItems || []}
        experienceGained={rewardData?.experienceGained || 0}
        goldGained={rewardData?.goldGained || 0}
      />

      {/* 🖥️ SCREENSAVER OVERLAY */}
      {screensaverActive && (
        <View className="absolute inset-0 items-center justify-center bg-black z-50">
          <Animated.View style={animatedStyle}>
            <Image source={isAttacking ? ATTACK_SPRITE : character?.actionStatus?.includes("TRAVELING") ? RUNNING_SPRITE : IDLE_SPRITE} style={{ width: SPRITE_SIZE, height: SPRITE_SIZE }} contentFit="contain" />
          </Animated.View>
          <Text className="text-white/5 text-[7px] font-pixel-bold uppercase tracking-[6px] mt-10">Tap to return</Text>
        </View>
      )}
    </Animated.View>
    </Pressable>
  );
}
