/**
 * DEV-ONLY: Temporary email/password login card for development & testing.
 *
 * REMOVE THIS ENTIRE FILE BEFORE PRODUCTION — see the
 * "Temporary Development Login" section in replit.md for the removal checklist.
 *
 * The card renders nothing unless the backend reports the dev login as
 * enabled (GET /api/auth/dev/status), which is never the case in a Replit
 * production deployment.
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";

import { API_BASE } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius } from "@/src/theme";

const AMBER = "#B8860B";
const AMBER_BG = "#FBF4DF";
const AMBER_BORDER = "#E5CE8F";

export function DevLoginCard() {
  const { devSignIn } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/api/auth/dev/status`)
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d: { enabled?: boolean }) => {
        if (mounted) setEnabled(Boolean(d.enabled));
      })
      .catch(() => {
        if (mounted) setEnabled(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!enabled || !devSignIn) return null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await devSignIn(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Development sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <PressableScale
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        testID="dev-login-toggle"
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEVELOPMENT ONLY</Text>
        </View>
        <Text style={styles.headerText}>Email / password sign-in</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={AMBER}
        />
      </PressableScale>

      {expanded ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            testID="dev-login-email-input"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.faint}
            secureTextEntry
            autoCapitalize="none"
            testID="dev-login-password-input"
          />
          {error ? (
            <Text style={styles.error} testID="dev-login-error-text">
              {error}
            </Text>
          ) : null}
          <PressableScale
            style={styles.submit}
            onPress={submit}
            disabled={busy}
            testID="dev-login-submit-button"
          >
            {busy ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitText}>Sign in (dev only)</Text>
            )}
          </PressableScale>
          <Text style={styles.note}>
            Temporary test login for development. Removed in production — only
            Google Sign-In ships.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    backgroundColor: AMBER_BG,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  badge: {
    backgroundColor: AMBER,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "white", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  headerText: { flex: 1, fontSize: 12, fontWeight: "600", color: AMBER },
  form: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  input: {
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    backgroundColor: "white",
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.ink,
  },
  error: { color: colors.red, fontSize: 12 },
  submit: {
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "white", fontSize: 13, fontWeight: "700" },
  note: { fontSize: 10, lineHeight: 14, color: AMBER },
});
