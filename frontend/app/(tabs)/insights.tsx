import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api";
import { AppScreen } from "@/src/components/AppScreen";
import { MetricCard } from "@/src/components/NutritionUi";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { colors, radius, shadow } from "@/src/theme";
import type { Dashboard } from "@/src/types";

type Report = { series: Array<{ date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; water_ml: number }>; average_calories: number; average_protein_g: number; average_water_ml: number; weight_change_kg: number; consistency_percent: number };

export default function InsightsScreen() {
  const [report, setReport] = useState<Report | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { const [r, d] = await Promise.all([api<Report>("/reports/weekly"), api<Dashboard>("/dashboard")]); setReport(r); setDashboard(d); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not load insights"); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const maxCalories = useMemo(() => Math.max(1, ...(report?.series.map((x) => x.calories) ?? [1])), [report]);
  const exportPdf = async () => {
    if (!report) return;
    try {
      const rows = report.series.map((x) => `<tr><td>${x.date}</td><td>${Math.round(x.calories)}</td><td>${Math.round(x.protein_g)}g</td><td>${(x.water_ml / 1000).toFixed(1)}L</td></tr>`).join("");
      const { uri } = await Print.printToFileAsync({ html: `<html><body style="font-family:Arial;padding:32px;color:#171A16"><h1>CalSnap Weekly Nutrition Report</h1><p>Informational estimates, not medical advice.</p><h2>Summary</h2><p>Average calories: ${report.average_calories} kcal<br/>Average protein: ${report.average_protein_g} g<br/>Consistency: ${report.consistency_percent}%<br/>Weight change: ${report.weight_change_kg} kg</p><table style="width:100%;border-collapse:collapse"><tr><th>Date</th><th>Calories</th><th>Protein</th><th>Water</th></tr>${rows}</table></body></html>` });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share CalSnap report" });
      else setMessage("Report PDF created");
    } catch { setMessage("Could not export the report"); }
  };
  if (loading || !report || !dashboard) return <AppScreen><ActivityIndicator size="large" color={colors.peach} /></AppScreen>;
  const macros = [{ label: "Protein", value: dashboard.totals.protein_g, color: colors.green }, { label: "Carbs", value: dashboard.totals.carbs_g, color: colors.yellow }, { label: "Fat", value: dashboard.totals.fat_g, color: colors.peach }, { label: "Fiber", value: dashboard.totals.fiber_g, color: "#8AB1D6" }];
  const macroTotal = Math.max(1, macros.reduce((s, x) => s + x.value, 0));
  return (
    <AppScreen testID="insights-screen">
      <View style={styles.header}><View><Text style={styles.kicker}>LAST 7 DAYS</Text><Text style={styles.title}>Your insights</Text></View><PressableScale style={styles.export} onPress={exportPdf} testID="export-pdf-button"><Ionicons name="share-outline" size={20} color={colors.ink} /></PressableScale></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricRow}>
        <MetricCard icon="flame" label="Avg calories" value={`${report.average_calories}`} accent={colors.peach} />
        <MetricCard icon="fitness" label="Avg protein" value={`${report.average_protein_g}g`} />
        <MetricCard icon="water" label="Avg water" value={`${(report.average_water_ml / 1000).toFixed(1)}L`} accent="#5EA4D8" />
        <MetricCard icon="checkmark-circle" label="Consistency" value={`${report.consistency_percent}%`} />
      </ScrollView>
      <View style={styles.chartCard} testID="weekly-calorie-chart"><View style={styles.sectionRow}><View><Text style={styles.section}>Calories</Text><Text style={styles.small}>Daily intake trend</Text></View><Text style={styles.goal}>Goal {dashboard.goals.calories}</Text></View><View style={styles.chart}>{report.series.map((row) => <View key={row.date} style={styles.barColumn}><View style={[styles.bar, { height: Math.max(5, row.calories / maxCalories * 120), backgroundColor: row.calories > dashboard.goals.calories ? colors.red : colors.peach }]} /><Text style={styles.day}>{new Date(`${row.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}</Text></View>)}</View></View>
      <View style={styles.flowerCard} testID="nutrition-flower-chart"><View style={styles.flower}><View style={styles.flowerCenter}><Text style={styles.flowerNumber}>{Math.round(dashboard.totals.calories)}</Text><Text style={styles.flowerUnit}>kcal</Text></View>{macros.map((macro, index) => <View key={macro.label} style={[styles.petal, { backgroundColor: macro.color, opacity: 0.45 + macro.value / macroTotal, transform: [{ rotate: `${index * 90}deg` }, { translateY: -58 }] }]} />)}</View><View style={styles.legend}>{macros.map((macro) => <View key={macro.label} style={styles.legendRow}><View style={[styles.dot, { backgroundColor: macro.color }]} /><Text style={styles.legendLabel}>{macro.label}</Text><Text style={styles.legendValue}>{Math.round(macro.value)}g · {Math.round(macro.value / macroTotal * 100)}%</Text></View>)}</View></View>
      <PressableScale style={styles.actionCard} onPress={() => router.push("/weight")} testID="open-weight-tracking-button"><View style={styles.actionIcon}><Ionicons name="trending-down" size={23} color={colors.ink} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>Weight tracking</Text><Text style={styles.small}>{report.weight_change_kg === 0 ? "Add your latest weight and see trends" : `${Math.abs(report.weight_change_kg)} kg ${report.weight_change_kg < 0 ? "lost" : "gained"} recently`}</Text></View><Ionicons name="chevron-forward" size={21} color={colors.muted} /></PressableScale>
      <PressableScale style={styles.actionCard} onPress={() => router.push("/challenges")} testID="open-challenges-button"><View style={[styles.actionIcon, { backgroundColor: colors.peachSoft }]}><Ionicons name="trophy" size={23} color={colors.peach} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>Healthy challenges</Text><Text style={styles.small}>Build streaks and earn badges</Text></View><Ionicons name="chevron-forward" size={21} color={colors.muted} /></PressableScale>
      <Toast visible={!!message} message={message} error={message.startsWith("Could")} onClose={() => setMessage("")} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, kicker: { color: colors.peach, fontSize: 11, letterSpacing: 1.5, fontWeight: "800" }, title: { color: colors.ink, fontSize: 31, fontWeight: "900", letterSpacing: -0.8 }, export: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadow }, metricRow: { gap: 10, paddingVertical: 4 }, chartCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, gap: 18, ...shadow }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, section: { color: colors.ink, fontSize: 19, fontWeight: "900" }, small: { color: colors.muted, fontSize: 12, lineHeight: 17 }, goal: { color: colors.peach, backgroundColor: colors.peachSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, fontSize: 10, fontWeight: "800" }, chart: { height: 155, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }, barColumn: { height: 150, width: 28, justifyContent: "flex-end", alignItems: "center", gap: 7 }, bar: { width: 16, borderRadius: 8 }, day: { fontSize: 10, color: colors.muted, fontWeight: "700" },
  flowerCard: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: 22, flexDirection: "row", alignItems: "center", gap: 22 }, flower: { width: 150, height: 150, alignItems: "center", justifyContent: "center" }, flowerCenter: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", zIndex: 2 }, flowerNumber: { fontSize: 17, fontWeight: "900", color: colors.ink }, flowerUnit: { fontSize: 9, color: colors.muted }, petal: { position: "absolute", width: 52, height: 76, borderRadius: 28 }, legend: { flex: 1, gap: 13 }, legendRow: { flexDirection: "row", alignItems: "center", gap: 7 }, dot: { width: 8, height: 8, borderRadius: 4 }, legendLabel: { color: "white", fontSize: 12, flex: 1 }, legendValue: { color: "#AFB4AC", fontSize: 10 },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.surface, borderRadius: radius.md, padding: 15, ...shadow }, actionIcon: { width: 48, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }, actionCopy: { flex: 1, gap: 3 }, actionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
});
