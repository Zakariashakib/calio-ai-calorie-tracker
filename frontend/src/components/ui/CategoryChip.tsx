import { Image, StyleSheet, Text } from "react-native";

import { PressableScale } from "@/src/components/PressableScale";
import { colors, shadows } from "@/src/theme";

type Props = {
  label: string;
  imageUri: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
};

/** White rounded category tile with a food thumbnail (recipes screen). */
export function CategoryChip({ label, imageUri, active = false, onPress, testID }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.chip, active && styles.active]}
      testID={testID}
    >
      <Image source={{ uri: imageUri }} style={styles.image} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 72,
    paddingVertical: 9,
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...shadows.subtle,
  },
  active: { borderColor: colors.dark },
  image: { width: 44, height: 44, borderRadius: 13 },
  label: { fontSize: 11, fontWeight: "600", color: colors.muted },
  labelActive: { color: colors.ink, fontWeight: "700" },
});
