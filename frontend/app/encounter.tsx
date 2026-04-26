import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useEncounterStore } from "../store/useEncounterStore";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay, FadeIn } from "react-native-reanimated";

// UI Components
import ProgressBar from "../components/ui/ProgressBar";
import { GAME_CONFIG } from "../constants/GameConfig";
import EncounterRewardModal from "../components/EncounterRewardModal";

const IDLE_SPRITE = require("../assets/sprites/beta_character_idle_side.gif");
const ATTACK_SPRITE = require("../assets/sprites/beta_character_attack.gif");

export default function EncounterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const simBattle = useEncounterStore((s) => s.simBattle);
  const setSimBattle = useEncounterStore((s) => s.setSimBattle);

  const [simTurn, setSimTurn] = useState(0);
  const [simStarted, setSimStarted] = useState(false);
  const [isPlayerAttacking, setIsPlayerAttacking] = useState(false);
  const [isEnemyAttacking, setIsEnemyAttacking] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  
  const playerPosX = useSharedValue(0);
  const playerRotation = useSharedValue(0);
  const enemyPosX = useSharedValue(0);
  const playerShake = useSharedValue(0);
  const enemyShake = useSharedValue(0);
  const damageOpacity = useSharedValue(0);
  const lastDamage = useSharedValue(0);
  const damagePosX = useSharedValue(0);
  const isCritValue = useSharedValue(0);
  const screenShake = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const [dmgText, setDmgText] = useState("");

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/adventure");
  }, [router]);

  useEffect(() => { if (!simBattle) safeBack(); }, [simBattle, safeBack]);
  useEffect(() => {
    if (!simBattle) { setSimStarted(false); return; }
    setSimStarted(false);
    const delay = setTimeout(() => setSimStarted(true), 1200);
    return () => clearTimeout(delay);
  }, [simBattle]);

  const triggerAnimation = useCallback((attacker: string, damage: number, isCrit?: boolean) => {
    const isPlayer = attacker === "Player";
    const targetShake = isPlayer ? enemyShake : playerShake;
    const attackerPos = isPlayer ? playerPosX : enemyPosX;
    lastDamage.value = damage;
    setDmgText(damage > 0 ? `-${damage}` : "MISS");
    damagePosX.value = isPlayer ? 60 : -60;
    isCritValue.value = isCrit ? 1 : 0;
    if (isPlayer) setIsPlayerAttacking(true); else setIsEnemyAttacking(true);

    if (isCrit) {
       flashOpacity.value = withSequence(withTiming(0.4, { duration: 50 }), withTiming(0, { duration: 200 }));
       screenShake.value = withSequence(withTiming(15, { duration: 50 }), withTiming(-15, { duration: 50 }), withTiming(0, { duration: 50 }));
    }

    const direction = isPlayer ? 1 : -1;
    attackerPos.value = withSequence(withTiming(80 * direction, { duration: 200 }), withTiming(0, { duration: 200 }));

    setTimeout(() => {
      Haptics.impactAsync(isCrit ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
      targetShake.value = withSequence(withTiming(isCrit ? 20 : 10, { duration: 50 }), withTiming(0, { duration: 50 }));
      if (damage > 0) damageOpacity.value = withSequence(withTiming(1, { duration: 100 }), withDelay(isCrit ? 800 : 400, withTiming(0, { duration: 300 })));
      setTimeout(() => { setIsPlayerAttacking(false); setIsEnemyAttacking(false); }, 300);
    }, 180);
  }, [playerPosX, enemyPosX, playerShake, enemyShake, lastDamage, damageOpacity, damagePosX, isCritValue, screenShake, flashOpacity]);

  useEffect(() => {
    if (!simBattle || !simStarted) return;
    const currentTurnData = simBattle.log.logDetails[simTurn];
    if (currentTurnData) triggerAnimation(currentTurnData.attacker, currentTurnData.damage, currentTurnData.isCrit);
    if (simTurn < simBattle.log.logDetails.length - 1) {
      const turnDelay = simBattle.log.logDetails[simTurn]?.isCrit ? GAME_CONFIG.BATTLE_TURN_DELAY + 400 : GAME_CONFIG.BATTLE_TURN_DELAY;
      const t = setTimeout(() => setSimTurn((v) => v + 1), turnDelay);
      return () => clearTimeout(t);
    }
    if (simTurn === simBattle.log.logDetails.length - 1) {
      const t = setTimeout(() => {
        setShowRewards(true);
      }, GAME_CONFIG.BATTLE_END_DELAY + 500);
      return () => clearTimeout(t);
    }
  }, [simBattle, simTurn, simStarted, triggerAnimation, setSimBattle]);

  const handleEncounterEnd = useCallback(() => {
    setShowRewards(false);
    setSimBattle(null);
    setSimTurn(0);
    setSimStarted(false);
  }, [setSimBattle]);

  const combatSim = useMemo(() => {
    if (!simBattle || !simStarted) return null;
    let p = simBattle.startPlayerHp || 0, e = simBattle.startEnemyHp || 0;
    for (let i = 0; i <= simTurn; i++) {
      const turn = simBattle.log.logDetails[i];
      if (!turn) break;
      if (turn.attacker === "Player") e = Math.max(0, e - turn.damage); else p = Math.max(0, p - turn.damage);
    }
    return { playerHp: p, enemyHp: e };
  }, [simBattle, simTurn, simStarted]);

  const playerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: playerPosX.value + playerShake.value }, { rotate: `${playerRotation.value}deg` }] }));
  const enemyStyle = useAnimatedStyle(() => ({ transform: [{ translateX: enemyPosX.value + enemyShake.value }] }));
  
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: screenShake.value }],
  }));

  const damageTextStyle = useAnimatedStyle(() => ({
    opacity: damageOpacity.value,
    transform: [
      { translateY: -60 - (damageOpacity.value * 60) }, 
      { translateX: damagePosX.value }, 
      { scale: isCritValue.value ? 1.8 : 1.2 }
    ]
  }));

  const damageTextInnerStyle = useAnimatedStyle(() => ({
    fontSize: isCritValue.value ? 48 : 32,
    color: isCritValue.value ? "#fbbf24" : "#f43f5e",
  }));

  const enemyDisplay = useMemo(() => {
    if (!simBattle?.isGathering) return "👹";
    const name = simBattle.enemyName || "";
    if (name.includes("Tree")) return "🌳";
    if (name.includes("Ore")) return "⛏️";
    return "📦";
  }, [simBattle]);

  return (
    <View className="flex-1 bg-[#020617]">
      <Animated.View style={[StyleSheet.absoluteFill, flashStyle, { backgroundColor: "white", zIndex: 99 }]} pointerEvents="none" />
      
      {simBattle && (
        <EncounterRewardModal
          visible={showRewards}
          onClose={handleEncounterEnd}
          isWin={!!simBattle.isWin}
          lootedItems={simBattle.lootedItems}
          experienceGained={simBattle.experienceGained}
          goldGained={simBattle.goldGained}
          message={simBattle.message}
        />
      )}

      {!simBattle || !simStarted ? (
        <View className="flex-1 justify-center items-center px-12">
           <ActivityIndicator size="small" color="#818cf8" />
           <Text className="text-slate-600 text-[10px] font-pixel-bold uppercase tracking-[4px] mt-8">Initializing Encounter</Text>
        </View>
      ) : (
        <Animated.View style={[{ flex: 1 }, screenStyle]}>
          {/* ⚔️ MINIMALIST HUD */}
          <View 
            style={{ paddingTop: Math.max(insets.top, 16) }}
            className="px-8 flex-row justify-between"
          >
             <View className="flex-1 pr-6 border-r border-white/5">
                <Text className="text-white text-base font-pixel-bold mb-2">{Math.floor(combatSim?.playerHp ?? 0)} HP</Text>
                <ProgressBar current={combatSim?.playerHp ?? 0} max={simBattle.startMaxPlayerHp || 1} color="rose" size="xs" hideLabel />
             </View>
             <View className="flex-1 pl-6">
                <Text className="text-rose-500 text-base font-pixel-bold mb-2 text-right">{Math.floor(combatSim?.enemyHp ?? 0)} HP</Text>
                <ProgressBar current={combatSim?.enemyHp ?? 0} max={simBattle.startMaxEnemyHp || 1} color="rose" size="xs" hideLabel />
             </View>
          </View>

          {/* 🎭 STAGE */}
          <View className="flex-1 items-center justify-center">
            <View className="flex-row items-center justify-between w-full px-12">
              <Animated.View style={playerStyle}><Image source={isPlayerAttacking ? ATTACK_SPRITE : IDLE_SPRITE} style={{ width: 140, height: 140 }} contentFit="contain" /></Animated.View>
              <Animated.View style={enemyStyle}>
                {simBattle.isPvp ? <Image source={isEnemyAttacking ? ATTACK_SPRITE : IDLE_SPRITE} style={{ width: 140, height: 140, transform: [{ scaleX: -1 }] }} contentFit="contain" /> : <Text className="text-4xl">{enemyDisplay}</Text>}
              </Animated.View>
            </View>

            <Animated.View style={damageTextStyle} className="absolute pointer-events-none items-center justify-center">
              <Animated.Text style={[
                damageTextInnerStyle,
                { 
                  fontWeight: '900',
                  textShadowColor: 'rgba(0, 0, 0, 0.75)',
                  textShadowOffset: {width: -1, height: 1},
                  textShadowRadius: 10
                }
              ]}>
                {dmgText}
              </Animated.Text>
            </Animated.View>
          </View>

          {/* 📜 MINIMALIST LOG */}
          <View className="pb-16 px-12">
             <Animated.View key={simTurn} entering={FadeIn.duration(200)}>
                <Text className={`text-center font-pixel-bold uppercase tracking-tight ${simBattle.log.logDetails[simTurn]?.isCrit ? "text-amber-400 text-xl" : "text-white text-xs"}`}>
                  {simBattle.log.logDetails[simTurn]?.message}
                </Text>
             </Animated.View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
