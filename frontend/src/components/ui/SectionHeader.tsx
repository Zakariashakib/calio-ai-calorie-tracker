import { StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/src/components/PressableScale";
import { colors } from "@/src/theme";

type Props = {
  title: string;
  badge?: number;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
};

/** "Trending Recipes (8)   See All" style section header. */
export function SectionHeader({ title, badge, actionLabel, onAction, testID }: Props) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {badge != null ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {actionLabel ? (
        <PressableScale onPress={onAction} hitSlop={10}>
          <Text style={styles.action}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, color: colors.ink },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: "white" },
  action: { fontSize: 13, fontWeight: "600", color: colors.muted },
});
