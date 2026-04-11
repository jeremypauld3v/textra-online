import {
  View, Text, ActivityIndicator, StyleSheet
} from "react-native";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { useEncounterStore } from "../store/useEncounterStore";
import { SafeAreaView } from "react-native-safe-area-context";

const BATTLE_START_DELAY = 3000;

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

  // 3s delay before animation starts (gives both players time to see the screen)
  useEffect(() => {
    if (!simBattle) { setSimStarted(false); return; }
    setSimStarted(false);
    const delay = setTimeout(() => setSimStarted(true), BATTLE_START_DELAY);
    return () => clearTimeout(delay);
  }, [simBattle, simBattle?.log]);

  // Turn-by-turn progression
  useEffect(() => {
    if (!simBattle || !simStarted) return;
    if (simTurn < simBattle.log.logDetails.length - 1) {
      const t = setTimeout(() => setSimTurn(v => v + 1), 1200);
      return () => clearTimeout(t);
    }
    if (simTurn === simBattle.log.logDetails.length - 1) {
      const t = setTimeout(() => {
        if (simBattle.isPvp) {
          Toast.show({
            type: simBattle.isWin ? 'success' : 'error',
            text1: simBattle.isWin ? '⚔️ Victory!' : '💀 Defeated!',
            text2: simBattle.isWin
              ? `Looted ${simBattle.goldStolen || 0} gold!`
              : 'Lost 10% gold and some items.',
            visibilityTime: 3500,
          });
        }
        setSimBattle(null);
        setSimTurn(0);
        setSimStarted(false);
        safeBack();
      }, 2500);
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
    <SafeAreaView style={styles.root}>
      {!simStarted ? (
        /* ── Pre-battle: 3s countdown ── */
        <View style={styles.intro}>
          <Text style={styles.battleLabel}>
            {simBattle.isPvp ? "⚔️ PVP BATTLE" : simBattle.isGathering ? "⚒️ GATHERING" : "⚔️ COMBAT"}
          </Text>
          <Text style={styles.vsLine}>
            {simBattle.playerName ?? "You"}
            {" vs "}
            {simBattle.enemyName ?? simBattle.log?.enemyName ?? "Enemy"}
          </Text>
          <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 32 }} />
          <Text style={styles.startingText}>Battle starting in {Math.ceil(BATTLE_START_DELAY / 1000)}s...</Text>
        </View>
      ) : (
        /* ── Active battle ── */
        <View style={styles.battleContainer}>
          {/* HP Bars */}
          <View style={styles.hpRow}>
            <View style={styles.hpBlock}>
              <Text style={styles.playerName}>
                {simBattle.isGathering ? "⚒️ Worker" : (simBattle.playerName ?? "You")}
              </Text>
              <View style={styles.hpBarBg}>
                <View style={[styles.hpBarFill, { width: `${combatSim?.playerHpPct ?? 100}%`, backgroundColor: '#10b981' }]} />
              </View>
              <Text style={styles.hpText}>
                {simBattle.isGathering ? "Efficiency" : `${Math.floor(combatSim?.playerHp ?? 0)} HP`}
              </Text>
            </View>

            <Text style={styles.vsText}>{simBattle.isGathering ? "AT" : "VS"}</Text>

            <View style={styles.hpBlock}>
              <Text style={styles.enemyName}>
                {simBattle.isGathering ? "Resource" : (simBattle.enemyName ?? simBattle.log?.enemyName)}
              </Text>
              <View style={styles.hpBarBg}>
                <View style={[styles.hpBarFill, { width: `${combatSim?.enemyHpPct ?? 100}%`, backgroundColor: '#ef4444' }]} />
              </View>
              <Text style={styles.hpText}>
                {simBattle.isGathering ? "Integrity" : `${Math.floor(combatSim?.enemyHp ?? 0)} HP`}
              </Text>
            </View>
          </View>

          {/* Log message */}
          <View style={styles.logCard}>
            <Text style={styles.logText}>{simBattle.log.logDetails[simTurn]?.message}</Text>
          </View>

          {/* Turn dots */}
          <View style={styles.dotRow}>
            {simBattle.log.logDetails.map((_: any, idx: number) => (
              <View key={idx} style={[styles.dot, idx === simTurn ? styles.dotActive : styles.dotInactive]} />
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 24 },
  intro: { alignItems: 'center' },
  battleLabel: { color: 'white', fontSize: 28, fontWeight: '900', fontStyle: 'italic', marginBottom: 12 },
  vsLine: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
  startingText: { color: '#475569', fontSize: 13, marginTop: 12 },
  battleContainer: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  hpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 40, paddingHorizontal: 16 },
  hpBlock: { flex: 1, alignItems: 'center' },
  playerName: { color: '#818cf8', fontWeight: '900', fontSize: 18, marginBottom: 8 },
  enemyName: { color: '#f87171', fontWeight: '900', fontSize: 18, marginBottom: 8 },
  hpBarBg: { width: '100%', height: 10, backgroundColor: '#0f172a', borderRadius: 999, overflow: 'hidden' },
  hpBarFill: { height: '100%', borderRadius: 999 },
  hpText: { color: '#475569', fontSize: 11, marginTop: 4, fontWeight: '700' },
  vsText: { color: 'white', fontWeight: '900', fontSize: 22, fontStyle: 'italic', marginHorizontal: 20 },
  logCard: { width: '100%', backgroundColor: '#0f172a', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: '#1e293b' },
  logText: { color: 'white', fontSize: 19, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  dotRow: { flexDirection: 'row', marginTop: 32, gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { height: 6, borderRadius: 999 },
  dotActive: { width: 28, backgroundColor: '#6366f1' },
  dotInactive: { width: 8, backgroundColor: '#1e293b' },
});
