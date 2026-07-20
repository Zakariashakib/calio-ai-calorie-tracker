import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth-context";
import { AppScreen } from "@/src/components/AppScreen";
import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadow } from "@/src/theme";

const rows = [
  { icon: "timer-outline" as const, title: "Intermittent fasting", detail: "Eating window and countdown", route: "/fasting" as const },
  { icon: "notifications-outline" as const, title: "Smart reminders", detail: "Water, meals and daily progress", route: "/reminders" as const },
  { icon: "trophy-outline" as const, title: "Challenges", detail: "Streaks, badges and healthy habits", route: "/challenges" as const },
  { icon: "scale-outline" as const, title: "Weight tracking", detail: "Weekly, monthly and yearly trends", route: "/weight" as const },
];

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  return (
    <AppScreen testID="more-screen">
      <View style={styles.header}><PressableScale style={styles.back} onPress={() => router.back()} testID="more-back-button"><Ionicons name="arrow-back" size={21} color={colors.ink} /></PressableScale><Text style={styles.headerTitle}>CalSnap</Text><View style={styles.back} /></View>
      <View style={styles.profile}><View style={styles.avatar}><Text style={styles.initial}>{user?.name.charAt(0).toUpperCase()}</Text></View><View style={styles.profileCopy}><Text style={styles.name}>{user?.name}</Text><Text style={styles.email}>{user?.email}</Text></View><View style={styles.premium}><Ionicons name="sparkles" size={13} color={colors.peach} /><Text style={styles.premiumText}>AI Coach</Text></View></View>
      <Text style={styles.section}>TOOLS & ROUTINES</Text>
      <View style={styles.card}>{rows.map((row, index) => <PressableScale key={row.title} style={[styles.row, index < rows.length - 1 && styles.border]} onPress={() => router.push(row.route)} testID={`open-${row.title.toLowerCase().replaceAll(" ", "-")}-button`}><View style={styles.icon}><Ionicons name={row.icon} size={21} color={colors.ink} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowDetail}>{row.detail}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></PressableScale>)}</View>
      <View style={styles.health}><Ionicons name="shield-checkmark" size={21} color={colors.greenDark} /><View style={styles.healthCopy}><Text style={styles.healthTitle}>Health guidance</Text><Text style={styles.healthText}>CalSnap provides estimates and informational guidance. It does not diagnose or replace professional medical advice.</Text></View></View>
      <PressableScale style={styles.logout} onPress={signOut} testID="logout-button"><Ionicons name="log-out-outline" size={20} color={colors.red} /><Text style={styles.logoutText}>Sign out</Text></PressableScale>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" }, profile: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: 20, flexDirection: "row", alignItems: "center", gap: 13 }, avatar: { width: 58, height: 58, borderRadius: 21, backgroundColor: colors.peachSoft, alignItems: "center", justifyContent: "center" }, initial: { color: colors.peach, fontSize: 24, fontWeight: "900" }, profileCopy: { flex: 1, gap: 4 }, name: { color: "white", fontSize: 18, fontWeight: "900" }, email: { color: "#AEB3AB", fontSize: 11 }, premium: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#333832", borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6 }, premiumText: { color: "white", fontSize: 9, fontWeight: "700" }, section: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" }, card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow }, row: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12 }, border: { borderBottomWidth: 1, borderBottomColor: colors.line }, icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" }, rowCopy: { flex: 1, gap: 4 }, rowTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, rowDetail: { color: colors.muted, fontSize: 11 }, health: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, ...shadow }, healthCopy: { flex: 1, gap: 5 }, healthTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" }, healthText: { color: colors.muted, fontSize: 11, lineHeight: 17 }, logout: { height: 54, borderRadius: radius.pill, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, logoutText: { color: colors.red, fontSize: 15, fontWeight: "800" },
});
