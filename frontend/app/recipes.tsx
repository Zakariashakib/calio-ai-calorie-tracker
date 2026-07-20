import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/src/components/PressableScale";
import { CategoryChip } from "@/src/components/ui/CategoryChip";
import { DifficultyDots } from "@/src/components/ui/DifficultyDots";
import { IconButton } from "@/src/components/ui/IconButton";
import { SearchBar } from "@/src/components/ui/SearchBar";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { RECIPE_CATEGORIES, RECIPES, type Recipe } from "@/src/recipes-data";
import { colors, radius, shadows } from "@/src/theme";

export default function RecipesScreen() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const shown = useMemo(() => {
    const byCategory = category === "All" ? RECIPES : RECIPES.filter((r) => r.category === category);
    const trimmed = query.trim().toLowerCase();
    return trimmed ? byCategory.filter((r) => r.title.toLowerCase().includes(trimmed)) : byCategory;
  }, [category, query]);

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
          {RECIPE_CATEGORIES.map((cat) => (
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

        <SectionHeader title="Trending Recipes" badge={shown.length} actionLabel="See All" />

        {shown.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            saved={!!saved[recipe.id]}
            onToggleSave={() => setSaved((s) => ({ ...s, [recipe.id]: !s[recipe.id] }))}
          />
        ))}

        {shown.length === 0 ? (
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
  saved,
  onToggleSave,
}: {
  recipe: Recipe;
  saved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <View style={styles.card} testID={`recipe-card-${recipe.id}`}>
      <View style={styles.cardHeader}>
        <View>
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
            name={saved ? "star" : "star-outline"}
            size={22}
            color={saved ? colors.yellow : colors.faint}
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
    </View>
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
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  timeText: { fontSize: 12, fontWeight: "600", color: colors.muted },
  cardImage: { width: "100%", height: 190, borderRadius: radius.md },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  difficulty: { flexDirection: "row", alignItems: "center", gap: 10 },
  difficultyLabel: { fontSize: 13, fontWeight: "700", color: colors.ink },
  kcal: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4, color: colors.ink },

  empty: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.muted },
});
