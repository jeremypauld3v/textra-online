import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useEncounterStore } from "../store/useEncounterStore";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay, FadeIn, FadeInDown } from "react-native-reanimated";

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
  const [showCritLabel, setShowCritLabel] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  const cycleSpeed = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpeed(prev => prev === 1 ? 2 : prev === 2 ? 4 : 1);
  }, []);
  
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
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const safeBack = useCallback(() => {
    if (!isMounted.current) return;
    try {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/adventure");
    } catch {
      // Navigation not ready yet — retry on next frame
      requestAnimationFrame(() => {
        try {
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)/adventure");
        } catch {}
      });
    }
  }, [router]);

  useEffect(() => { if (!simBattle) safeBack(); }, [simBattle, safeBack]);
  useEffect(() => {
    if (!simBattle) { setSimStarted(false); return; }
    setSimStarted(false);
    const delay = setTimeout(() => setSimStarted(true), 1200 / speed);
    return () => clearTimeout(delay);
  }, [simBattle, speed]);

  const triggerAnimation = useCallback((attacker: string, damage: number, isCrit?: boolean) => {
    const isPlayer = attacker === "Player";
    const targetShake = isPlayer ? enemyShake : playerShake;
    const attackerPos = isPlayer ? playerPosX : enemyPosX;
    lastDamage.value = damage;
    setDmgText(damage > 0 ? `-${damage}` : "MISS");
    damagePosX.value = isPlayer ? 50 : -50;
    isCritValue.value = isCrit ? 1 : 0;
    setShowCritLabel(!!isCrit);
    if (isPlayer) setIsPlayerAttacking(true); else setIsEnemyAttacking(true);

    if (isCrit) {
       flashOpacity.value = withSequence(withTiming(0.3, { duration: 50 / speed }), withTiming(0, { duration: 200 / speed }));
       screenShake.value = withSequence(withTiming(10, { duration: 50 / speed }), withTiming(-10, { duration: 50 / speed }), withTiming(0, { duration: 50 / speed }));
    }

    const direction = isPlayer ? 1 : -1;
    attackerPos.value = withSequence(withTiming(60 * direction, { duration: 200 / speed }), withTiming(0, { duration: 200 / speed }));

    setTimeout(() => {
      Haptics.impactAsync(isCrit ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
      targetShake.value = withSequence(withTiming(isCrit ? 15 : 8, { duration: 50 / speed }), withTiming(0, { duration: 50 / speed }));
      if (damage > 0) {
        damageOpacity.value = withSequence(
          withTiming(1, { duration: 100 / speed }), 
          withDelay((isCrit ? 800 : 400) / speed, withTiming(0, { duration: 300 / speed }))
        );
      }
      const spriteDuration = Math.max(400, 1200 / speed); // Min 400ms so sprite is always visible
      setTimeout(() => { setIsPlayerAttacking(false); setIsEnemyAttacking(false); }, spriteDuration);
    }, 180 / speed);
  }, [playerPosX, enemyPosX, playerShake, enemyShake, lastDamage, damageOpacity, damagePosX, isCritValue, screenShake, flashOpacity, speed]);

  useEffect(() => {
    if (!simBattle || !simStarted) return;
    const currentTurnData = simBattle.log.logDetails[simTurn];
    if (currentTurnData) triggerAnimation(currentTurnData.attacker, currentTurnData.damage, currentTurnData.isCrit);
    if (simTurn < simBattle.log.logDetails.length - 1) {
      const turnDelay = (simBattle.log.logDetails[simTurn]?.isCrit ? GAME_CONFIG.BATTLE_TURN_DELAY + 400 : GAME_CONFIG.BATTLE_TURN_DELAY) / speed;
      const t = setTimeout(() => setSimTurn((v) => v + 1), turnDelay);
      return () => clearTimeout(t);
    }
    if (simTurn === simBattle.log.logDetails.length - 1) {
      const t = setTimeout(() => {
        setShowRewards(true);
      }, (GAME_CONFIG.BATTLE_END_DELAY + 500) / speed);
      return () => clearTimeout(t);
    }
  }, [simBattle, simTurn, simStarted, triggerAnimation, setSimBattle, speed]);

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

  // Terminal stack logs calculations
  const visibleLogs = useMemo(() => {
    if (!simBattle || !simStarted) return [];
    const logs = [];
    for (let i = Math.max(0, simTurn - 9); i <= simTurn; i++) {
      const turn = simBattle.log.logDetails[i];
      if (turn) {
        logs.push({
          id: i,
          message: turn.message,
          isCrit: turn.isCrit,
          isLatest: i === simTurn
        });
      }
    }
    return logs;
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
      { translateY: -50 - (damageOpacity.value * 40) }, 
      { translateX: damagePosX.value }, 
      { scale: isCritValue.value ? 1.6 : 1.1 }
    ]
  }));

  const damageTextInnerStyle = useAnimatedStyle(() => ({
    fontSize: isCritValue.value ? 40 : 28,
    color: "#ffffff",
  }));

  return (
    <View className="flex-1 bg-void">
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

      {/* Grid Lines Overlay */}

      {!simBattle || !simStarted ? (
        <View className="flex-1 justify-center items-center px-12">
           <ActivityIndicator size="small" color="#ffffff" />
           <Text className="text-white/40 text-[8px] font-pixel-bold uppercase tracking-[3px] mt-6">Initializing Encounter</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Animated.View style={[{ flex: 1 }, screenStyle]}>
            {/* 🎭 BATTLESTAGE */}
            <View 
              style={{ paddingTop: Math.max(insets.top, 12) }}
              className="flex-1 items-center justify-center"
            >
              <View className="flex-row items-center justify-between w-full px-8">
                {/* Player Platform */}
                <View className="items-center">
                  <Animated.View style={playerStyle}>
                    <View style={{ width: 160, height: 160 }}>
                      <Image source={IDLE_SPRITE} style={{ position: 'absolute', width: 160, height: 160, opacity: isPlayerAttacking ? 0 : 1 }} contentFit="contain" />
                      <Image source={ATTACK_SPRITE} style={{ position: 'absolute', width: 160, height: 160, opacity: isPlayerAttacking ? 1 : 0 }} contentFit="contain" />
                    </View>
                  </Animated.View>
                  <View className="w-20 h-1 bg-white/10 rounded-full mt-2 opacity-50" style={{ transform: [{ scaleY: 0.3 }] }} />
                </View>

                {/* Enemy Platform */}
                <View className="items-center">
                  <Animated.View style={enemyStyle}>
                    <View style={{ width: 160, height: 160 }}>
                      <Image source={IDLE_SPRITE} style={{ position: 'absolute', width: 160, height: 160, transform: [{ scaleX: -1 }], opacity: isEnemyAttacking ? 0 : 1 }} contentFit="contain" />
                      <Image source={ATTACK_SPRITE} style={{ position: 'absolute', width: 160, height: 160, transform: [{ scaleX: -1 }], opacity: isEnemyAttacking ? 1 : 0 }} contentFit="contain" />
                    </View>
                  </Animated.View>
                  <View className="w-20 h-1 bg-white/10 rounded-full mt-2 opacity-50" style={{ transform: [{ scaleY: 0.3 }] }} />
                </View>
              </View>

              <Animated.View style={damageTextStyle} className="absolute pointer-events-none items-center justify-center">
                {showCritLabel && (
                  <Text className="text-white text-[9px] font-pixel-bold uppercase tracking-[2px] mb-0.5">
                    CRIT!
                  </Text>
                )}
                <Animated.Text style={[
                  damageTextInnerStyle,
                  { 
                    fontWeight: '900',
                    textShadowColor: 'rgba(0, 0, 0, 0.8)',
                    textShadowOffset: {width: 0, height: 1},
                    textShadowRadius: 6
                  }
                ]}>
                  {dmgText}
                </Animated.Text>
              </Animated.View>
            </View>

            {/* ⚔️ HEALTH BARS — below sprites */}
            <View className="px-6 pb-4 gap-3">
              {/* Player HP */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-white text-xs font-pixel-bold">HERO</Text>
                  <Text className="text-white text-xs font-pixel-bold">{Math.floor(combatSim?.playerHp ?? 0)} / {simBattle.startMaxPlayerHp || 1} HP</Text>
                </View>
                <ProgressBar current={combatSim?.playerHp ?? 0} max={simBattle.startMaxPlayerHp || 1} color="verdant" size="sm" hideLabel />
              </View>

              {/* Enemy HP */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-white/60 text-xs font-pixel-bold">
                    {simBattle.enemyName?.toUpperCase() || "FOE"}
                  </Text>
                  <Text className="text-white text-xs font-pixel-bold">{Math.floor(combatSim?.enemyHp ?? 0)} / {simBattle.startMaxEnemyHp || 1} HP</Text>
                </View>
                <ProgressBar current={combatSim?.enemyHp ?? 0} max={simBattle.startMaxEnemyHp || 1} color="crimson" size="sm" hideLabel />
              </View>
            </View>

            {/* ⚡ SPEED TOGGLE — just above console log */}
            <View className="flex-row justify-end items-center px-6 pb-2">
              <Pressable
                onPress={cycleSpeed}
                className="flex-row items-center bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5 active:bg-white/[0.08]"
              >
                <Text className="text-white/40 text-[8px] font-pixel-bold uppercase tracking-wider mr-1.5">Speed</Text>
                <Text className="text-white text-[11px] font-pixel-bold">{speed}x</Text>
              </Pressable>
            </View>

            {/* 📜 TERMINAL COMBAT LOG */}
            <View className="bg-white/[0.02] border border-white/10 rounded-xl p-4 mx-6 mb-6" style={{ minHeight: 240 }}>
              <View className="space-y-2 flex-1 justify-end">
                {visibleLogs.map((log) => (
                  <Animated.View key={log.id} entering={FadeIn.duration(150)}>
                    <Text 
                      className={`font-mono text-[9px] tracking-tight ${
                        log.isLatest 
                          ? log.isCrit 
                            ? "text-white font-bold" 
                            : "text-white/80" 
                          : "text-white/20"
                      }`}
                    >
                      {log.isLatest ? "> " : "  "} {log.message}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
