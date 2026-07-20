import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { AppScreen } from "@/src/components/AppScreen";
import { PressableScale } from "@/src/components/PressableScale";
import { IconButton } from "@/src/components/ui/IconButton";
import { MacroChip } from "@/src/components/ui/MacroChip";
import { SearchBar } from "@/src/components/ui/SearchBar";
import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { foodVisual } from "@/src/food-visuals";
import { colors, radius, shadows } from "@/src/theme";
import type { Meal } from "@/src/types";

const filters = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

export default function HistoryScreen() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [railExpanded, setRailExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setMeals(await api<Meal[]>("/history"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const shown = useMemo(() => {
    const byType = filter === "All" ? meals : meals.filter((meal) => meal.meal_type === filter);
    const trimmed = query.trim().toLowerCase();
    return trimmed ? byType.filter((meal) => meal.title.toLowerCase().includes(trimmed)) : byType;
  }, [filter, meals, query]);

  const railMeals = useMemo(
    () => (railExpanded ? shown : shown.slice(0, 8)),
    [shown, railExpanded],
  );

  return (
    <AppScreen contentStyle={styles.content} testID="history-screen">
      {/* Header: hamburger + bell + avatar */}
      <View style={styles.headerRow}>
        <IconButton icon="menu" onPress={() => router.push("/more")} testID="open-menu-button" />
        <View style={styles.headerRight}>
          <IconButton
            icon="notifications-outline"
            badge
            onPress={() => router.push("/reminders")}
            testID="history-reminders-button"
          />
          <PressableScale
            style={styles.avatar}
            onPress={() => router.push("/more")}
            testID="open-more-button"
          >
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>{(user?.name ?? "?").charAt(0)}</Text>
            )}
          </PressableScale>
        </View>
      </View>

      {/* Big two-line title */}
      <View>
        <Text style={styles.titleDark}>Let&apos;s Check Your</Text>
        <Text style={styles.titleLight}>Meal Together</Text>
      </View>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Enter a food..."
          style={styles.search}
          testID="history-search-input"
        />
        <IconButton
          icon="options-outline"
          size={52}
          onPress={() => setShowFilters((current) => !current)}
          testID="history-filter-toggle"
          style={showFilters ? styles.filterActive : undefined}
          iconColor={showFilters ? "white" : colors.ink}
        />
      </View>

      {showFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chips}
          testID="history-filter-row"
        >
          {filters.map((item) => (
            <PressableScale
              key={item}
              style={[styles.chip, filter === item && styles.chipActive]}
              onPress={() => setFilter(item)}
              testID={`history-filter-${item.toLowerCase()}`}
            >
              <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>
                {item}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>
      ) : null}

      <SectionHeader
        title="Last scans"
        actionLabel={railExpanded ? "Show less" : "See all"}
        onAction={() => setRailExpanded((current) => !current)}
      />

      {loading ? (
        <ActivityIndicator color={colors.peach} />
      ) : railMeals.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.railScroller}
          contentContainerStyle={styles.rail}
          testID="last-scans-rail"
        >
          {railMeals.map((meal) => (
            <ScanCard key={meal.meal_id} meal={meal} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="restaurant-outline" color={colors.peach} size={28} />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>
            Your scanned meals will appear here for one-tap review.
          </Text>
        </View>
      )}

      {shown.length ? (
        <>
          <SectionHeader title="All meals" badge={shown.length} />
          {shown.map((meal) => (
            <MealRow key={meal.meal_id} meal={meal} />
          ))}
        </>
      ) : null}
    </AppScreen>
  );
}

function ScanCard({ meal }: { meal: Meal }) {
  const visual = foodVisual(meal.title, meal.meal_type);
  return (
    <PressableScale
      style={styles.scanCard}
      onPress={() => router.push({ pathname: "/meal/[id]", params: { id: meal.meal_id } })}
      testID={`history-scan-${meal.meal_id}`}
    >
      {meal.thumbnail_base64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${meal.thumbnail_base64}` }}
          style={styles.scanThumb}
        />
      ) : (
        <View style={[styles.scanThumb, styles.thumbFallback, { backgroundColor: visual.soft }]}>
          <Ionicons name={visual.icon} size={44} color={visual.color} />
        </View>
      )}
      <Text style={styles.scanName} numberOfLines={2}>
        {meal.title}
      </Text>
      <View style={styles.scanChips}>
        <MacroChip kind="carbs" value={`${Math.round(meal.totals.carbs_g)}g`} />
        <MacroChip kind="fats" value={`${Math.round(meal.totals.fat_g)}g`} />
        <MacroChip kind="sugar" value={`${Math.round(meal.totals.sugar_g)}g`} />
      </View>
    </PressableScale>
  );
}

function MealRow({ meal }: { meal: Meal }) {
  const visual = foodVisual(meal.title, meal.meal_type);
  return (
    <PressableScale
      style={styles.row}
      onPress={() => router.push({ pathname: "/meal/[id]", params: { id: meal.meal_id } })}
      testID={`history-meal-${meal.meal_id}`}
    >
      {meal.thumbnail_base64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${meal.thumbnail_base64}` }}
          style={styles.rowThumb}
        />
      ) : (
        <View style={[styles.rowThumb, styles.thumbFallback, { backgroundColor: visual.soft }]}>
          <Ionicons name={visual.icon} size={20} color={visual.color} />
        </View>
      )}
      <View style={styles.rowCopy}>
        <Text style={styles.rowName} numberOfLines={1}>
          {meal.title}
        </Text>
        <Text style={styles.rowMeta}>
          {meal.meal_type} • {dayjs(meal.eaten_at).format("MMM D")}
        </Text>
      </View>
      <Text style={styles.rowKcal}>{Math.round(meal.totals.calories)} kcal</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, gap: 16 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadows.subtle,
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarLetter: { fontSize: 17, fontWeight: "800", color: colors.peach },

  titleDark: { fontSize: 31, lineHeight: 37, fontWeight: "800", letterSpacing: -0.8, color: colors.ink },
  titleLight: { fontSize: 31, lineHeight: 37, fontWeight: "800", letterSpacing: -0.8, color: colors.faint },

  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  search: { flex: 1 },
  filterActive: { backgroundColor: colors.dark },

  chipScroller: { marginHorizontal: -20, flexGrow: 0 },
  chips: { paddingHorizontal: 20, gap: 9 },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "white" },

  railScroller: { marginHorizontal: -20, flexGrow: 0 },
  rail: { paddingHorizontal: 20, gap: 12 },
  scanCard: {
    width: 178,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 12,
    ...shadows.card,
  },
  scanThumb: {
    width: 118,
    height: 118,
    borderRadius: 59,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    minHeight: 38,
  },
  scanChips: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 13,
    ...shadows.subtle,
  },
  rowThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  rowCopy: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  rowMeta: { fontSize: 11, fontWeight: "500", color: colors.muted },
  rowKcal: { fontSize: 14, fontWeight: "800", color: colors.ink },

  empty: { minHeight: 200, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  emptyText: { maxWidth: 260, textAlign: "center", lineHeight: 20, color: colors.muted },
});
