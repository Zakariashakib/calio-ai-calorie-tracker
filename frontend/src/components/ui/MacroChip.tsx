import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, radius, shadows } from "@/src/theme";

export type MacroKind = "carbs" | "fats" | "sugar" | "protein";

/** Reference iconography: green leaf = carbs, orange drop = fats, red cube = sugar. */
export const MACRO_META: Record<
  MacroKind,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  carbs: { icon: "leaf", color: colors.green, label: "Carbs" },
  fats: { icon: "water", color: colors.yellow, label: "Fats" },
  sugar: { icon: "cube", color: colors.red, label: "Sugar" },
  protein: { icon: "leaf", color: colors.green, label: "Protein" },
};

type Props = {
  kind: MacroKind;
  value: string;
  /**
   * card  = white card with icon, value and label (scanner screen)
   * stat  = compact icon-above-value column (last-scans rail)
   * pill  = small cream pill with icon + value (ingredient rows)
   */
  variant?: "card" | "stat" | "pill";
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function MacroChip({ kind, value, variant = "stat", label, style }: Props) {
  const meta = MACRO_META[kind];
  if (variant === "card") {
    return (
      <View style={[styles.card, style]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label ?? meta.label}</Text>
      </View>
    );
  }
  if (variant === "pill") {
    return (
      <View style={[styles.pill, style]}>
        <Ionicons name={meta.icon} size={11} color={meta.color} />
        <Text style={styles.pillValue}>{value}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.stat, style]}>
      <Ionicons name={meta.icon} size={15} color={meta.color} />
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 5,
    ...shadows.card,
  },
  cardValue: { fontSize: 15, fontWeight: "800", color: colors.ink },
  cardLabel: { fontSize: 11, fontWeight: "600", color: colors.muted },

  stat: { alignItems: "center", gap: 5, minWidth: 44 },
  statValue: { fontSize: 12, fontWeight: "700", color: colors.ink },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.canvas,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillValue: { fontSize: 10.5, fontWeight: "700", color: colors.ink },
});
