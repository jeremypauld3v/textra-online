import { View, Text, ActivityIndicator } from "react-native";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { useEncounterStore } from "../store/useEncounterStore";
import { SafeAreaView } from "react-native-safe-area-context";

// UI Components
import ProgressBar from "../components/ui/ProgressBar";

// Constants
import { GAME_CONFIG } from "../constants/GameConfig";
import { UI_STRINGS } from "../constants/Strings";

export default function EncounterScreen() {
  const router = useRouter();
  const simBattle = useEncounterStore((s) => s.simBattle);
  const setSimBattle = useEncounterStore((s) => s.setSimBattle);

  const [simTurn, setSimTurn] = useState(0);
  const [simStarted, setSimStarted] = useState(false);

  const safeBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/adventure");
    }
  }, [router]);

  // If no battle data, immediately go back
  useEffect(() => {
    if (!simBattle) {
      safeBack();
    }
  }, [simBattle, safeBack]);

  // Delay before animation starts
  useEffect(() => {
    if (!simBattle) {
      setSimStarted(false);
      return;
    }
    setSimStarted(false);
    const delay = setTimeout(() => setSimStarted(true), GAME_CONFIG.BATTLE_START_DELAY);
    return () => clearTimeout(delay);
  }, [simBattle, simBattle?.log]);

  // Turn-by-turn progression
  useEffect(() => {
    if (!simBattle || !simStarted) return;
    if (simTurn < simBattle.log.logDetails.length - 1) {
      const t = setTimeout(() => setSimTurn((v) => v + 1), GAME_CONFIG.BATTLE_TURN_DELAY);
      return () => clearTimeout(t);
    }
    if (simTurn === simBattle.log.logDetails.length - 1) {
      const t = setTimeout(() => {
        if (simBattle.isPvp) {
          Toast.show({
            type: simBattle.isWin ? "success" : "error",
            text1: simBattle.isWin ? UI_STRINGS.BATTLE_VICTORY : UI_STRINGS.BATTLE_DEFEAT,
            text2: simBattle.isWin ? `Looted ${simBattle.goldStolen || 0} gold!` : "Lost 10% gold and some items.",
            visibilityTime: GAME_CONFIG.BATTLE_TOAST_DURATION,
          });
        }
        setSimBattle(null);
        setSimTurn(0);
        setSimStarted(false);
      }, GAME_CONFIG.BATTLE_END_DELAY);
      return () => clearTimeout(t);
    }
  }, [simBattle, simTurn, simStarted, router, setSimBattle, safeBack]);

  // HP tracking
  const combatSim = useMemo(() => {
    if (!simBattle || !simStarted) return null;
    let p = simBattle.startPlayerHp;
    let e = simBattle.startEnemyHp;
    for (let i = 0; i <= simTurn; i++) {
      const turn = simBattle.log.logDetails[i];
      if (!turn) break;
      if (turn.attacker === "Player") e = Math.max(0, e - turn.damage);
      else p = Math.max(0, p - turn.damage);
    }
    return {
      playerHpPct: (p / simBattle.startMaxPlayerHp) * 100,
      enemyHpPct: (e / simBattle.startMaxEnemyHp) * 100,
      playerHp: p,
      enemyHp: e,
    };
  }, [simBattle, simTurn, simStarted]);

  if (!simBattle) return null;

  return (
    <SafeAreaView className="flex-1 bg-black px-6 justify-center items-center">
      {!simStarted ? (
        /* ── Pre-battle countdown ── */
        <View className="items-center">
          <Text className="text-white text-xl font-bold italic uppercase mb-1 tracking-widest font-sans">
            {simBattle.isPvp ? "⚔️ PVP BATTLE" : simBattle.isGathering ? "⚒️ GATHERING" : "⚔️ COMBAT"}
          </Text>
          <Text className="text-slate-500 font-bold text-center uppercase tracking-widest text-[8px] font-sans">
            {simBattle.playerName ?? "You"}
            {" vs "}
            {simBattle.enemyName ?? simBattle.log?.enemyName ?? "Enemy"}
          </Text>
          <ActivityIndicator size="small" color="#f43f5e" className="mt-8" />
          <Text className="text-slate-600 font-bold text-[8px] mt-4 uppercase tracking-[4px] font-sans">Initializing...</Text>
        </View>
      ) : (
        /* ── Active battle ── */
        <View className="flex-1 w-full justify-center items-center">
          {/* HP Bars */}
          <View className="flex-row justify-between items-center w-full mb-12 px-2">
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-sm mb-3 uppercase tracking-tighter font-sans" numberOfLines={1}>
                {simBattle.isGathering ? "Worker" : (simBattle.playerName ?? "You")}
              </Text>
              <ProgressBar 
                current={combatSim?.playerHp ?? 0} 
                max={simBattle.startMaxPlayerHp} 
                color="indigo" 
                showValues={false} 
                size="sm" 
              />
              <Text className="text-slate-600 font-bold text-[9px] mt-2 uppercase font-sans">
                {simBattle.isGathering ? "Efficiency" : `${Math.floor(combatSim?.playerHp ?? 0)} HP`}
              </Text>
            </View>

            <View className="mx-6 items-center">
               <Text className="text-white font-bold text-xl italic opacity-20 font-sans">{simBattle.isGathering ? "AT" : "VS"}</Text>
            </View>

            <View className="flex-1 items-center">
              <Text className="text-rose-400 font-bold text-sm mb-3 uppercase tracking-tighter font-sans" numberOfLines={1}>
                {simBattle.isGathering ? "Resource" : (simBattle.enemyName ?? simBattle.log?.enemyName)}
              </Text>
              <ProgressBar 
                current={combatSim?.enemyHp ?? 0} 
                max={simBattle.startMaxEnemyHp} 
                color="rose" 
                showValues={false} 
                size="sm" 
              />
              <Text className="text-slate-600 font-bold text-[9px] mt-2 uppercase font-sans">
                {simBattle.isGathering ? "Integrity" : `${Math.floor(combatSim?.enemyHp ?? 0)} HP`}
              </Text>
            </View>
          </View>

          {/* Log message */}
          <View className="w-full bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-2xl">
            <Text className="text-white text-base font-bold text-center leading-tight italic uppercase tracking-tighter font-sans">
              {simBattle.log.logDetails[simTurn]?.message}
            </Text>
          </View>

          {/* Turn dots */}
          <View className="flex-row mt-12 space-x-1.5 flex-wrap justify-center">
            {simBattle.log.logDetails.map((_: any, idx: number) => (
              <View 
                key={idx} 
                className={`h-1.5 rounded-full ${idx === simTurn ? "w-8 bg-white" : "w-1.5 bg-slate-800"}`} 
              />
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
