import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { api, API_BASE, TOKEN_KEY } from "@/src/api";
import type { User } from "@/src/types";
import { storage } from "@/src/utils/storage";

type AuthValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (options?: { skipRedirect?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** DEV-ONLY: temporary email/password login — remove before production (see replit.md). */
  devSignIn?: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function sessionIdFrom(url: string): string | null {
  const query = url.split("?")[1]?.split("#")[0] ?? "";
  const hash = url.split("#")[1] ?? "";
  return new URLSearchParams(hash).get("session_id") ?? new URLSearchParams(query).get("session_id");
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const exchange = useCallback(async (sessionId: string) => {
    const response = await fetch(`${API_BASE}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (!response.ok) throw new Error("Google sign-in could not be completed");
    const data = (await response.json()) as { user: User; session_token: string };
    await storage.secureSet(TOKEN_KEY, data.session_token);
    setUser(data.user);
    router.replace(data.user.onboarding_complete ? "/(tabs)" : "/onboarding");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api<User>("/auth/me");
      setUser(me);
    } catch {
      // DEV: Try reading user from local storage when backend is unavailable
      try {
        const saved = await storage.getItem("mock_user", null);
        if (saved && typeof saved === "string") {
          setUser(JSON.parse(saved));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const sessionId = sessionIdFrom(window.location.href);
          if (sessionId) {
            try {
              await exchange(sessionId);
              return;
            } catch {
              const token = await storage.secureGet(TOKEN_KEY, null);
              if (token) {
                await refreshUser();
                return;
              }
              setError("This sign-in link expired. Please try Google sign-in again.");
            } finally {
              window.history.replaceState(null, "", window.location.pathname);
            }
            return;
          }
        } else {
          const initial = await Linking.getInitialURL();
          const sessionId = initial ? sessionIdFrom(initial) : null;
          if (sessionId) {
            try {
              await exchange(sessionId);
              return;
            } catch {
              // Ignore invalid session and fall through to token check
            }
          }
        }
        const token = await storage.secureGet(TOKEN_KEY, null);
        if (token) await refreshUser();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Sign-in failed");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
    const listener = Platform.OS === "web" ? null : Linking.addEventListener("url", ({ url }) => {
      const sessionId = sessionIdFrom(url);
      if (sessionId) exchange(sessionId).catch(() => setError("Sign-in failed"));
    });
    return () => listener?.remove();
  }, [exchange, refreshUser]);

  const signIn = useCallback(async (options?: { skipRedirect?: boolean }) => {
    setError(null);
    try {
      // DEV: Check if user already completed onboarding previously
      const saved = await storage.getItem("mock_user", null);
      if (saved && typeof saved === "string") {
        const existingUser: User = JSON.parse(saved);
        await storage.secureSet(TOKEN_KEY, "mock_token");
        setUser(existingUser);
        if (!options?.skipRedirect) {
          router.replace(existingUser.onboarding_complete ? "/(tabs)" : "/onboarding/welcome");
        }
      } else {
        // New user → go through onboarding
        const mockUser: User = {
          user_id: "mock_123",
          email: "test@example.com",
          name: "",
          onboarding_complete: false,
        };
        await storage.secureSet(TOKEN_KEY, "mock_token");
        await storage.setItem("mock_user", JSON.stringify(mockUser));
        setUser(mockUser);
        if (!options?.skipRedirect) {
          router.replace("/onboarding/welcome");
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed");
    }
  }, []);

  const signOut = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST", body: "{}" }); } catch { /* local logout still succeeds */ }
    await storage.secureRemove(TOKEN_KEY);
    await storage.removeItem("mock_user");
    await storage.removeItem("mock_profile");
    setUser(null);
    router.replace("/");
  }, []);

  // DEV-ONLY-START: temporary email/password login for development & testing.
  // Remove this block, the devSignIn type above, and its usage in the value
  // memo below before production (see replit.md removal checklist).
  const devSignIn = useCallback(async (email: string, password: string, options?: { skipRedirect?: boolean }) => {
    setError(null);
    const response = await fetch(`${API_BASE}/api/auth/dev/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { detail?: string };
      throw new Error(body.detail ?? "Development sign-in failed");
    }
    const data = (await response.json()) as { user: User; session_token: string };
    await storage.secureSet(TOKEN_KEY, data.session_token);
    setUser(data.user);
    if (!options?.skipRedirect) {
      router.replace(data.user.onboarding_complete ? "/(tabs)" : "/onboarding/welcome");
    }
  }, []);
  // DEV-ONLY-END

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut, refreshUser, devSignIn }),
    [user, loading, error, signIn, signOut, refreshUser, devSignIn],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}
