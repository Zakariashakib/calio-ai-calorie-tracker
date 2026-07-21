import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import {
  SafeAreaProvider,
} from "react-native-safe-area-context";

import {
  useIconFonts,
} from "@/src/hooks/use-icon-fonts";
import {
  AuthProvider,
} from "@/src/auth-context";
import { OnboardingProvider } from "@/src/onboarding-context";

// Keep the native splash visible until icon fonts register.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] =
    useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OnboardingProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
            }}
          />
        </OnboardingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
