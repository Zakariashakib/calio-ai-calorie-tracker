import {
  Ionicons,
} from "@expo/vector-icons";
import {
  LinearGradient,
} from "expo-linear-gradient";
import {
  router,
} from "expo-router";
import {
  useEffect,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  PressableScale,
} from "@/src/components/PressableScale";
import {
  useAuth,
} from "@/src/auth-context";
import {
  colors,
  radius,
} from "@/src/theme";

export default function Index() {
  const {
    user,
    loading,
    signIn,
    error,
  } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(
        user.onboarding_complete
          ? "/(tabs)"
          : "/onboarding",
      );
    }
  }, [
    loading,
    user,
  ]);

  return (
    <LinearGradient
      colors={[
        "#EFF7DF",
        "#F4F1EC",
        "#FFE8DB",
      ]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons
              name="leaf"
              size={20}
              color="white"
            />
          </View>

          <Text style={styles.brand}>
            CalSnap
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />

          <View
            style={styles.plate}
            testID="welcome-ai-visual"
          >
            <View
              style={[
                styles.food,
                styles.foodOne,
              ]}
            />
            <View
              style={[
                styles.food,
                styles.foodTwo,
              ]}
            />
            <View
              style={[
                styles.food,
                styles.foodThree,
              ]}
            />

            <View
              style={styles.scanCornerOne}
            />
            <View
              style={styles.scanCornerTwo}
            />

            <View style={styles.calorieTag}>
              <Text
                style={styles.calorieText}
              >
                AI • 95%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>
            YOUR FOOD, DECODED
          </Text>

          <Text style={styles.title}>
            Nutrition clarity{"\n"}
            in one snap.
          </Text>

          <Text style={styles.subtitle}>
            Scan meals, understand every
            macro, and get coaching built
            around your goals.
          </Text>
        </View>

        {error ? (
          <Text
            style={styles.error}
            testID="login-error-text"
          >
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
            <ActivityIndicator
              color="white"
            />
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={19}
                color="white"
              />

              <Text
                style={styles.buttonText}
              >
                Continue with Google
              </Text>
            </>
          )}
        </PressableScale>

        <Text style={styles.legal}>
          By continuing, you agree to use
          estimates as informational guidance.
        </Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
  },
  hero: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  orbitLarge: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor:
      "rgba(185,234,104,0.23)",
  },
  orbitSmall: {
    position: "absolute",
    width: 205,
    height: 205,
    borderRadius: 110,
    borderWidth: 1,
    borderColor:
      "rgba(49,92,40,0.20)",
  },
  plate: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.greenDark,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.18,
    shadowRadius: 25,
    elevation: 8,
  },
  food: {
    position: "absolute",
    borderRadius: 999,
  },
  foodOne: {
    width: 115,
    height: 62,
    backgroundColor: colors.green,
    transform: [
      {
        rotate: "-18deg",
      },
    ],
  },
  foodTwo: {
    width: 78,
    height: 55,
    backgroundColor: colors.peach,
    left: 35,
    top: 45,
  },
  foodThree: {
    width: 72,
    height: 48,
    backgroundColor: colors.yellow,
    right: 28,
    bottom: 42,
  },
  scanCornerOne: {
    position: "absolute",
    left: 20,
    top: 20,
    width: 34,
    height: 34,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: colors.lime,
    borderTopLeftRadius: 12,
  },
  scanCornerTwo: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 34,
    height: 34,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: colors.lime,
    borderBottomRightRadius: 12,
  },
  calorieTag: {
    position: "absolute",
    right: -22,
    top: 35,
    borderRadius: radius.pill,
    backgroundColor: colors.dark,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  calorieText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  copy: {
    gap: 12,
    marginTop: 8,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    color: colors.greenDark,
    fontWeight: "800",
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.3,
    color: colors.ink,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 340,
  },
  button: {
    height: 58,
    backgroundColor: colors.dark,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: colors.red,
    textAlign: "center",
    fontSize: 13,
  },
  legal: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textAlign: "center",
    marginTop: 12,
  },
});
