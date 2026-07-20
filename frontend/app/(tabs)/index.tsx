import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { ArcMeter } from "@/src/components/ui/ArcMeter";
import { IconButton } from "@/src/components/ui/IconButton";
import { foodVisual } from "@/src/food-visuals";
import { RECIPES } from "@/src/recipes-data";
import { colors, radius, shadows } from "@/src/theme";
import type { Dashboard, Meal } from "@/src/types";

export default function TodayScreen() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<Dashboard>("/dashboard"));
      setError(false);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not load today");
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const addWater = async () => {
    try {
      await api("/water", { method: "POST", body: JSON.stringify({ amount_ml: 250 }) });
      setMessage("250 ml water added");
      setError(false);
      await load();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not add water");
      setError(true);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={colors.peach} />
        <Text style={styles.mutedText}>Building today&apos;s picture…</Text>
      </SafeAreaView>
    );
  }

  const dashboard = data!;
  const goalCalories = Math.max(dashboard.goals.calories, 1);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header} testID="today-sticky-header">
        <IconButton
          icon="calendar-clear-outline"
          onPress={() => router.push("/challenges")}
          testID="open-challenges-button"
        />
        <Text style={styles.headerTitle}>Dashboard</Text>
        <IconButton
          icon="notifications-outline"
          badge
          onPress={() => router.push("/reminders")}
          testID="open-reminders-button"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.peach} />
        }
      >
        <View testID="daily-calorie-progress-card">
          <ArcMeter
            progress={dashboard.totals.calories / goalCalories}
            date={dayjs().format("D MMM")}
            kcal={Math.round(dashboard.totals.calories)}
            goalLabel={`Goal ${dashboard.goals.calories} kcal`}
          />
        </View>

        <PressableScale
          style={styles.addPill}
          onPress={() => router.push("/(tabs)/scan")}
          testID="dashboard-add-meal-button"
        >
          <Ionicons name="add" size={22} color={colors.ink} />
        </PressableScale>

        {dashboard.meals.length ? (
          dashboard.meals.map((meal) => (
            <MealCard key={meal.meal_id} meal={meal} goalCalories={goalCalories} />
          ))
        ) : (
          <PressableScale
            style={styles.empty}
            onPress={() => router.push("/(tabs)/scan")}
            testID="empty-scan-meal-button"
          >
            <Ionicons name="camera-outline" size={25} color={colors.peach} />
            <Text style={styles.emptyTitle}>No meals yet</Text>
            <Text style={styles.mutedText}>Snap your first meal in seconds.</Text>
          </PressableScale>
        )}

        {/* Water tracker */}
        <View style={styles.waterCard}>
          <View style={styles.waterIcon}>
            <Ionicons name="water" size={19} color={colors.blue} />
          </View>
          <View style={styles.waterCopy}>
            <Text style={styles.waterTitle}>Water</Text>
            <Text style={styles.waterValue}>
              {(dashboard.water_ml / 1000).toFixed(1)}
              <Text style={styles.waterGoal}> / {(dashboard.goals.water_ml / 1000).toFixed(1)} L</Text>
            </Text>
          </View>
          <View style={styles.waterTrack}>
            <View
              style={[
                styles.waterFill,
                {
                  width: `${Math.min(100, (dashboard.water_ml / Math.max(dashboard.goals.water_ml, 1)) * 100)}%`,
                },
              ]}
            />
          </View>
          <PressableScale style={styles.waterAdd} onPress={addWater} testID="add-water-button">
            <Ionicons name="add" size={18} color="white" />
          </PressableScale>
        </View>

        {/* Recipes teaser */}
        <PressableScale
          style={styles.recipesCard}
          onPress={() => router.push("/recipes")}
          testID="open-recipes-button"
        >
          <View style={styles.recipeThumbs}>
            {RECIPES.slice(0, 3).map((recipe, index) => (
              <Image
                key={recipe.id}
                source={{ uri: recipe.image }}
                style={[styles.recipeThumb, { marginLeft: index === 0 ? 0 : -12 }]}
              />
            ))}
          </View>
          <View style={styles.recipesCopy}>
            <View style={styles.recipesTitleRow}>
              <Text style={styles.recipesTitle}>Trending Recipes</Text>
              <View style={styles.recipesBadge}>
                <Text style={styles.recipesBadgeText}>{RECIPES.length}</Text>
              </View>
            </View>
            <Text style={styles.recipesSub}>Fresh ideas matched to your goals</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.faint} />
        </PressableScale>

        {/* Quick shortcuts */}
        <View style={styles.shortcutRow}>
          <Shortcut icon="trophy-outline" label="Challenges" onPress={() => router.push("/challenges")} testID="open-challenges-shortcut" />
          <Shortcut icon="scale-outline" label="Weight" onPress={() => router.push("/weight")} testID="open-weight-shortcut" />
          <Shortcut icon="timer-outline" label="Fasting" onPress={() => router.push("/fasting")} testID="open-fasting-shortcut" />
        </View>

        {dashboard.suggestions.length ? (
          <PressableScale
            style={styles.coachCard}
            onPress={() => router.push("/(tabs)/coach")}
            testID="daily-ai-suggestion-card"
          >
            <View style={styles.sparkle}>
              <Ionicons name="sparkles" size={17} color={colors.peach} />
            </View>
            <Text style={styles.coachText} numberOfLines={2}>
              {dashboard.suggestions[0]}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.faint} />
          </PressableScale>
        ) : null}
      </ScrollView>

      <Toast visible={Boolean(message)} message={message} error={error} onClose={() => setMessage("")} />
    </SafeAreaView>
  );
}

