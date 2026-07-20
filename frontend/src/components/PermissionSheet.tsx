import { Ionicons } from "@expo/vector-icons";
import { Linking, Modal, StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius } from "@/src/theme";

export function PermissionSheet({ visible, kind, blocked, onContinue, onClose }: { visible: boolean; kind: "camera" | "microphone" | "notifications"; blocked: boolean; onContinue: () => void; onClose: () => void }) {
  const icon = kind === "camera" ? "camera" : kind === "microphone" ? "mic" : "notifications";
  const benefit = kind === "camera" ? "Scan meals and barcodes in seconds." : kind === "microphone" ? "Log a complete meal just by speaking." : "Stay on track with water and meal reminders.";
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID={`${kind}-permission-sheet`}>
          <View style={styles.icon}><Ionicons name={icon} size={28} color={colors.greenDark} /></View>
          <Text style={styles.title}>Allow {kind} access</Text>
          <Text style={styles.body}>{benefit} You can keep using the rest of CalSnap without it.</Text>
          <PressableScale style={styles.primary} onPress={blocked ? () => Linking.openSettings() : onContinue} testID={`${kind}-permission-continue-button`}>
            <Text style={styles.primaryText}>{blocked ? "Open Settings" : "Continue"}</Text>
          </PressableScale>
          <PressableScale style={styles.secondary} onPress={onClose} testID={`${kind}-permission-not-now-button`}>
            <Text style={styles.secondaryText}>Not now</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(10,12,9,0.35)", justifyContent: "flex-end" },
  sheet: { minHeight: "52%", backgroundColor: colors.canvas, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, alignItems: "center", gap: 16 },
  icon: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenSoft },
  title: { fontSize: 25, fontWeight: "800", color: colors.ink, marginTop: 8 },
  body: { fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: "center", maxWidth: 320 },
  primary: { height: 54, width: "100%", backgroundColor: colors.dark, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryText: { color: "white", fontSize: 16, fontWeight: "700" },
  secondary: { height: 48, justifyContent: "center" },
  secondaryText: { color: colors.muted, fontSize: 15, fontWeight: "600" },
});
