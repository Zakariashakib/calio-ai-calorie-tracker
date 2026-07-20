import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, ApiError } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { DifficultyDots } from "@/src/components/ui/DifficultyDots";
import { IconButton } from "@/src/components/ui/IconButton";
import { mapRecipeDetail, type RecipeDetail } from "@/src/recipes-data";
import { colors, radius, shadows } from "@/src/theme";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Parameters<typeof mapRecipeDetail>[0]>(`/recipes/${id}`)
      .then((data) => {
        if (active) setRecipe(mapRecipeDetail(data));
      })
      .catch((reason) => {
        if (active) setError(reason instanceof ApiError ? reason.message : "Could not load recipe");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const toggleSave = useCallback(async () => {
    if (!recipe) return;
    const next = !recipe.saved;
    setRecipe({ ...recipe, saved: next });
    try {
      await api("/recipes/bookmark", {
        method: "POST",
        body: JSON.stringify({ recipe_id: recipe.id, saved: next }),
      });
    } catch {
      setRecipe((r) => (r ? { ...r, saved: !next } : r));
    }
  }, [recipe]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.peach} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <IconButton icon="chevron-back" onPress={() => router.back()} testID="recipe-detail-back-button" />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.peach} />
          <Text style={styles.emptyText}>{error || "Recipe not found"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <IconButton icon="chevron-back" onPress={() => router.back()} testID="recipe-detail-back-button" />
          <PressableScale onPress={toggleSave} hitSlop={10} testID={`recipe-detail-save-${recipe.id}`}>
            <Ionicons
              name={recipe.saved ? "star" : "star-outline"}
              size={24}
              color={recipe.saved ? colors.yellow : colors.faint}
            />
          </PressableScale>
        </View>

        <Image source={{ uri: recipe.image }} style={styles.hero} resizeMode="cover" />

        <View style={styles.titleRow}>
          <Text style={styles.title}>{recipe.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.peach} />
              <Text style={styles.metaText}>{recipe.minutes} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaText}>{recipe.difficultyLabel}</Text>
              <DifficultyDots level={recipe.difficulty} />
            </View>
          </View>
          <Text style={styles.description}>{recipe.description}</Text>
        </View>

        <View style={styles.macroRow}>
          <Macro label="Calories" value={`${recipe.kcal}`} unit="kcal" />
          <Macro label="Protein" value={`${recipe.protein_g}`} unit="g" />
          <Macro label="Carbs" value={`${recipe.carbs_g}`} unit="g" />
          <Macro label="Fat" value={`${recipe.fat_g}`} unit="g" />
        </View>

        <Text style={styles.section}>Ingredients</Text>
        <View style={styles.card}>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <View style={styles.dot} />
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Steps</Text>
        <View style={styles.stepsWrap}>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Macro({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 44, gap: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: "center" },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hero: { width: "100%", height: 220, borderRadius: radius.lg },

  titleRow: { gap: 10 },
  title: { fontSize: 26, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  description: { fontSize: 15, lineHeight: 22, color: colors.muted },

  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    ...shadows.card,
  },
  macro: { alignItems: "center", gap: 2 },
  macroValue: { fontSize: 20, fontWeight: "900", color: colors.ink },
  macroUnit: { fontSize: 11, fontWeight: "700", color: colors.peach },
  macroLabel: { fontSize: 11, fontWeight: "600", color: colors.muted, marginTop: 2 },

  section: { fontSize: 20, fontWeight: "900", color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 12, ...shadows.card },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.peach },
  ingredientText: { flex: 1, fontSize: 15, color: colors.ink, fontWeight: "600" },

  stepsWrap: { gap: 14 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "white", fontSize: 14, fontWeight: "800" },
  stepText: { flex: 1, fontSize: 15, lineHeight: 23, color: colors.ink, fontWeight: "500" },
});
