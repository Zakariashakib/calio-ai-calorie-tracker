import {
  Ionicons,
} from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  api,
} from "@/src/api";
import {
  useAuth,
} from "@/src/auth-context";
import {
  MacroCard,
  ProgressBar,
} from "@/src/components/NutritionUi";
import {
  PressableScale,
} from "@/src/components/PressableScale";
import {
  Toast,
} from "@/src/components/Toast";
import {
  colors,
  radius,
  shadow,
} from "@/src/theme";
import type {
  Dashboard,
  Meal,
} from "@/src/types";

export default function TodayScreen() {
  const {
    user,
  } = useAuth();

  const [data, setData] =
    useState<Dashboard | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState(false);

  const load = useCallback(async () => {
    try {
      setData(
        await api<Dashboard>(
          "/dashboard",
        ),
      );

      setError(false);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Could not load today",
      );

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
      await api(
        "/water",
        {
          method: "POST",
          body: JSON.stringify({
            amount_ml: 250,
          }),
        },
      );

      setMessage(
        "250 ml water added",
      );
      setError(false);

      await load();
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Could not add water",
      );

      setError(true);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView
        style={styles.loading}
      >
        <ActivityIndicator
          size="large"
          color={colors.green}
        />

        <Text style={styles.muted}>
          Building today&apos;s picture…
        </Text>
      </SafeAreaView>
    );
  }

  const dashboard = data!;

  const caloriePercent = Math.min(
    100,
    Math.round(
      (
        dashboard.totals.calories
        / dashboard.goals.calories
      ) * 100,
    ),
  );

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      <View
        style={styles.header}
        testID="today-sticky-header"
      >
        <View>
          <Text style={styles.overline}>
            TODAY •{" "}
            {new Date()
              .toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                },
              )
              .toUpperCase()}
          </Text>

          <Text style={styles.title}>
            Good day,{" "}
            {user?.name.split(" ")[0]}
          </Text>
        </View>

        <PressableScale
          style={styles.avatar}
          onPress={() =>
            router.push("/more")
          }
          testID="open-more-button"
        >
          <Ionicons
            name="person"
            size={20}
            color={colors.greenDark}
          />
        </PressableScale>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.green}
          />
        }
      >
        <View
          style={styles.progressCard}
          testID="daily-calorie-progress-card"
        >
          <View
            style={styles.progressTop}
          >
            <View>
              <Text
                style={styles.cardLabel}
              >
                TODAY&apos;S PROGRESS
              </Text>

              <Text
                style={styles.calories}
              >
                {Math.round(
                  dashboard.totals.calories,
                )}{" "}

                <Text
                  style={
                    styles.caloriesGoal
                  }
                >
                  /{" "}
                  {
                    dashboard.goals
                      .calories
                  }{" "}
                  kcal
                </Text>
              </Text>
            </View>

            <View style={styles.percent}>
              <Text
                style={styles.percentText}
              >
                {caloriePercent}%
              </Text>
            </View>
          </View>

          <ProgressBar
            value={
              dashboard.totals.calories
            }
            goal={
              dashboard.goals.calories
            }
            color={colors.peach}
          />

          <Text style={styles.remaining}>
            {Math.max(
              0,
              Math.round(
                dashboard.goals.calories
                - dashboard.totals.calories,
              ),
            )}{" "}
            kcal left for today
          </Text>
        </View>

        <View style={styles.macroGrid}>
          <MacroCard
            label="Protein"
            value={
              dashboard.totals.protein_g
            }
            goal={
              dashboard.goals.protein_g
            }
            unit="g"
            color={colors.green}
            icon="fitness"
          />

          <MacroCard
            label="Carbs"
            value={
              dashboard.totals.carbs_g
            }
            goal={
              dashboard.goals.carbs_g
            }
            unit="g"
            color={colors.yellow}
            icon="leaf"
          />

          <MacroCard
            label="Fat"
            value={
              dashboard.totals.fat_g
            }
            goal={
              dashboard.goals.fat_g
            }
            unit="g"
            color={colors.peach}
            icon="water"
          />

          <PressableScale
            style={styles.waterCard}
            onPress={addWater}
            testID="add-water-button"
          >
            <View
              style={styles.waterIcon}
            >
              <Ionicons
                name="water"
                size={17}
                color="#4B91C8"
              />
            </View>

            <Text
              style={styles.cardLabel}
            >
              WATER
            </Text>

            <Text
              style={styles.waterValue}
            >
              {(
                dashboard.water_ml / 1000
              ).toFixed(1)}{" "}

              <Text
                style={
                  styles.caloriesGoal
                }
              >
                /{" "}
                {(
                  dashboard.goals.water_ml
                  / 1000
                ).toFixed(1)}
                L
              </Text>
            </Text>

            <ProgressBar
              value={
                dashboard.water_ml
              }
              goal={
                dashboard.goals.water_ml
              }
              color="#6BB5E8"
            />
          </PressableScale>
        </View>

        {dashboard.suggestions.length ? (
          <View
            style={styles.coachCard}
            testID="daily-ai-suggestion-card"
          >
            <View
              style={styles.sparkle}
            >
              <Ionicons
                name="sparkles"
                size={19}
                color={colors.greenDark}
              />
            </View>

            <View
              style={styles.coachCopy}
            >
              <Text
                style={styles.cardLabel}
              >
                AI COACH
              </Text>

              <Text
                style={styles.coachText}
              >
                {
                  dashboard
                    .suggestions[0]
                }
              </Text>
            </View>

            <PressableScale
              onPress={() =>
                router.push(
                  "/(tabs)/coach",
                )
              }
              testID="open-coach-button"
            >
              <Ionicons
                name="arrow-forward-circle"
                size={30}
                color={colors.greenDark}
              />
            </PressableScale>
          </View>
        ) : null}

        <View style={styles.sectionRow}>
          <Text
            style={styles.sectionTitle}
          >
            Meal timeline
          </Text>

          <PressableScale
            onPress={() =>
              router.push(
                "/(tabs)/history",
              )
            }
            testID="see-history-button"
          >
            <Text style={styles.link}>
              See all
            </Text>
          </PressableScale>
        </View>

        {dashboard.meals.length ? (
          dashboard.meals.map(
            (meal) => (
              <MealCard
                key={meal.meal_id}
                meal={meal}
              />
            ),
          )
        ) : (
          <PressableScale
            style={styles.empty}
            onPress={() =>
              router.push(
                "/(tabs)/scan",
              )
            }
            testID="empty-scan-meal-button"
          >
            <Ionicons
              name="camera-outline"
              size={25}
              color={colors.greenDark}
            />

            <Text
              style={styles.emptyTitle}
            >
              No meals yet
            </Text>

            <Text style={styles.muted}>
              Snap your first meal in seconds.
            </Text>
          </PressableScale>
        )}
      </ScrollView>

      <Toast
        visible={Boolean(message)}
        message={message}
        error={error}
        onClose={() => setMessage("")}
      />
    </SafeAreaView>
  );
}

