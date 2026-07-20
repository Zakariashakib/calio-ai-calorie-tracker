import Constants from "expo-constants";

import { storage } from "@/src/utils/storage";

export const TOKEN_KEY = "calsnap-session-token";
const configuredUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL as string | undefined;
export const API_BASE = configuredUrl ?? process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await storage.secureGet(TOKEN_KEY, null);
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  const response = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) await storage.secureRemove(TOKEN_KEY);
    throw new ApiError(response.status, body.detail ?? "Something went wrong");
  }
  return response.json() as Promise<T>;
}
