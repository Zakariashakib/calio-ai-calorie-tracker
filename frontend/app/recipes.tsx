import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, ApiError } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { CategoryChip } from "@/src/components/ui/CategoryChip";
import { DifficultyDots } from "@/src/components/ui/DifficultyDots";
import { IconButton } from "@/src/components/ui/IconButton";
import { SearchBar } from "@/src/components/ui/SearchBar";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import {
  mapRecipe,
  type Recipe,
  type RecipeCategory,
  type RecipeListResponse,
} from "@/src/recipes-data";
import { colors, radius, shadows } from "@/src/theme";

export default function RecipesScreen() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [matched, setMatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (cat: string, q: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (cat && cat !== "All") params.set("category", cat);
      if (q.trim()) params.set("q", q.trim());
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const data = await api<RecipeListResponse>(`/recipes${suffix}`);
      setCategories(data.categories);
      setRecipes(data.recipes.map(mapRecipe));
      setMatched(data.matched_to_goals);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not load recipes");
    } finally {
      setLoading(false);
    }
  }, []);

  // React to category + debounced search changes.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(category, query), 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [category, query, load]);

  const toggleSave = useCallback(async (recipe: Recipe) => {
    const next = !recipe.saved;
    setRecipes((list) =>
      list.map((r) => (r.id === recipe.id ? { ...r, saved: next } : r)),
    );
    try {
      await api("/recipes/bookmark", {
        method: "POST",
        body: JSON.stringify({ recipe_id: recipe.id, saved: next }),
      });
    } catch {
      // Revert on failure so the star reflects real persisted state.
      setRecipes((list) =>
        list.map((r) => (r.id === recipe.id ? { ...r, saved: !next } : r)),
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <IconButton icon="chevron-back" onPress={() => router.back()} testID="recipes-back-button" />
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            style={styles.search}
            testID="recipes-search-input"
          />
          <IconButton icon="notifications-outline" badge testID="recipes-bell-button" />
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chips}
          testID="recipe-category-row"
        >
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.id}
              imageUri={cat.image}
              active={category === cat.id}
              onPress={() => setCategory(cat.id)}
              testID={`recipe-category-${cat.id.toLowerCase()}`}
            />
          ))}
        </ScrollView>

        <SectionHeader
          title={matched ? "Matched to Your Goals" : "Trending Recipes"}
          badge={recipes.length}
          actionLabel="See All"
        />

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.peach} />
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.peach} />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleSave={() => toggleSave(recipe)}
              onOpen={() => router.push(`/recipe/${recipe.id}`)}
            />
          ))
        )}

        {!loading && !error && recipes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={28} color={colors.peach} />
            <Text style={styles.emptyText}>No recipes match your search.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecipeCard({
  recipe,
  onToggleSave,
  onOpen,
}: {
  recipe: Recipe;
  onToggleSave: () => void;
  onOpen: () => void;
}) {
  return (
    <PressableScale style={styles.card} onPress={onOpen} testID={`recipe-card-${recipe.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{recipe.title}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color={colors.peach} />
            <Text style={styles.timeText}>{recipe.minutes} min</Text>
          </View>
        </View>
        <PressableScale
          onPress={onToggleSave}
          hitSlop={10}
          testID={`recipe-save-${recipe.id}`}
        >
          <Ionicons
            name={recipe.saved ? "star" : "star-outline"}
            size={22}
            color={recipe.saved ? colors.yellow : colors.faint}
          />
        </PressableScale>
      </View>

      <Image source={{ uri: recipe.image }} style={styles.cardImage} resizeMode="cover" />

      <View style={styles.cardFooter}>
        <View style={styles.difficulty}>
          <Text style={styles.difficultyLabel}>{recipe.difficultyLabel}</Text>
          <DifficultyDots level={recipe.difficulty} />
        </View>
        <Text style={styles.kcal}>{recipe.kcal} kcal</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 18 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  search: { flex: 1 },

  chipScroller: { marginHorizontal: -20, flexGrow: 0 },
  chips: { paddingHorizontal: 20, gap: 10 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
    ...shadows.card,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardHeaderText: { flex: 1, paddingRight: 12 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  timeText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  cardImage: { width: "100%", height: 190, borderRadius: radius.md },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  difficulty: { flexDirection: "row", alignItems: "center", gap: 10 },
  difficultyLabel: { fontSize: 13, fontWeight: "700", color: colors.ink },
  kcal: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4, color: colors.ink },

  empty: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
