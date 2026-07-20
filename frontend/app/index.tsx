import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { DevLoginCard } from "@/src/components/DevLoginCard"; // DEV-ONLY: remove before production (see replit.md)
import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadows } from "@/src/theme";

const HERO_URI =
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1100&q=80";

function KcalTag({ label, style }: { label: string; style: object }) {
  return (
    <View style={[styles.tagWrap, style]}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
      <View style={styles.tagLine} />
    </View>
  );
}

export default function Index() {
  const { user, loading, signIn, error } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.onboarding_complete ? "/(tabs)" : "/onboarding");
    }
  }, [loading, user]);

  return (
    <View style={styles.container}>
      {/* Food hero with floating kcal callouts */}
      <View style={styles.heroWrap} testID="welcome-ai-visual">
        <Image source={{ uri: HERO_URI }} style={styles.hero} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(243,240,234,0)", "rgba(243,240,234,0)", colors.canvas]}
          locations={[0, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
        <KcalTag label="170 kcal" style={{ left: "9%", top: "24%" }} />
        <KcalTag label="90 kcal" style={{ left: "42%", top: "38%" }} />
        <KcalTag label="110 kcal" style={{ right: "10%", top: "20%" }} />
      </View>

      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.copy}>
          <Text style={styles.title}>Your Food,{"\n"}Decoded By AI</Text>
          <Text style={styles.subtitle}>
            From scanning to tracking – everything{"\n"}happens automatically.
          </Text>
        </View>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {error ? (
          <Text style={styles.error} testID="login-error-text">
            {error}
          </Text>
        ) : null}

        <PressableScale
          style={styles.button}
          onPress={signIn}
          disabled={loading}
          testID="google-login-button"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
        </PressableScale>

        <Text style={styles.legal}>
          Signs you in with Google. Estimates are informational guidance.
        </Text>

        {/* DEV-ONLY: temporary test login — remove before production (see replit.md) */}
        <DevLoginCard />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  heroWrap: { height: "52%", width: "100%" },
  hero: { width: "100%", height: "100%" },

  tagWrap: { position: "absolute", alignItems: "center" },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...shadows.floating,
  },
  tagText: { fontSize: 13, fontWeight: "700", color: colors.ink },
  tagLine: { width: 1, height: 46, backgroundColor: "rgba(255,255,255,0.85)" },

  safe: { flex: 1, paddingHorizontal: 24, paddingBottom: 14 },
  copy: { alignItems: "center", gap: 14, marginTop: 6 },
  title: {
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.8,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: "center" },

  dots: { flexDirection: "row", gap: 6, alignSelf: "center", marginTop: 18 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D8D4CC" },
  dotActive: { width: 18, borderRadius: 3, backgroundColor: colors.dark },

  error: { color: colors.red, textAlign: "center", fontSize: 13, marginTop: 10 },

  button: {
    height: 58,
    backgroundColor: colors.dark,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },

  legal: { fontSize: 11, lineHeight: 16, color: colors.faint, textAlign: "center", marginTop: 12 },
});
