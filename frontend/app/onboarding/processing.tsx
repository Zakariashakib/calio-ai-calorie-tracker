import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors } from "@/src/theme";

export default function ProcessingScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/onboarding/results");
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.peach} />
      <Text style={styles.title}>We're preparing your personalized plan...</Text>
      <Text style={styles.subtitle}>Calculating BMI, BMR, and macro targets.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
  },
});
