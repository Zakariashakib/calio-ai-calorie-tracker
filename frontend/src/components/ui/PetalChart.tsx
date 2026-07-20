import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Image, Platform, StyleSheet, Text, View } from "react-native";

import { colors, shadows } from "@/src/theme";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export type Petal = { label: string; pct: number };

type Props = {
  petals: Petal[];
  /** data-uri or remote uri for the central dish photo */
  imageUri?: string;
  size?: number;
  testID?: string;
  imageTestID?: string;
};

/**
 * Flower/petal ingredient visualization from the reference food-detail
 * screen: white petals fanned around a central dish photo with a warm
 * orange glow. Petal gradients always warm toward the center because the
 * gradient is applied before rotation.
 */
export function PetalChart({ petals, imageUri, size = 330, testID, imageTestID }: Props) {
  const count = Math.max(petals.length, 1);
  const orbit = size * 0.30;
  const petalW = Math.min(102, size * 0.31);
  const petalH = Math.min(124, size * 0.375);
  const box = orbit * 2 + petalH + 8;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [anim, count]);

  return (
    <View style={[styles.wrap, { width: box, height: box }]} testID={testID}>
      {/* Warm radial glow behind everything */}
      <View style={[styles.glow, { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31 }]} />
      <View style={[styles.glowInner, { width: size * 0.44, height: size * 0.44, borderRadius: size * 0.22 }]} />

      {petals.map((petal, index) => {
        const deg = (index * 360) / count;
        return (
          <Animated.View
            key={`${petal.label}-${index}`}
            style={[
              styles.petal,
              {
                width: petalW,
                height: petalH,
                borderRadius: petalW / 2,
                opacity: anim,
                transform: [
                  { rotate: `${deg}deg` },
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-orbit * 0.6, -orbit - petalH * 0.18],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={["#FFFFFF", "#FFFFFF", colors.peachSoft]}
              locations={[0, 0.55, 1]}
              style={[styles.petalFill, { borderRadius: petalW / 2 }]}
            />
            <View style={{ transform: [{ rotate: `${-deg}deg` }] }}>
              <Text style={styles.pct}>{petal.pct.toFixed(1)}%</Text>
              <Text style={styles.label} numberOfLines={1}>
                {petal.label}
              </Text>
            </View>
          </Animated.View>
        );
      })}

      {/* Central dish */}
      <View style={styles.centerRing}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.centerImage}
            resizeMode="cover"
            testID={imageTestID}
          />
        ) : (
          <View style={[styles.centerImage, styles.centerFallback]} testID={imageTestID} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  glow: { position: "absolute", backgroundColor: colors.peach, opacity: 0.22 },
  glowInner: { position: "absolute", backgroundColor: colors.peach, opacity: 0.3 },
  petal: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadows.card,
  },
  petalFill: { ...StyleSheet.absoluteFillObject },
  pct: { fontSize: 15, fontWeight: "800", color: colors.ink, textAlign: "center" },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
    maxWidth: 82,
    marginTop: 1,
  },
  centerRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.floating,
  },
  centerImage: { width: 102, height: 102, borderRadius: 51 },
  centerFallback: { backgroundColor: colors.peachSoft },
});
