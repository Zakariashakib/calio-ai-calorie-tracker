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

/** Build an authenticated URL for image endpoints (Image tags cannot send headers). */
export async function authedMediaUrl(path: string): Promise<string> {
  const token = await storage.secureGet(TOKEN_KEY, null);
  return `${API_BASE}/api${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
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
  try {
    const response = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) await storage.secureRemove(TOKEN_KEY);
      throw new ApiError(response.status, body.detail ?? "Something went wrong");
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    
    console.warn(`[DEV] Mocking response for ${path} due to fetch error`);

    // --- /profile PUT: save onboarding data locally & mark user as onboarded ---
    if (path === "/profile" && options.method === "PUT") {
      const profileData = typeof options.body === "string" ? JSON.parse(options.body) : {};
      await storage.setItem("mock_profile", JSON.stringify(profileData));
      // Update mock user: set name + mark onboarding complete
      const savedUser = await storage.getItem("mock_user", null);
      const user = savedUser && typeof savedUser === "string" ? JSON.parse(savedUser) : { user_id: "mock_123", email: "test@example.com", name: "", onboarding_complete: false };
      user.name = profileData.name || user.name;
      user.onboarding_complete = true;
      await storage.setItem("mock_user", JSON.stringify(user));
      return { ok: true } as any;
    }

    // --- /auth/me: return stored user ---
    if (path === "/auth/me") {
      const savedUser = await storage.getItem("mock_user", null);
      if (savedUser && typeof savedUser === "string") return JSON.parse(savedUser) as any;
      throw new Error("Not logged in");
    }

    // --- /dashboard: generate personalized data from stored profile ---
    if (path.startsWith("/dashboard")) {
      const savedProfile = await storage.getItem("mock_profile", null);
      const profile = savedProfile && typeof savedProfile === "string" ? JSON.parse(savedProfile) : null;
      
      let bmr = 1600, tdee = 2200, calGoal = 2200, proteinG = 130, carbsG = 220, fatG = 70;
      
      if (profile) {
        // Mifflin-St Jeor BMR calculation
        const weightKg = profile.weight_kg || 70;
        const heightCm = profile.height_cm || 170;
        const age = profile.age || 25;
        const isMale = profile.gender === "male";
        
        bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (isMale ? 5 : -161));
        
        const activityMultipliers: Record<string, number> = {
          "0–2": 1.2, "3–5": 1.55, "6+": 1.725,
        };
        tdee = Math.round(bmr * (activityMultipliers[profile.activity_level] || 1.55));
        
        // Adjust for goal
        if (profile.goal === "lose") calGoal = Math.round(tdee * 0.8);
        else if (profile.goal === "gain") calGoal = Math.round(tdee * 1.15);
        else calGoal = tdee;
        
        proteinG = Math.round(weightKg * 1.8);
        fatG = Math.round((calGoal * 0.25) / 9);
        carbsG = Math.round((calGoal - proteinG * 4 - fatG * 9) / 4);
      }
      
      return {
        date: new Date().toISOString(),
        totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },
        goals: { bmr, tdee, calories: calGoal, protein_g: proteinG, carbs_g: carbsG, fat_g: fatG, fiber_g: 30, water_ml: 2500 },
        water_ml: 0,
        meals: [],
        suggestions: [
          profile ? `Welcome ${profile.name}! Start logging your meals.` : "Scan your first meal to get started!",
          "Stay hydrated – tap + to log water.",
        ],
      } as any;
    }

    if (path.startsWith("/history")) return [] as any;
    if (path.startsWith("/recipes")) {
      return {
        categories: [
          { id: "All", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&q=80" },
          { id: "Breakfast", image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=100&q=80" },
          { id: "Lunch", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&q=80" },
          { id: "Dinner", image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=100&q=80" },
          { id: "Snack", image: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=100&q=80" },
        ],
        matched_to_goals: true,
        recipes: [
          {
            id: "r1",
            title: "Greek Yogurt Parfait",
            minutes: 5,
            difficulty: 1,
            difficulty_label: "Easy",
            kcal: 280,
            protein_g: 18,
            carbs_g: 35,
            fat_g: 8,
            fiber_g: 4,
            category: "Breakfast",
            image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
            saved: false,
          },
          {
            id: "r2",
            title: "Grilled Chicken Salad",
            minutes: 20,
            difficulty: 2,
            difficulty_label: "Medium",
            kcal: 420,
            protein_g: 38,
            carbs_g: 15,
            fat_g: 22,
            fiber_g: 6,
            category: "Lunch",
            image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
            saved: true,
          },
          {
            id: "r3",
            title: "Salmon with Roasted Vegetables",
            minutes: 35,
            difficulty: 2,
            difficulty_label: "Medium",
            kcal: 520,
            protein_g: 42,
            carbs_g: 28,
            fat_g: 26,
            fiber_g: 8,
            category: "Dinner",
            image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80",
            saved: false,
          },
          {
            id: "r4",
            title: "Avocado Toast with Egg",
            minutes: 10,
            difficulty: 1,
            difficulty_label: "Easy",
            kcal: 350,
            protein_g: 14,
            carbs_g: 30,
            fat_g: 20,
            fiber_g: 7,
            category: "Breakfast",
            image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80",
            saved: false,
          },
          {
            id: "r5",
            title: "Quinoa Buddha Bowl",
            minutes: 25,
            difficulty: 2,
            difficulty_label: "Medium",
            kcal: 480,
            protein_g: 22,
            carbs_g: 55,
            fat_g: 18,
            fiber_g: 12,
            category: "Lunch",
            image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
            saved: true,
          },
          {
            id: "r6",
            title: "Protein Energy Balls",
            minutes: 15,
            difficulty: 1,
            difficulty_label: "Easy",
            kcal: 180,
            protein_g: 10,
            carbs_g: 20,
            fat_g: 8,
            fiber_g: 3,
            category: "Snack",
            image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&q=80",
            saved: false,
          },
          {
            id: "r7",
            title: "Teriyaki Chicken Stir-fry",
            minutes: 30,
            difficulty: 2,
            difficulty_label: "Medium",
            kcal: 550,
            protein_g: 40,
            carbs_g: 45,
            fat_g: 18,
            fiber_g: 5,
            category: "Dinner",
            image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
            saved: false,
          },
          {
            id: "r8",
            title: "Overnight Oats",
            minutes: 5,
            difficulty: 1,
            difficulty_label: "Easy",
            kcal: 320,
            protein_g: 12,
            carbs_g: 50,
            fat_g: 8,
            fiber_g: 6,
            category: "Breakfast",
            image: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&q=80",
            saved: false,
          },
        ],
      } as any;
    }
    if (path.startsWith("/challenges")) return [] as any;
    if (path.startsWith("/weight")) return [] as any;
    if (path.startsWith("/fasting")) return { start_hour: 20, end_hour: 12, enabled: false } as any;
    if (path.startsWith("/reports/weekly")) return { series: [], average_calories: 0, average_protein_g: 0, average_water_ml: 0, weight_change_kg: 0, consistency_percent: 0 } as any;
    if (path.startsWith("/auth/")) return {} as any;
    if (path.startsWith("/coach")) return { reply: "I'm your AI nutrition coach! I can help once the backend is connected." } as any;
    
    return {} as any;
  }
}
