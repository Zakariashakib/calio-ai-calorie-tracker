import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { colors } from "@/src/theme";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.green} /></View>;
  if (!user) return <Redirect href="/" />;
  if (!user.onboarding_complete) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: "#989D94",
        tabBarStyle: { height: 66 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.surface, borderTopWidth: 0 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarButtonTestID: "tab-today", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} color={color} size={22} /> }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarButtonTestID: "tab-history", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "time" : "time-outline"} color={color} size={22} /> }} />
      <Tabs.Screen name="scan" options={{ title: "Scan", tabBarButtonTestID: "tab-scan", tabBarIcon: ({ color }) => <View style={styles.scan}><Ionicons name="scan" color="white" size={23} /></View> }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarButtonTestID: "tab-insights", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} color={color} size={21} /> }} />
      <Tabs.Screen name="coach" options={{ title: "Coach", tabBarButtonTestID: "tab-coach", tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "sparkles" : "sparkles-outline"} color={color} size={21} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  scan: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.peach, alignItems: "center", justifyContent: "center", marginTop: -16 },
});
