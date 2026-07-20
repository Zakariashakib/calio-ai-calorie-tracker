import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, shadow } from "@/src/theme";

export function Toast({ visible, message, error = false, onClose }: { visible: boolean; message: string; error?: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, 2600);
    return () => clearTimeout(timer);
  }, [visible, message, onClose]);

  if (!visible) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View pointerEvents="box-none" style={[styles.layer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.toast} testID="app-toast">
          <Ionicons name={error ? "alert-circle" : "checkmark-circle"} size={22} color={error ? colors.red : colors.green} />
          <Text style={styles.text}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 20 },
  toast: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.dark, padding: 16, borderRadius: radius.md, ...shadow },
  text: { color: "white", fontSize: 14, fontWeight: "600", flex: 1 },
});
