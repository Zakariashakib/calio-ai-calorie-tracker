import { StyleSheet, View } from "react-native";

import { colors } from "@/src/theme";

/** Vertical rounded bars indicating recipe difficulty (reference recipe card). */
export function DifficultyDots({ level, total = 4 }: { level: number; total?: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[styles.bar, { backgroundColor: index < level ? colors.peach : colors.arcTrack }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  bar: { width: 11, height: 20, borderRadius: 5.5 },
});
