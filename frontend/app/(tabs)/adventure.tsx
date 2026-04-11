import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Toast from "react-native-toast-message";
import { BattleLogPayload, CharacterStatus, gameApi } from "../../api/game";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../store/useAuthStore";
import { useEncounterStore } from "../../store/useEncounterStore";
import { useGameStore } from "../../store/useGameStore";

// UI Components
import BaseModal from "../../components/ui/BaseModal";
import ProgressBar from "../../components/ui/ProgressBar";
import StandardButton from "../../components/ui/StandardButton";

// Constants
import { GAME_CONFIG } from "../../constants/GameConfig";
import { UI_STRINGS } from "../../constants/Strings";

export default function AdventureScreen() {
  const isMetadataLoaded = useGameStore((state) => state.isMetadataLoaded);
  const [character, setCharacter] = useState<CharacterStatus | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogPayload[]>([]);
  const [nearbyCount, setNearbyCount] = useState(0);
  const { socket } = useSocket();
  const [journalVisible, setJournalVisible] = useState(false);
  const setSimBattle = useEncounterStore((s) => s.setSimBattle);
  const [isResolving, setIsResolving] = useState(false);
  const [countdown, setCountdown] = useState(
    GAME_CONFIG.DECISION_COUNTDOWN_SECONDS,
  );
  const timerActiveRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isResolvingRef = useRef(false);
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
        if (pathname !== "/encounter") router.push("/encounter");
      });
      socket.on("pvp_fled", (data: any) => {
        Toast.show({
          type: "info",
          text1: "⚡ Escaped!",
          text2: data.message || "Target fled!",
        });
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
      const interval = setInterval(
        fetchStatus,
        GAME_CONFIG.STATUS_REFRESH_INTERVAL,
      );
      return () => clearInterval(interval);
    }, [fetchStatus]),
  );

  // 🎭 Character Animation Logic
  useEffect(() => {
    const isMoving =
      character?.actionStatus === "TRAVELING_OUT" ||
      character?.actionStatus === "TRAVELING_IN";
    translateY.value = 0;

    if (isMoving) {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-20, { duration: 250 }),
          withTiming(0, { duration: 250 }),
        ),
        -1,
      );
    } else {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 2000 }),
          withTiming(0, { duration: 2000 }),
        ),
        -1,
      );
    }
  }, [character?.actionStatus, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ translateY: translateY.value }],
    };
  }, [translateY]);

  // ── Encounter resolve — handles all types inline ─────────────────────────
  const resolveEncounter = useCallback(
    async (action: "attack" | "skip" | "gather" | "enter_dungeon") => {
      if (isResolving) return;

      try {
        setIsResolving(true);
        isResolvingRef.current = true;
        const prevEncounter = character?.pendingEncounter as any;
        const prevChar = character;

        const result = await gameApi.resolveEncounter(action);

        if (
          prevChar &&
          result.updatedChar &&
          result.updatedChar.level > prevChar.level
        ) {
          Toast.show({
            type: "success",
            text1: UI_STRINGS.LEVEL_UP,
            text2: UI_STRINGS.LEVEL_REACHED(result.updatedChar.level),
            visibilityTime: 3000,
          });
        }

        // PVP Step 1: P2 attacked → show PVP_WAITING
        if (action === "attack" && prevEncounter?.type === "PVP") {
          fetchStatus();
          return;
        }

        // PVP Step 2 / PVE / Gathering → battle animation
        if ((action === "attack" || action === "gather") && result.log) {
          setSimBattle({
            ...result,
            isGathering: action === "gather",
            startPlayerHp:
              action === "attack" &&
              (prevEncounter?.type === "PVP_INCOMING" ||
                prevEncounter?.type === "PVP_WAITING")
                ? result.startPlayerHp
                : prevChar?.hp || 100,
            startMaxPlayerHp:
              action === "attack" &&
              (prevEncounter?.type === "PVP_INCOMING" ||
                prevEncounter?.type === "PVP_WAITING")
                ? result.startMaxPlayerHp
                : prevChar?.maxHp || 100,
            startEnemyHp:
              action === "gather"
                ? result.startIntegrity || 20
                : result.startEnemyHp || prevEncounter?.hp || 50,
            startMaxEnemyHp:
              action === "gather"
                ? result.startIntegrity || 20
                : result.startMaxEnemyHp || prevEncounter?.maxHp || 50,
            playerName: result.playerName,
            enemyName: result.enemyName,
            isPvp:
              prevEncounter?.type === "PVP_INCOMING" ||
              prevEncounter?.type === "PVP_WAITING",
            isWin: result.isWin,
            goldStolen: result.goldStolen,
          });
          router.push("/encounter");
          return;
        }

        fetchStatus();
      } catch (error) {
        console.error("Encounter resolution failed:", error);
        Alert.alert("Error", UI_STRINGS.ERROR_RESOLVE_FAILED);
        // Resurrect timer if it failed? No, fetchStatus will handle it.
        fetchStatus();
      } finally {
        setIsResolving(false);
        isResolvingRef.current = false;
      }
    },
    [character, isResolving, fetchStatus, router, setSimBattle],
  );

  // ── Encounter AFK Timer — stable key prevents restarts ───────────────────
  const enc = character?.pendingEncounter as any;
  const encounterKey = enc
    ? `${enc.type}::${enc.name ?? ""}::${enc.targetId ?? ""}`
    : null;

  // ── Encounter AFK Timer ───────────────────────────────────────────
  useEffect(() => {
    if (!encounterKey) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerActiveRef.current = null;
      setCountdown(GAME_CONFIG.DECISION_COUNTDOWN_SECONDS);
      return;
    }

    // Only restart countdown if the encounter actually changed
    if (timerActiveRef.current !== encounterKey) {
      timerActiveRef.current = encounterKey;
      setCountdown(GAME_CONFIG.DECISION_COUNTDOWN_SECONDS);
    }

    // Always ensure one interval is running while we have an encounter
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      // 🛡️ Pause countdown while resolving, but keep timer registered
      if (isResolvingRef.current) return;

      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);

          // Use the type from the encounter key we started with
          const type = encounterKey.split("::")[0] as any;
          resolveEncounter(type === "PVP_WAITING" ? "attack" : "skip");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [encounterKey, resolveEncounter]); // Note: isResolving is handled via ref to avoid thrashing

  const [isProcessingDirection, setIsProcessingDirection] = useState(false);

  const handleSetDirection = async (dir: "OUT" | "IN" | "CAMP") => {
    if (!character || isProcessingDirection || character.actionStatus === dir)
      return;
    setIsProcessingDirection(true);
    try {
      await gameApi.travel(dir);
      Toast.show({
        type: "success",
        text1:
          dir === "OUT"
            ? "Venturing Out"
            : dir === "IN"
              ? "Heading Home"
              : "Setting Camp",
        text2:
          dir === "OUT"
            ? "Stepping into the unknown... treasures and terrors await."
            : dir === "IN"
              ? "Turning back toward the safety of Valoria's walls."
              : "Resting but keep your eyes open... the wilds are never truly silent.",
        visibilityTime: 2500,
      });
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
        <Text className="text-slate-500 font-bold mt-4 uppercase tracking-widest text-xs">
          Synchronizing world data...
        </Text>
      </View>
    );
  }

  const inDungeon = character.actionStatus === "IN_DUNGEON";
  const dungeon = character.dungeonState;
  const isSafe = character.isSafe;

  const getModalTitle = () => {
    if (enc?.type === "GATHERING") return UI_STRINGS.ENCOUNTER_TYPES.GATHERING;
    if (enc?.type === "DUNGEON") return UI_STRINGS.ENCOUNTER_TYPES.DUNGEON;
    if (
      enc?.type === "PVP" ||
      enc?.type === "PVP_INCOMING" ||
      enc?.type === "PVP_WAITING"
    )
      return UI_STRINGS.ENCOUNTER_TYPES.PVP;
    return UI_STRINGS.ENCOUNTER_TYPES.HOSTILE;
  };

  return (
    <View className="flex-1 bg-slate-950 px-6 pt-16">
      {/* 🚀 HUD Status Plate (Top) */}
      <View className="flex-row justify-between items-start mb-6 w-full">
        <View className="flex-1">
          <Text
            className={`font-bold uppercase text-[8px] tracking-[1px] mb-0.5 ${isSafe ? "text-emerald-400" : "text-rose-500"}`}
          >
            {isSafe ? "SAFE ZONE" : "DANGER ZONE"}
          </Text>
          <Text className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">
            {character?.currentDepth === 0
              ? UI_STRINGS.VALORIA_CITY
              : `${character?.currentDepth}${UI_STRINGS.LOCATION_PREFIX}`}
          </Text>

          <View className="flex-row items-center space-x-4 w-44">
            <View className="flex-1">
              <ProgressBar
                current={character.hp}
                max={character.maxHp}
                color="rose"
                showValues={false}
                size="sm"
              />
            </View>
            <View className="flex-1">
              <ProgressBar
                current={character.exp}
                max={character.level * 100}
                color="indigo"
                showValues={false}
                size="sm"
              />
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <TouchableOpacity
            disabled={
              character.currentDepth === 0 ||
              isProcessingDirection ||
              character.actionStatus === "TRAVELING_IN"
            }
            onPress={() => handleSetDirection("IN")}
            className={`w-12 h-12 rounded-2xl border items-center justify-center ${character.actionStatus === "TRAVELING_IN" ? "bg-emerald-600 border-emerald-400" : "bg-slate-900 border-slate-800"} ${character.currentDepth === 0 ? "opacity-20" : ""}`}
          >
            <Ionicons
              name="home"
              size={20}
              color={
                character.actionStatus === "TRAVELING_IN" ? "white" : "#64748B"
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setJournalVisible(true)}
            className="bg-slate-900 w-12 h-12 rounded-2xl border border-slate-800 items-center justify-center"
          >
            <Ionicons name="journal-outline" size={20} color="#818CF8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🧭 MODIFIER & DIFFICULTY BADGES */}
      {!inDungeon && (
        <View className="flex-row items-center space-x-3 mb-6">
          <View className="flex-row bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg items-center">
            <Text className="text-amber-500 text-[9px] mr-1">💎</Text>
            <Text className="text-amber-200 text-[8px] font-bold uppercase font-sans">
              +{character.lootBonus}%
            </Text>
          </View>
          <View className="flex-row bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-lg items-center">
            <Text className="text-cyan-500 text-[9px] mr-1">📈</Text>
            <Text className="text-cyan-200 text-[8px] font-bold uppercase font-sans">
              +{character.expBonus}%
            </Text>
          </View>
          <View className="flex-row bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2" />
            <Text className="text-rose-400 font-bold text-[8px] uppercase font-sans">
              {character.dangerLevel}
            </Text>
          </View>
          {nearbyCount > 0 && (
            <View className="flex-row items-center ml-auto bg-slate-900 px-2 py-1 rounded-lg">
              <Ionicons name="people" size={10} color="#FFFFFF" />
              <Text className="text-white font-bold text-[8px] ml-1 uppercase font-sans">
                {nearbyCount}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 🎭 CHARACTER STAGE (Center) */}
      <View className="flex-1 justify-center items-center">
        {inDungeon && dungeon ? (
          <View className="items-center w-full">
            <Text className="text-fuchsia-400 font-bold uppercase text-[8px] tracking-[5px] mb-2 font-sans">
              Floor {dungeon.floorIndex + 1} / {dungeon.totalFloors}
            </Text>
            <Text className="text-2xl font-bold text-white italic uppercase mb-8 text-center font-sans">
              {dungeon.name}
            </Text>

            <View className="bg-slate-900 border border-fuchsia-500/30 p-8 rounded-[40px] w-full items-center shadow-lg shadow-fuchsia-500/20 mb-8">
              <Text className="text-6xl mb-4">
                {dungeon.currentFloor.type === "BOSS"
                  ? "👹"
                  : dungeon.currentFloor.type === "TREASURE"
                    ? "🎁"
                    : "🧌"}
              </Text>
              <Text className="text-white font-bold text-lg font-sans">
                {dungeon.currentFloor.name || "Treasure Room"}
              </Text>
              {dungeon.currentFloor.type !== "TREASURE" && (
                <Text className="text-slate-500 mt-2 font-bold text-xs font-sans">
                  HP: {dungeon.currentFloor.hp} / {dungeon.currentFloor.maxHp}
                </Text>
              )}
            </View>

            <StandardButton
              label={
                dungeon.currentFloor.type === "TREASURE"
                  ? "Open Chest"
                  : "Fight"
              }
              variant="primary"
              className="w-full bg-fuchsia-600 border-fuchsia-500"
              loading={isResolving}
              onPress={async () => {
                if (isResolving) return;
                setIsResolving(true);
                try {
                  const result = await gameApi.dungeonFight();
                  if (result.type === "COMBAT") {
                    setSimBattle({
                      ...result,
                      startPlayerHp: dungeon.hp,
                      startMaxPlayerHp: dungeon.maxHp,
                      startEnemyHp: dungeon.currentFloor.maxHp,
                      startMaxEnemyHp: dungeon.currentFloor.maxHp,
                    });
                    router.push("/encounter");
                  } else if (result.type === "TREASURE") {
                    Toast.show({
                      type: "success",
                      text1: "Loot Found!",
                      text2: result.message,
                    });
                    fetchStatus();
                  }
                } catch (e: any) {
                  Alert.alert(
                    "Dungeon Error",
                    e.response?.data?.error || "Unknown error",
                  );
                } finally {
                  setIsResolving(false);
                }
              }}
            />
          </View>
        ) : (
          <>
            <Animated.View style={animatedStyle} className="items-center">
              <View className="bg-slate-900/50 p-10 rounded-full border border-white/10 shadow-3xl">
                <Text className="text-6xl">
                  {character.actionStatus === "TRAVELING_OUT"
                    ? "🏃‍♂️"
                    : character.actionStatus === "TRAVELING_IN"
                      ? "🏃‍♂️"
                      : character.currentDepth === 0
                        ? "🧘"
                        : "⛺"}
                </Text>
              </View>
              <View
                className="w-20 h-3 bg-black/20 rounded-full mt-4 blur-xl"
                style={{ transform: [{ scale: 1.2 }] }}
              />
            </Animated.View>

            <Text className="text-slate-700 font-bold uppercase text-[8px] tracking-[8px] mt-10 text-center font-sans">
              {character.isPaused
                ? "PAUSED"
                : character.actionStatus === "TRAVELING_OUT"
                  ? "VENTURING OUT"
                  : character.actionStatus === "TRAVELING_IN"
                    ? "RETURNING HOME"
                    : character.actionStatus === "CAMPING"
                      ? "CAMPED / FARMING"
                      : "IDLE"}
            </Text>
          </>
        )}
      </View>

      {/* 🧭 ICON-BASED MOVEMENT CLUSTER (Bottom) */}
      {!inDungeon && (
        <View className="pb-10 space-y-6">
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* CAMP */}
            <TouchableOpacity
              disabled={
                isProcessingDirection || character.actionStatus === "CAMPING"
              }
              onPress={() => handleSetDirection("CAMP")}
              className={`w-16 h-16 rounded-full border items-center justify-center ${character.actionStatus === "CAMPING" ? "bg-amber-600 border-amber-400" : "bg-slate-900 border-slate-800"}`}
            >
              <Ionicons
                name="bonfire"
                size={24}
                color={
                  character.actionStatus === "CAMPING" ? "white" : "#FBBF24"
                }
              />
              <Text
                className={`text-[8px] font-bold uppercase mt-1 font-sans ${character.actionStatus === "CAMPING" ? "text-white" : "text-slate-600"}`}
              >
                Camp
              </Text>
            </TouchableOpacity>

            {/* VENTURE OUT */}
            <TouchableOpacity
              disabled={
                isProcessingDirection ||
                character.actionStatus === "TRAVELING_OUT"
              }
              onPress={() => handleSetDirection("OUT")}
              className={`w-16 h-16 rounded-full border items-center justify-center ${character.actionStatus === "TRAVELING_OUT" ? "bg-white border-white" : "bg-slate-900 border-slate-800"}`}
            >
              <Ionicons
                name="compass"
                size={24}
                color={
                  character.actionStatus === "TRAVELING_OUT"
                    ? "white"
                    : "#FFFFFF"
                }
              />
              <Text
                className={`text-[8px] font-black uppercase mt-1 ${character.actionStatus === "TRAVELING_OUT" ? "text-white" : "text-slate-600"}`}
              >
                Venture
              </Text>
            </TouchableOpacity>
          </View>

          {/* PAUSE CONTROL */}
          {(character.actionStatus === "TRAVELING_OUT" ||
            character.actionStatus === "TRAVELING_IN" ||
            character.actionStatus === "CAMPING") && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  await gameApi.pause(!character.isPaused);
                  fetchStatus();
                } catch {
                  Alert.alert("Error", "Failed to toggle pause");
                }
              }}
              className="flex-row items-center justify-center py-2"
            >
              <Ionicons
                name={character.isPaused ? "play-circle" : "pause-circle"}
                size={16}
                color={character.isPaused ? "#4ade80" : "#94a3b8"}
              />
              <Text
                className={`ml-2 font-black text-[9px] uppercase tracking-widest ${character.isPaused ? "text-emerald-400" : "text-slate-500"}`}
              >
                {character.isPaused ? "Resume Session" : "Pause Session"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 📜 JOURNAL MODAL */}
      <BaseModal
        visible={journalVisible}
        onClose={() => setJournalVisible(false)}
        title="Adventure Journal"
      >
        <FlatList
          data={battleLogs}
          keyExtractor={(item, idx) => idx.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View className="mb-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
              <View className="flex-row justify-between mb-1">
                <Text className="text-white font-bold text-[10px] uppercase font-sans">
                  Combat Pulse
                </Text>
                <Text className="text-slate-500 text-[9px] font-sans">
                  {new Date(item.createdAt).toLocaleTimeString()}
                </Text>
              </View>
              <Text className="text-white text-xs leading-5 font-sans">
                {item.logDetails[0]?.message || "Combat encounter resolved."}
              </Text>
              <Text
                className={`font-bold text-[10px] uppercase mt-2 font-sans ${item.isWin ? "text-emerald-400" : "text-rose-400"}`}
              >
                {item.isWin ? "Victory" : "Defeat"}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-slate-500 text-center italic py-10">
              No recent entries...
            </Text>
          }
        />
        <StandardButton
          label="Close"
          variant="secondary"
          className="mt-4"
          onPress={() => setJournalVisible(false)}
        />
      </BaseModal>

      {/* ⚔️ ENCOUNTER MODAL */}
      <BaseModal
        visible={!!enc}
        onClose={() => resolveEncounter("skip")}
        showClose={false}
        title={getModalTitle()}
      >
        <View className="items-center mb-8">
          <Text className="text-6xl mb-6">
            {enc?.type === "GATHERING"
              ? "💎"
              : enc?.type === "DUNGEON"
                ? "🚪"
                : "👹"}
          </Text>
          <Text className="text-2xl font-bold text-white italic uppercase text-center mb-2 font-sans">
            {enc?.name || UI_STRINGS.UNKNWON_DISCOVERY}
          </Text>
            <Text className="text-amber-400 font-bold text-xs uppercase animate-pulse font-sans">
              {UI_STRINGS.DECISION_WAITING}
            </Text>
        </View>

        <View className="flex-row items-center justify-center bg-slate-950 py-3 rounded-2xl border border-white/5 mb-8">
          <Ionicons
            name="time-outline"
            size={14}
            color="#94a3b8"
            style={{ marginRight: 6 }}
          />
          <Text className="text-slate-400 font-bold text-xs font-sans">
            {UI_STRINGS.DECISION_REQUIRED}: {countdown}S
          </Text>
        </View>

        <View className="space-y-3">
          {enc?.type === "GATHERING" ? (
            <StandardButton
              label="Gather Resource"
              variant="success"
              loading={isResolving}
              onPress={() => resolveEncounter("gather")}
            />
          ) : enc?.type === "DUNGEON" ? (
            <StandardButton
              label="Enter Dungeon"
              variant="primary"
              loading={isResolving}
              onPress={() => resolveEncounter("enter_dungeon")}
            />
          ) : (
            <StandardButton
              label={enc?.type === "PVP_WAITING" ? "Attack anyway" : "Fight"}
              variant="danger"
              loading={isResolving}
              onPress={() => resolveEncounter("attack")}
            />
          )}
          <StandardButton
            label="Ignore & Continue"
            variant="secondary"
            disabled={isResolving}
            onPress={() => resolveEncounter("skip")}
          />
        </View>
      </BaseModal>
    </View>
  );
}
