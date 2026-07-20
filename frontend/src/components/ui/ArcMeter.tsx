import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

import { colors } from "@/src/theme";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

type Props = {
  /** 0..1 share of the goal reached */
  progress: number;
  date: string;
  kcal: number;
  goalLabel: string;
  size?: number;
  segments?: number;
  testID?: string;
};

/**
 * Segmented half-arc calorie meter from the reference dashboard:
 * rounded segments fanned over 180°, filled in salmon-orange.
 * Pure View transforms — no SVG dependency, 60fps-friendly.
 */
export function ArcMeter({
  progress,
  date,
  kcal,
  goalLabel,
  size = 300,
  segments = 13,
  testID,
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const filled = Math.round(clamped * segments);
  const radiusPx = size * 0.36;
  const segWidth = Math.max(18, Math.round((Math.PI * radiusPx) / segments) - 7);
  const segHeight = Math.round(segWidth * 1.85);
  const height = radiusPx + segHeight / 2 + 4;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 650, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [anim, filled]);

  return (
    <View style={{ alignItems: "center" }} testID={testID}>
      <View style={{ width: size, height, alignItems: "center", justifyContent: "flex-end" }}>
        {Array.from({ length: segments }).map((_, index) => {
          const deg = -90 + ((index + 0.5) * 180) / segments;
          const isFilled = index < filled;
          const opacity = isFilled
            ? anim.interpolate({
                inputRange: [
                  Math.min(0.85, (index / Math.max(filled, 1)) * 0.85),
                  Math.min(1, (index / Math.max(filled, 1)) * 0.85 + 0.15),
                ],
                outputRange: [0.25, 1],
                extrapolate: "clamp",
              })
            : 1;
          return (
            <Animated.View
              key={index}
              style={[
                styles.segment,
                {
                  width: segWidth,
                  height: segHeight,
                  borderRadius: segWidth / 2,
                  bottom: -segHeight / 2,
                  backgroundColor: isFilled ? colors.peach : colors.arcTrack,
                  opacity,
                  transform: [{ rotate: `${deg}deg` }, { translateY: -radiusPx }],
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.center}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.kcal}>{kcal} kcal</Text>
        <Text style={styles.goal}>{goalLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { position: "absolute" },
  center: { alignItems: "center", gap: 2, marginTop: -34 },
  date: { fontSize: 13, fontWeight: "600", color: colors.muted },
  kcal: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8, color: colors.ink },
  goal: { fontSize: 13, fontWeight: "700", color: colors.peach },
});
