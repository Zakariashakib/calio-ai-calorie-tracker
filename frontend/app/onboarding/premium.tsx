import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadows } from "@/src/theme";

export default function PremiumScreen() {
  const handleNext = () => {
    router.replace("/onboarding/notifications");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <PressableScale style={styles.skipBtn} onPress={handleNext}>
          <Text style={styles.skipText}>Skip</Text>
        </PressableScale>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={50} color={colors.surface} />
        </View>
        <Text style={styles.title}>Unlock Cal AI Premium</Text>
        <Text style={styles.subtitle}>Get the most out of your personalized nutrition plan with advanced features.</Text>

        <View style={styles.features}>
          <Feature icon="restaurant-outline" title="Unlimited AI Meal Scanning" />
          <Feature icon="fitness-outline" title="Advanced Macro Coaching" />
          <Feature icon="water-outline" title="Smart Reminders & Tracking" />
        </View>
      </View>

      <View style={styles.footer}>
        <PressableScale style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Start 7-Day Free Trial</Text>
        </PressableScale>
        <Text style={styles.legal}>Then $9.99/month. Cancel anytime.</Text>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={24} color={colors.peach} />
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.dark },
  header: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, paddingTop: 10 },
  skipBtn: { padding: 10 },
  skipText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center", alignItems: "center", gap: 16 },
  iconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.peach, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  title: { fontSize: 28, fontWeight: "800", color: "white", textAlign: "center" },
  subtitle: { fontSize: 16, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 22 },
  features: { width: "100%", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: radius.lg, padding: 20, gap: 16, marginTop: 20 },
  feature: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureText: { color: "white", fontSize: 16, fontWeight: "600" },
  footer: { paddingHorizontal: 24, paddingBottom: 20 },
  button: { height: 58, backgroundColor: colors.peach, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "white", fontSize: 17, fontWeight: "800" },
  legal: { fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 12 },
});