function MealCard({ meal, goalCalories }: { meal: Meal; goalCalories: number }) {
  const visual = foodVisual(meal.title, meal.meal_type);
  const percent = Math.round((meal.totals.calories / goalCalories) * 100);
  return (
    <View style={styles.mealCard} testID={`today-meal-${meal.meal_id}`}>
      <View style={styles.mealTop}>
        {meal.thumbnail_base64 ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${meal.thumbnail_base64}` }}
            style={styles.mealThumb}
          />
        ) : (
          <View style={[styles.mealThumb, styles.mealThumbFallback, { backgroundColor: visual.soft }]}>
            <Ionicons name={visual.icon} size={24} color={visual.color} />
          </View>
        )}
        <View style={styles.mealCopy}>
          <Text style={styles.mealName}>{meal.meal_type}</Text>
          <Text style={styles.mealTime}>{dayjs(meal.eaten_at).format("hh:mm A")}</Text>
        </View>
        <View style={styles.mealKcalWrap}>
          <Text style={styles.mealKcal}>{Math.round(meal.totals.calories)} kcal</Text>
          <Text style={styles.mealPercent}>{percent}% of goal</Text>
        </View>
      </View>
      <View style={styles.mealBottom}>
        <MacroColumn label="Protein" value={meal.totals.protein_g} />
        <MacroColumn label="Carbs" value={meal.totals.carbs_g} />
        <MacroColumn label="Fat" value={meal.totals.fat_g} />
        <PressableScale
          style={styles.editButton}
          onPress={() => router.push({ pathname: "/meal/[id]", params: { id: meal.meal_id } })}
          testID={`edit-meal-${meal.meal_id}`}
        >
          <Ionicons name="pencil" size={14} color={colors.ink} />
        </PressableScale>
      </View>
    </View>
  );
}

function MacroColumn({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macroCol}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{Math.round(value)}g</Text>
    </View>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale style={styles.shortcut} onPress={onPress} testID={testID}>
      <Ionicons name={icon} size={20} color={colors.ink} />
      <Text style={styles.shortcutLabel}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  loading: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  mutedText: { color: colors.muted, fontSize: 13 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },

  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40, gap: 14 },

  addPill: {
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.subtle,
  },

  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    gap: 14,
    ...shadows.card,
  },
  mealTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealThumb: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  mealThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  mealCopy: { flex: 1, gap: 2 },
  mealName: { fontSize: 17, fontWeight: "800", color: colors.ink },
  mealTime: { fontSize: 12, fontWeight: "500", color: colors.muted },
  mealKcalWrap: { alignItems: "flex-end", gap: 2 },
  mealKcal: { fontSize: 17, fontWeight: "800", color: colors.ink },
  mealPercent: { fontSize: 11, fontWeight: "700", color: colors.peach },
  mealBottom: { flexDirection: "row", alignItems: "center" },
  macroCol: { flex: 1, gap: 2 },
  macroLabel: { fontSize: 11, fontWeight: "500", color: colors.muted },
  macroValue: { fontSize: 13, fontWeight: "700", color: colors.ink },
  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: {
    minHeight: 170,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.card,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },

  waterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    ...shadows.card,
  },
  waterIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E7F1F9",
    alignItems: "center",
    justifyContent: "center",
  },
  waterCopy: { gap: 1 },
  waterTitle: { fontSize: 13, fontWeight: "700", color: colors.ink },
  waterValue: { fontSize: 15, fontWeight: "800", color: colors.ink },
  waterGoal: { fontSize: 12, fontWeight: "500", color: colors.muted },
  waterTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.arcTrack,
    overflow: "hidden",
    marginLeft: 4,
  },
  waterFill: { height: 7, borderRadius: 4, backgroundColor: colors.blue },
  waterAdd: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },

  recipesCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    ...shadows.card,
  },
  recipeThumbs: { flexDirection: "row" },
  recipeThumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  recipesCopy: { flex: 1, gap: 2 },
  recipesTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  recipesTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  recipesBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  recipesBadgeText: { fontSize: 10, fontWeight: "800", color: "white" },
  recipesSub: { fontSize: 11, fontWeight: "500", color: colors.muted },

  shortcutRow: { flexDirection: "row", gap: 10 },
  shortcut: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
    ...shadows.subtle,
  },
  shortcutLabel: { fontSize: 11, fontWeight: "700", color: colors.ink },

  coachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    ...shadows.subtle,
  },
  sparkle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  coachText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500", color: colors.ink },
});
