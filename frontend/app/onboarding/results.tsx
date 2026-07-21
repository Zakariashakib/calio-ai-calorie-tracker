import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOnboarding } from "@/src/onboarding-context";
import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadows } from "@/src/theme";

export default function ResultsScreen() {
  const { data } = useOnboarding();

  const metrics = useMemo(() => {
    let bmr = 1600;
    let tdee = 2200;
    let calGoal = 2200;
    let proteinG = 130;
    let carbsG = 220;
    let fatG = 70;

    const weightKg = data.weight_kg || 70;
    const heightCm = data.height_cm || 170;
    const age = data.age || 25;
    const isMale = data.gender === "male";
    
    // Mifflin-St Jeor BMR calculation
    bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (isMale ? 5 : -161));
    
    const activityMultipliers: Record<string, number> = {
      "0–2": 1.2,
      "3–5": 1.55,
      "6+": 1.725,
    };
    tdee = Math.round(bmr * (activityMultipliers[data.activity_level] || 1.55));
    
    // Adjust for goal
    if (data.goal === "lose") calGoal = Math.round(tdee * 0.8);
    else if (data.goal === "gain") calGoal = Math.round(tdee * 1.15);
    else calGoal = tdee;
    
    proteinG = Math.round(weightKg * 1.8);
    fatG = Math.round((calGoal * 0.25) / 9);
    carbsG = Math.round((calGoal - proteinG * 4 - fatG * 9) / 4);

    const bmi = (weightKg / Math.pow(heightCm / 100, 2)).toFixed(1);

    return { bmr, tdee, calGoal, proteinG, carbsG, fatG, bmi };
  }, [data]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>YOUR PLAN IS READY</Text>
        <Text style={styles.title}>Personalized Nutrition Targets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Calories</Text>
          <Text style={styles.cardValue}>{metrics.calGoal} kcal</Text>
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>{metrics.proteinG}g</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>{metrics.carbsG}g</Text>
          </View>
          <View style={styles.macroCard}>
            <Text style={styles.macroLabel}>Fat</Text>
            <Text style={styles.macroValue}>{metrics.fatG}g</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Current BMI</Text>
            <Text style={styles.statValue}>{metrics.bmi}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue}>{data.goal.toUpperCase()}</Text>
          </View>
          <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.statLabel}>Activity</Text>
            <Text style={styles.statValue}>{data.activity_level} workouts/wk</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale style={styles.next} onPress={() => router.push("/onboarding/sign-up")}>
          <Text style={styles.nextText}>Create Account to Save</Text>
          <Ionicons name="arrow-forward" size={19} color="white" />
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10, gap: 4 },
  kicker: { fontSize: 11, fontWeight: "800", color: colors.peach, letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, lineHeight: 34 },
  content: { paddingHorizontal: 24, paddingVertical: 10, gap: 16 },
  card: { backgroundColor: colors.dark, padding: 24, borderRadius: radius.lg, alignItems: "center", ...shadows.card },
  cardTitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  cardValue: { color: "white", fontSize: 36, fontWeight: "800" },
  macrosRow: { flexDirection: "row", gap: 12 },
  macroCard: { flex: 1, backgroundColor: colors.surface, padding: 16, borderRadius: radius.md, alignItems: "center", ...shadows.subtle },
  macroLabel: { fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 4 },
  macroValue: { fontSize: 20, color: colors.ink, fontWeight: "800" },
  statsCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 20, ...shadows.subtle },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.canvas },
  statLabel: { fontSize: 15, color: colors.muted, fontWeight: "500" },
  statValue: { fontSize: 15, color: colors.ink, fontWeight: "700" },
  footer: { paddingHorizontal: 24, paddingVertical: 16 },
  next: { height: 58, borderRadius: radius.pill, backgroundColor: colors.dark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextText: { color: "white", fontSize: 16, fontWeight: "700" },
});
