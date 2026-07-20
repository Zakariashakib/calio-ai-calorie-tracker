import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, shadow } from "@/src/theme";

export function ProgressBar({ value, goal, color = colors.green }: { value: number; goal: number; color?: string }) {
  const width = `${Math.min(100, Math.max(0, (value / Math.max(goal, 1)) * 100))}%` as const;
  return <View style={styles.track}><View style={[styles.fill, { width, backgroundColor: color }]} /></View>;
}

export function MacroCard({ label, value, goal, unit, color, icon }: { label: string; value: number; goal: number; unit: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.macroCard} testID={`macro-${label.toLowerCase()}-card`}>
      <View style={[styles.icon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={17} color={color} /></View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{Math.round(value)} <Text style={styles.goal}>/ {goal}{unit}</Text></Text>
      <ProgressBar value={value} goal={goal} color={color} />
    </View>
  );
}

export function MetricCard({ icon, label, value, accent = colors.peach }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent?: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={19} color={accent} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 7, borderRadius: 8, backgroundColor: colors.arcTrack, overflow: "hidden" },
  fill: { height: 7, borderRadius: 8 },
  macroCard: { flex: 1, minWidth: 145, padding: 16, borderRadius: radius.md, backgroundColor: colors.surface, gap: 8, ...shadow },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  value: { fontSize: 17, color: colors.ink, fontWeight: "800" },
  goal: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  metric: { flex: 1, minWidth: 94, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 7, ...shadow },
  metricValue: { fontSize: 19, fontWeight: "800", color: colors.ink },
  metricLabel: { fontSize: 12, color: colors.muted },
});
