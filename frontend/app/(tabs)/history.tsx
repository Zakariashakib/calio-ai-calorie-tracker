import {
  Ionicons,
} from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  api,
} from "@/src/api";
import {
  AppScreen,
} from "@/src/components/AppScreen";
import {
  PressableScale,
} from "@/src/components/PressableScale";
import {
  colors,
  radius,
  shadow,
} from "@/src/theme";
import type {
  Meal,
} from "@/src/types";

const filters = [
  "All",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
];

export default function HistoryScreen() {
  const [meals, setMeals] =
    useState<Meal[]>([]);

  const [filter, setFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const load = useCallback(async () => {
    try {
      setMeals(
        await api<Meal[]>("/history"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const shown = useMemo(
    () =>
      filter === "All"
        ? meals
        : meals.filter(
            (meal) =>
              meal.meal_type === filter,
          ),
    [
      filter,
      meals,
    ],
  );

  return (
    <AppScreen
      contentStyle={styles.content}
      testID="history-screen"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>
            YOUR LIBRARY
          </Text>

          <Text style={styles.title}>
            Food history
          </Text>
        </View>

        <View style={styles.count}>
          <Text style={styles.countText}>
            {meals.length}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        style={styles.chipScroller}
        contentContainerStyle={
          styles.chips
        }
        testID="history-filter-row"
      >
        {filters.map((item) => (
          <PressableScale
            key={item}
            style={[
              styles.chip,
              filter === item
                && styles.chipActive,
            ]}
            onPress={() =>
              setFilter(item)
            }
            testID={
              `history-filter-${
                item.toLowerCase()
              }`
            }
          >
            <Text
              style={[
                styles.chipText,
                filter === item
                  && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator
          color={colors.green}
        />
      ) : shown.length ? (
        shown.map((meal) => (
          <PressableScale
            key={meal.meal_id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname:
                  "/meal/[id]",
                params: {
                  id: meal.meal_id,
                },
              })
            }
            testID={
              `history-meal-${meal.meal_id}`
            }
          >
            <View style={styles.cardTop}>
              <View style={styles.icon}>
                <Ionicons
                  name={
                    meal.source === "camera"
                      ? "scan"
                      : meal.source === "voice"
                        ? "mic"
                        : "restaurant"
                  }
                  color={colors.greenDark}
                  size={20}
                />
              </View>

              <View style={styles.copy}>
                <Text style={styles.type}>
                  {meal.meal_type} •{" "}
                  {new Date(
                    meal.eaten_at,
                  ).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </Text>

                <Text style={styles.meal}>
                  {meal.title}
                </Text>
              </View>

              <Text style={styles.cals}>
                {Math.round(
                  meal.totals.calories,
                )}{" "}
                kcal
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.macros}>
              {Math.round(
                meal.totals.protein_g,
              )}
              g protein{"   "}
              {Math.round(
                meal.totals.carbs_g,
              )}
              g carbs{"   "}
              {Math.round(
                meal.totals.fat_g,
              )}
              g fat
            </Text>
          </PressableScale>
        ))
      ) : (
        <View style={styles.empty}>
          <Ionicons
            name="restaurant-outline"
            color={colors.greenDark}
            size={28}
          />

          <Text style={styles.emptyTitle}>
            Nothing here yet
          </Text>

          <Text style={styles.emptyText}>
            Your saved meals will appear
            here for one-tap logging.
          </Text>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: {
    color: colors.greenDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 31,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.8,
  },
  count: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: colors.peach,
    fontWeight: "900",
  },
  chipScroller: {
    height: 56,
    marginHorizontal: -20,
  },
  chips: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 9,
  },
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
  chipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "white",
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.md,
    gap: 12,
    ...shadow,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenSoft,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  type: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "700",
  },
  meal: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  cals: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  macros: {
    color: colors.muted,
    fontSize: 12,
  },
  empty: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  emptyText: {
    maxWidth: 260,
    textAlign: "center",
    lineHeight: 20,
    color: colors.muted,
  },
});
