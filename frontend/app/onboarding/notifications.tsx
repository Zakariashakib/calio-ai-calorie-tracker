import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadows } from "@/src/theme";

export default function NotificationsScreen() {
  const handleNext = () => {
    router.replace("/onboarding/apple-health");
  };

  const handleEnable = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") {
      // Save push token to backend if needed
    }
    handleNext();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications" size={50} color={colors.surface} />
        </View>
        <Text style={styles.title}>Stay on Track</Text>
        <Text style={styles.subtitle}>Allow notifications to get personalized reminders, motivational coaching, and weekly reports.</Text>

        <View style={styles.list}>
          <Feature text="Meal reminders" />
          <Feature text="Weight tracking reminders" />
          <Feature text="Water reminders" />
          <Feature text="Motivational coaching" />
        </View>
      </View>

      <View style={styles.footer}>
        <PressableScale style={styles.primaryBtn} onPress={handleEnable}>
          <Text style={styles.primaryText}>Enable Notifications</Text>
        </PressableScale>
        <PressableScale style={styles.secondaryBtn} onPress={handleNext}>
          <Text style={styles.secondaryText}>Not Now</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name="checkmark-circle" size={20} color={colors.peach} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center", alignItems: "center", gap: 16 },
  iconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.peach, alignItems: "center", justifyContent: "center", marginBottom: 10, ...shadows.card },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 22 },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, width: "100%", gap: 14, marginTop: 20, ...shadows.subtle },
  feature: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { fontSize: 15, color: colors.ink, fontWeight: "600" },
  footer: { paddingHorizontal: 24, paddingBottom: 20, gap: 12 },
  primaryBtn: { height: 58, backgroundColor: colors.dark, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { height: 58, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.muted, fontSize: 16, fontWeight: "600" },
});
