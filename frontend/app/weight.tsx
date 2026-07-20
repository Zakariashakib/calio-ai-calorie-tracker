import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { colors, radius, shadow } from "@/src/theme";

type WeightLog = { log_id: string; weight_kg: number; logged_at: string };

export default function WeightScreen() {
  const [range, setRange] = useState<"Weekly" | "Monthly" | "Yearly">("Weekly");
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { setLogs(await api<WeightLog[]>("/weight")); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const shown = useMemo(() => logs.slice(range === "Weekly" ? -7 : range === "Monthly" ? -30 : -365), [logs, range]);
  const min = Math.min(...shown.map((x) => x.weight_kg), 0) || 60; const max = Math.max(...shown.map((x) => x.weight_kg), min + 1);
  const add = async () => { const weight = Number(value); if (!weight) return; try { await api("/weight", { method: "POST", body: JSON.stringify({ weight_kg: weight }) }); setValue(""); setMessage("Weight logged"); await load(); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not log weight"); } };
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}><PressableScale style={styles.iconButton} onPress={() => router.back()} testID="weight-back-button"><Ionicons name="arrow-back" size={21} color={colors.ink} /></PressableScale><Text style={styles.headerTitle}>Weight tracking</Text><View style={styles.iconButton} /></View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.current}><Text style={styles.kicker}>CURRENT WEIGHT</Text><Text style={styles.currentValue}>{logs.length ? logs[logs.length - 1].weight_kg.toFixed(1) : "—"}<Text style={styles.unit}> kg</Text></Text><Text style={styles.change}>{logs.length > 1 ? `${(logs[logs.length - 1].weight_kg - logs[0].weight_kg).toFixed(1)} kg overall` : "Add entries to reveal your trend"}</Text></View>
          <View style={styles.range}>{(["Weekly", "Monthly", "Yearly"] as const).map((item) => <PressableScale key={item} style={[styles.rangeButton, range === item && styles.rangeActive]} onPress={() => setRange(item)} testID={`weight-range-${item.toLowerCase()}`}><Text style={[styles.rangeText, range === item && styles.rangeTextActive]}>{item}</Text></PressableScale>)}</View>
          <View style={styles.chart} testID="weight-trend-chart">{loading ? <ActivityIndicator color={colors.peach} /> : shown.length ? <View style={styles.points}>{shown.map((log, index) => { const height = 20 + ((log.weight_kg - min) / Math.max(1, max - min)) * 130; return <View key={log.log_id} style={styles.pointColumn}><Text style={styles.pointValue}>{log.weight_kg.toFixed(1)}</Text><View style={[styles.stem, { height }]}><View style={styles.point} /></View><Text style={styles.pointDate}>{new Date(log.logged_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</Text></View>; })}</View> : <View style={styles.empty}><Ionicons name="analytics-outline" size={27} color={colors.peach} /><Text style={styles.emptyText}>Your graph starts with the first entry.</Text></View>}</View>
          <View style={styles.form}><View><Text style={styles.formTitle}>Log today&apos;s weight</Text><Text style={styles.formHint}>Use the same scale and time for consistency.</Text></View><View style={styles.inputRow}><TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="72.4" placeholderTextColor="#AAA" style={styles.input} testID="weight-value-input" /><Text style={styles.kg}>kg</Text><PressableScale style={styles.add} onPress={add} testID="save-weight-button"><Ionicons name="add" color="white" size={23} /></PressableScale></View></View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast visible={!!message} message={message} error={message.startsWith("Could")} onClose={() => setMessage("")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, header: { height: 66, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, iconButton: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" }, content: { padding: 20, paddingBottom: 45, gap: 18 }, current: { alignItems: "center", gap: 6, paddingVertical: 12 }, kicker: { color: colors.peach, fontSize: 11, letterSpacing: 1.4, fontWeight: "800" }, currentValue: { color: colors.ink, fontSize: 43, fontWeight: "900" }, unit: { color: colors.muted, fontSize: 16 }, change: { color: colors.muted, fontSize: 12 }, range: { flexDirection: "row", backgroundColor: colors.surface, padding: 4, borderRadius: radius.pill }, rangeButton: { height: 38, flex: 1, borderRadius: 19, alignItems: "center", justifyContent: "center" }, rangeActive: { backgroundColor: colors.dark }, rangeText: { color: colors.muted, fontSize: 12, fontWeight: "700" }, rangeTextActive: { color: "white" }, chart: { minHeight: 240, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, justifyContent: "center", overflow: "hidden", ...shadow }, points: { height: 190, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" }, pointColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 5 }, pointValue: { color: colors.ink, fontSize: 9, fontWeight: "700" }, stem: { width: 4, backgroundColor: colors.arcTrack, justifyContent: "flex-start", alignItems: "center", borderRadius: 3 }, point: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.peach, marginTop: -4 }, pointDate: { color: colors.muted, fontSize: 8 }, empty: { alignItems: "center", gap: 9 }, emptyText: { color: colors.muted, fontSize: 13 }, form: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 15, ...shadow }, formTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" }, formHint: { color: colors.muted, fontSize: 11, marginTop: 4 }, inputRow: { backgroundColor: colors.canvas, borderRadius: radius.md, flexDirection: "row", alignItems: "center", paddingLeft: 15 }, input: { flex: 1, height: 54, color: colors.ink, fontSize: 20, fontWeight: "800" }, kg: { color: colors.muted, fontSize: 12 }, add: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center", marginHorizontal: 4 },
});
