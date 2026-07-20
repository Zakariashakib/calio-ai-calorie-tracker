import { Ionicons } from "@expo/vector-icons";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { PressableScale } from "@/src/components/PressableScale";
import { colors, shadows } from "@/src/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** square = white rounded square (default), circle = white circle, dark = translucent dark (camera overlays) */
  variant?: "square" | "circle" | "dark";
  size?: number;
  iconSize?: number;
  iconColor?: string;
  /** Small yellow notification dot */
  badge?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function IconButton({
  icon,
  onPress,
  variant = "square",
  size = 44,
  iconSize = 20,
  iconColor,
  badge = false,
  style,
  testID,
}: Props) {
  const shape =
    variant === "circle"
      ? { borderRadius: size / 2 }
      : { borderRadius: Math.round(size * 0.36) };
  const surface =
    variant === "dark"
      ? { backgroundColor: "rgba(20,21,19,0.55)" }
      : { backgroundColor: colors.surface, ...shadows.subtle };
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.base, { width: size, height: size }, shape, surface, style]}
      testID={testID}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={iconColor ?? (variant === "dark" ? "white" : colors.ink)}
      />
      {badge ? <View style={styles.badge} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
});