function MealCard({
  meal,
}: {
  meal: Meal;
}) {
  const mealIcon =
    meal.meal_type === "Breakfast"
      ? "sunny"
      : meal.meal_type === "Dinner"
        ? "moon"
        : "restaurant";

  return (
    <PressableScale
      style={styles.meal}
      onPress={() =>
        router.push({
          pathname: "/meal/[id]",
          params: {
            id: meal.meal_id,
          },
        })
      }
      testID={
        `meal-card-${meal.meal_id}`
      }
    >
      <View style={styles.mealIcon}>
        <Ionicons
          name={mealIcon}
          size={21}
          color={colors.greenDark}
        />
      </View>

      <View style={styles.mealCopy}>
        <Text style={styles.mealType}>
          {meal.meal_type} •{" "}
          {new Date(
            meal.eaten_at,
          ).toLocaleTimeString(
            [],
            {
              hour: "numeric",
              minute: "2-digit",
            },
          )}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.mealTitle}
        >
          {meal.title}
        </Text>

        <Text style={styles.macroLine}>
          {Math.round(
            meal.totals.protein_g,
          )}
          g P ·{" "}
          {Math.round(
            meal.totals.carbs_g,
          )}
          g C ·{" "}
          {Math.round(
            meal.totals.fat_g,
          )}
          g F
        </Text>
      </View>

      <Text style={styles.mealCalories}>
        {Math.round(
          meal.totals.calories,
        )}
        {"\n"}

        <Text style={styles.kcal}>
          kcal
        </Text>
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.canvas,
  },
  header: {
    height: 84,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.canvas,
  },
  overline: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.greenDark,
    fontWeight: "800",
  },
  title: {
    fontSize: 28,
    color: colors.ink,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginTop: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenSoft,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 18,
  },
  progressCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.lg,
    padding: 22,
    gap: 13,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.muted,
    fontWeight: "800",
  },
  calories: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 5,
  },
  caloriesGoal: {
    fontSize: 13,
    color: "#A9AEA6",
    fontWeight: "600",
  },
  percent: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#343932",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.peach,
  },
  percentText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },
  remaining: {
    color: "#A9AEA6",
    fontSize: 12,
  },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  waterCard: {
    flex: 1,
    minWidth: 145,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: 8,
    ...shadow,
  },
  waterIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5F3FC",
  },
  waterValue: {
    fontSize: 17,
    color: colors.ink,
    fontWeight: "800",
  },
  coachCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: colors.greenSoft,
    padding: 17,
    borderRadius: radius.md,
  },
  sparkle: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  coachCopy: {
    flex: 1,
    gap: 4,
  },
  coachText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    fontWeight: "600",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: colors.ink,
  },
  link: {
    color: colors.greenDark,
    fontSize: 13,
    fontWeight: "800",
  },
  meal: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow,
  },
  mealIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  mealCopy: {
    flex: 1,
    gap: 3,
  },
  mealType: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  mealTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  macroLine: {
    fontSize: 11,
    color: colors.muted,
  },
  mealCalories: {
    textAlign: "right",
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  kcal: {
    fontSize: 10,
    color: colors.muted,
  },
  empty: {
    minHeight: 150,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C8D9B8",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    color: colors.ink,
    fontWeight: "800",
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
});
