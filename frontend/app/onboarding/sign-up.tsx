import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { useOnboarding } from "@/src/onboarding-context";
import { api } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadows } from "@/src/theme";

export default function SignUpScreen() {
  const { signIn } = useAuth();
  const { data } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Authenticate (skipping redirect so we can save data first)
      await signIn({ skipRedirect: true });
      
      // 2. Save onboarding data
      await api("/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });

      // 3. Move to next step (Premium Upsell)
      router.replace("/onboarding/premium");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign up");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>ALMOST THERE</Text>
        <Text style={styles.title}>Save Your Profile</Text>
        <Text style={styles.subtitle}>Create an account to save your personalized plan and start tracking.</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.buttons}>
          <PressableScale style={styles.providerBtn} onPress={handleSignUp} disabled={loading}>
            <Ionicons name="logo-apple" size={22} color="white" />
            <Text style={styles.providerText}>Continue with Apple</Text>
          </PressableScale>

          <PressableScale style={[styles.providerBtn, styles.googleBtn]} onPress={handleSignUp} disabled={loading}>
            <Ionicons name="logo-google" size={22} color={colors.ink} />
            <Text style={[styles.providerText, styles.googleText]}>Continue with Google</Text>
          </PressableScale>

          <PressableScale style={[styles.providerBtn, styles.emailBtn]} onPress={handleSignUp} disabled={loading}>
            <Ionicons name="mail-outline" size={22} color={colors.ink} />
            <Text style={[styles.providerText, styles.emailText]}>Continue with Email</Text>
          </PressableScale>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading && <ActivityIndicator size="large" color={colors.peach} style={{ marginTop: 20 }} />}
      </View>

      <Text style={styles.legal}>By continuing, you agree to our Terms and Privacy Policy.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 20, gap: 8, alignItems: "center" },
  kicker: { fontSize: 11, fontWeight: "800", color: colors.peach, letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  buttons: { gap: 16 },
  providerBtn: { height: 58, backgroundColor: "black", borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, ...shadows.subtle },
  providerText: { color: "white", fontSize: 16, fontWeight: "700" },
  googleBtn: { backgroundColor: "white", borderWidth: 1, borderColor: "#E4E0D6" },
  googleText: { color: colors.ink },
  emailBtn: { backgroundColor: colors.surface },
  emailText: { color: colors.ink },
  errorText: { color: colors.red, textAlign: "center", marginTop: 20 },
  legal: { fontSize: 12, color: colors.faint, textAlign: "center", padding: 24 },
});
