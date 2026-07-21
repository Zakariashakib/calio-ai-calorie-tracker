import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadow } from "@/src/theme";

export default function ShopScreen() {
  return (
    <AppScreen testID="shop-screen">
      <View style={styles.header}>
        <PressableScale style={styles.back} onPress={() => router.back()} testID="shop-back-button">
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </PressableScale>
        <Text style={styles.headerTitle}>Shop</Text>
        <View style={styles.back} />
      </View>
      <View style={styles.content}>
        <Ionicons name="cart-outline" size={48} color={colors.peach} />
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>Our shop is under construction.</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 100 },
  title: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14 },
});
