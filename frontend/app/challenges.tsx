import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { colors, radius, shadow } from "@/src/theme";
import type { ChallengeStatus } from "@/src/types";

// Local challenge metadata (id must match backend)
const CHALLENGE_META: Record<
  string,
  {
    icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
    title: string;
    detail: string;
    color: string;
    badgeLabel: string;
    goal: number;
  }
> = {
  "healthy-7": {
    icon: "leaf",
    title: "7 Days Healthy Eating",
    detail: "Log a balanced meal every day for 7 consecutive days",
    color: colors.green,
    badgeLabel: "Health Champion",
    goal: 7,
  },
  "weight-loss-30": {
    icon: "trending-down",
    title: "30 Day Consistency",
    detail: "Log your meals every day for 30 consecutive days",
    color: colors.peach,
    badgeLabel: "Consistency King",
    goal: 30,
  },
  "water-14": {
    icon: "water",
    title: "14 Days Hydrated",
    detail: "Log your water intake every day for 14 days",
    color: "#62A9D9",
    badgeLabel: "Hydration Hero",
    goal: 14,
  },
};

const CHALLENGE_IDS = ["healthy-7", "weight-loss-30", "water-14"] as const;
type ChallengeId = (typeof CHALLENGE_IDS)[number];

export default function ChallengesScreen() {
  const [joined, setJoined] = useState<ChallengeId[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ChallengeStatus>>({});
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    try {
      const results = await api<ChallengeStatus[]>("/challenges");
      const map: Record<string, ChallengeStatus> = {};
      const ids: ChallengeId[] = [];
      for (const r of results) {
        map[r.challenge_id] = r;
        if (CHALLENGE_IDS.includes(r.challenge_id as ChallengeId)) {
          ids.push(r.challenge_id as ChallengeId);
        }
      }
      setStatuses(map);
      setJoined(ids);
    } catch {
      // silently degrade — joined list stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const join = async (id: ChallengeId) => {
    setJoiningId(id);
    try {
      const result = await api<ChallengeStatus>("/challenges", {
        method: "POST",
        body: JSON.stringify({ challenge_id: id }),
      });
      setStatuses((prev) => ({ ...prev, [id]: result }));
      setJoined((prev) => [...new Set([...prev, id])]);
      setMessage(`${CHALLENGE_META[id].title} joined!`);
      setIsError(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not join challenge");
      setIsError(true);
    } finally {
      setJoiningId(null);
    }
  };

  const earnedBadges = Object.values(statuses).filter((s) => s.badge_earned).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale style={styles.back} onPress={() => router.back()} testID="challenges-back-button">
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </PressableScale>
        <Text style={styles.headerTitle}>Challenges</Text>
        <View style={styles.badgeCounter}>
          <Ionicons name="trophy" size={14} color={colors.peach} />
          <Text style={styles.badgeCounterText}>{earnedBadges}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.trophy}>
            <Ionicons name="trophy" size={36} color={colors.peach} />
          </View>
          <Text style={styles.heroTitle}>Small wins. Real change.</Text>
          <Text style={styles.heroText}>
            Pick a challenge, build your streak, and earn badges along the way.
          </Text>
        </View>

        {/* Earned badges summary */}
        {earnedBadges > 0 && (
          <View style={styles.badgeBanner}>
            <Ionicons name="ribbon" size={22} color={colors.peach} />
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeBannerTitle}>
                {earnedBadges} badge{earnedBadges > 1 ? "s" : ""} earned 🎉
              </Text>
              <Text style={styles.badgeBannerSub}>
                {Object.values(statuses)
                  .filter((s) => s.badge_earned)
                  .map((s) => CHALLENGE_META[s.challenge_id]?.badgeLabel)
                  .join("  ·  ")}
              </Text>
            </View>
          </View>
        )}

        {/* Challenge cards */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : (
          CHALLENGE_IDS.map((id) => {
            const meta = CHALLENGE_META[id];
            const status = statuses[id];
            const isJoined = joined.includes(id);
            const progress = status?.progress ?? 0;
            const goal = status?.goal ?? meta.goal;
            const streak = status?.streak ?? 0;
            const badgeEarned = status?.badge_earned ?? false;
            const pct = Math.min(1, progress / goal);

            return (
              <View key={id} style={styles.card} testID={`challenge-${id}`}>
                {/* Top row */}
                <View style={styles.cardTop}>
                  <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
                    <Ionicons name={meta.icon} size={24} color={meta.color} />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{meta.title}</Text>
                    <Text style={styles.cardDetail}>{meta.detail}</Text>
                  </View>
                  {badgeEarned ? (
                    <View style={styles.badge}>
                      <Ionicons name="trophy" size={18} color={colors.peach} />
                    </View>
                  ) : isJoined ? (
                    <PressableScale
                      style={[styles.joinBtn, styles.joinedBtn]}
                      onPress={() => {}} // already joined
                      testID={`join-challenge-${id}-button`}
                    >
                      <Text style={styles.joinText}>Joined</Text>
                    </PressableScale>
                  ) : (
                    <PressableScale
                      style={styles.joinBtn}
                      onPress={() => join(id)}
                      disabled={joiningId === id}
                      testID={`join-challenge-${id}-button`}
                    >
                      {joiningId === id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.joinText}>Join</Text>
                      )}
                    </PressableScale>
                  )}
                </View>

                {/* Progress bar (only if joined) */}
                {isJoined && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${pct * 100}%`, backgroundColor: badgeEarned ? colors.peach : meta.color },
                        ]}
                      />
                    </View>
                    <View style={styles.progressRow}>
                      <View style={styles.streakPill}>
                        <Ionicons name="flame" size={12} color={meta.color} />
                        <Text style={[styles.streakText, { color: meta.color }]}>
                          {streak} day streak
                        </Text>
                      </View>
                      <Text style={styles.progressCount}>
                        {progress}/{goal} days
                      </Text>
                    </View>

                    {/* Badge unlocked state */}
                    {badgeEarned && (
                      <View style={styles.badgeUnlocked}>
                        <Ionicons name="ribbon" size={15} color={colors.peach} />
                        <Text style={styles.badgeUnlockedText}>
                          🏅 {meta.badgeLabel} unlocked!
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footer}>
          Progress updates automatically each time you log a meal or water.
        </Text>
      </ScrollView>

      <Toast
        visible={!!message}
        message={message}
        error={isError}
        onClose={() => { setMessage(""); setIsError(false); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, height: 64 },
  back: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  badgeCounter: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.peachSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  badgeCounterText: { color: colors.peach, fontWeight: "900", fontSize: 13 },

  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 18 },

  hero: { alignItems: "center", gap: 10, paddingVertical: 8 },
  trophy: { width: 72, height: 72, borderRadius: 28, backgroundColor: colors.peachSoft, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: colors.ink, fontSize: 26, fontWeight: "900" },
  heroText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 310 },

  badgeBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.peachSoft, borderRadius: radius.md, padding: 16 },
  badgeBannerTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  badgeBannerSub: { color: colors.muted, fontSize: 11, marginTop: 2 },

  loadingBox: { height: 120, alignItems: "center", justifyContent: "center" },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 14, ...shadow },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  iconWrap: { width: 52, height: 52, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  cardDetail: { color: colors.muted, fontSize: 11, lineHeight: 16 },

  badge: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.peachSoft, alignItems: "center", justifyContent: "center" },

  joinBtn: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.dark, justifyContent: "center", minWidth: 64, alignItems: "center" },
  joinedBtn: { backgroundColor: colors.green },
  joinText: { color: "white", fontSize: 12, fontWeight: "800" },

  progressSection: { gap: 9 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.canvas, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streakPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakText: { fontSize: 11, fontWeight: "800" },
  progressCount: { fontSize: 11, color: colors.muted, fontWeight: "700" },

  badgeUnlocked: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.peachSoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  badgeUnlockedText: { color: colors.ink, fontSize: 13, fontWeight: "800" },

  footer: { textAlign: "center", color: colors.muted, fontSize: 11, lineHeight: 17 },
});
