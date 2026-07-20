import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { colors } from "@/src/theme";

const INACTIVE = "#83857F";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.peach} /></View>;
  if (!user) return <Redirect href="/" />;
  if (!user.onboarding_complete) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.peach,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.dark,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarButtonTestID: "tab-today",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarButtonTestID: "tab-history",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} color={color} size={21} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarButtonTestID: "tab-scan",
          tabBarIcon: () => (
            <View style={styles.scan}>
              <Ionicons name="scan" color={colors.dark} size={23} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarButtonTestID: "tab-insights",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "star" : "star-outline"} color={color} size={21} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarButtonTestID: "tab-coach",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
              color={color}
              size={21}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  scan: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
  },
});
