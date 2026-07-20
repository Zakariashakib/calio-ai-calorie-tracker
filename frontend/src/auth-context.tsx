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
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
      setUser(null);
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

  const signIn = useCallback(async () => {
    setError(null);
    const redirectUrl = Platform.OS === "web" && typeof window !== "undefined" ? `${window.location.origin}/` : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === "success") {
      const sessionId = sessionIdFrom(result.url);
      if (sessionId) await exchange(sessionId);
    }
  }, [exchange]);

  const signOut = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST", body: "{}" }); } catch { /* local logout still succeeds */ }
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
    router.replace("/");
  }, []);

  const value = useMemo(() => ({ user, loading, error, signIn, signOut, refreshUser }), [user, loading, error, signIn, signOut, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}
