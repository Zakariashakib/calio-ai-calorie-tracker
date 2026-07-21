import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadows } from "@/src/theme";

export default function AppleHealthScreen() {
  const handleNext = () => {
    router.replace("/(tabs)");
  };

  const handleConnect = async () => {
    // DEV: Mocking Apple Health connection
    console.log("Mocking HealthKit connection request...");
    // Ideally use react-native-health or expo-health
    setTimeout(() => {
      handleNext();
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="heart" size={50} color={colors.surface} />
        </View>
        <Text style={styles.title}>Connect Apple Health</Text>
        <Text style={styles.subtitle}>Automatically sync your activity and vitals to keep your calorie recommendations perfectly tuned.</Text>

        <View style={styles.list}>
          <Feature icon="walk-outline" text="Steps & Active Calories" />
          <Feature icon="barbell-outline" text="Workouts & Exercise Minutes" />
          <Feature icon="pulse-outline" text="Heart Rate" />
          <Feature icon="scale-outline" text="Weight Tracking" />
        </View>
      </View>

      <View style={styles.footer}>
        <PressableScale style={styles.primaryBtn} onPress={handleConnect}>
          <Text style={styles.primaryText}>Connect Apple Health</Text>
        </PressableScale>
        <PressableScale style={styles.secondaryBtn} onPress={handleNext}>
          <Text style={styles.secondaryText}>Not Now</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={22} color={colors.red} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center", alignItems: "center", gap: 16 },
  iconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.red, alignItems: "center", justifyContent: "center", marginBottom: 10, ...shadows.card },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 22 },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, width: "100%", gap: 16, marginTop: 20, ...shadows.subtle },
  feature: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { fontSize: 15, color: colors.ink, fontWeight: "600" },
  footer: { paddingHorizontal: 24, paddingBottom: 20, gap: 12 },
  primaryBtn: { height: 58, backgroundColor: colors.red, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { height: 58, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.muted, fontSize: 16, fontWeight: "600" },
});
