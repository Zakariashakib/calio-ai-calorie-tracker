import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api, authedMediaUrl } from "@/src/api";
import { AppScreen } from "@/src/components/AppScreen";
import { MetricCard } from "@/src/components/NutritionUi";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { colors, radius, shadow } from "@/src/theme";
import type { Meal, MealItem } from "@/src/types";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [mealType, setMealType] = useState<MealType>("Lunch");
  const [items, setItems] = useState<MealItem[]>([]);

  useEffect(() => {
    api<Meal>(`/meals/${id}`)
      .then(setMeal)
      .catch(() => setMeal(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Full photos are served as cacheable URLs; legacy meals fall back to
  // the inline base64 payload.
  useEffect(() => {
    if (!meal) {
      setPhotoUri(null);
      return;
    }
    if (meal.photo_url) {
      authedMediaUrl(`/meals/${meal.meal_id}/photo`)
        .then(setPhotoUri)
        .catch(() => setPhotoUri(null));
    } else if (meal.image_base64 || meal.thumbnail_base64) {
      setPhotoUri(`data:image/jpeg;base64,${meal.image_base64 ?? meal.thumbnail_base64}`);
    } else {
      setPhotoUri(null);
    }
  }, [meal]);

  const startEdit = () => {
    if (!meal) return;
    setTitle(meal.title);
    setMealType(meal.meal_type);
    setItems(meal.items.map((item) => ({ ...item })));
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const updateItem = (index: number, key: keyof MealItem, value: string) =>
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, [key]: key === "name" || key === "portion" ? value : Number(value) || 0 }
          : item,
      ),
    );

  const addItem = () =>
    setItems((current) => [
      ...current,
      {
        item_id: `item_${Math.random().toString(36).slice(2, 12)}`,
        name: "",
        portion: "1 serving",
        estimated_weight_g: 100,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
        confidence: 1,
      },
    ]);

  // The backend requires at least one food per meal, so the last row stays.
  const removeItem = (index: number) =>
    setItems((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : current,
    );

  const save = async () => {
    if (!meal) return;
    if (!title.trim()) {
      setMessage("Could not save: title is required");
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      setMessage("Could not save: every food needs a name");
      return;
    }
    setSaving(true);
    try {
      const updated = await api<Meal>(`/meals/${meal.meal_id}`, {
        method: "PUT",
        body: JSON.stringify({
          meal_type: mealType,
          title: title.trim(),
          eaten_at: meal.eaten_at,
          items: items.map((item) => ({ ...item, name: item.name.trim() })),
          source: meal.source,
        }),
      });
      setMeal(updated);
      setEditing(false);
      setMessage("Meal updated");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not save meal");
    } finally {
      setSaving(false);
    }
  };

  const repeat = async () => {
    if (!meal) return;
    try {
      await api("/meals", {
        method: "POST",
        body: JSON.stringify({
          meal_type: meal.meal_type,
          title: meal.title,
          eaten_at: new Date().toISOString(),
          items: meal.items,
          source: "history",
        }),
      });
      setMessage("Meal added to today");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not repeat meal");
    }
  };

  const remove = async () => {
    if (!meal) return;
    try {
      await api(`/meals/${meal.meal_id}`, { method: "DELETE" });
      router.replace("/(tabs)/history");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not delete meal");
    }
  };

  if (loading)
    return (
      <AppScreen>
        <ActivityIndicator color={colors.peach} />
      </AppScreen>
    );
  if (!meal)
    return (
      <AppScreen>
        <Text style={styles.title}>Meal not found</Text>
      </AppScreen>
    );

  if (editing) {
    return (
      <AppScreen testID="meal-edit-screen">
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <PressableScale style={styles.back} onPress={cancelEdit} testID="meal-edit-cancel-button">
              <Ionicons name="close" size={21} color={colors.ink} />
            </PressableScale>
            <Text style={styles.headerTitle}>Edit meal</Text>
            <PressableScale style={styles.back} onPress={save} disabled={saving} testID="save-meal-edit-button">
              {saving ? (
                <ActivityIndicator color={colors.peach} />
              ) : (
                <Ionicons name="checkmark" size={22} color={colors.peach} />
              )}
            </PressableScale>
          </View>

          <ScrollView
            contentContainerStyle={styles.editContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={styles.titleInput}
                placeholder="Meal title"
                placeholderTextColor={colors.faint}
                testID="meal-title-input"
              />
            </View>

            <Text style={styles.section}>Meal type</Text>
            <View style={styles.types}>
              {MEAL_TYPES.map((type) => (
                <PressableScale
                  key={type}
                  style={[styles.type, mealType === type && styles.typeActive]}
                  onPress={() => setMealType(type)}
                  testID={`meal-type-${type.toLowerCase()}`}
                >
                  <Text style={[styles.typeText, mealType === type && styles.typeTextActive]}>
                    {type}
                  </Text>
                </PressableScale>
              ))}
            </View>

            <Text style={styles.section}>Foods</Text>
            {items.map((item, index) => (
              <View key={item.item_id} style={styles.editCard} testID={`edit-food-${index}`}>
                <View style={styles.editCardHeader}>
                  <Text style={styles.editCardTitle}>Food {index + 1}</Text>
                  {items.length > 1 && (
                    <PressableScale
                      style={styles.removeFood}
                      onPress={() => removeItem(index)}
                      testID={`remove-food-${index}`}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.red} />
                    </PressableScale>
                  )}
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    value={item.name}
                    onChangeText={(value) => updateItem(index, "name", value)}
                    style={styles.fieldInput}
                    testID={`edit-food-name-${index}`}
                  />
                </View>
                <View style={styles.editRow}>
                  <View style={[styles.field, styles.flex]}>
                    <Text style={styles.fieldLabel}>Portion</Text>
                    <TextInput
                      value={item.portion}
                      onChangeText={(value) => updateItem(index, "portion", value)}
                      style={styles.fieldInput}
                      testID={`edit-food-portion-${index}`}
                    />
                  </View>
                  <View style={[styles.field, styles.flex]}>
                    <Text style={styles.fieldLabel}>Grams</Text>
                    <TextInput
                      value={String(Math.round(item.estimated_weight_g))}
                      onChangeText={(value) => updateItem(index, "estimated_weight_g", value)}
                      keyboardType="decimal-pad"
                      style={styles.fieldInput}
                      testID={`edit-food-weight-${index}`}
                    />
                  </View>
                </View>
                <View style={styles.editRow}>
                  <View style={[styles.field, styles.flex]}>
                    <Text style={styles.fieldLabel}>Calories</Text>
                    <TextInput
                      value={String(Math.round(item.calories))}
                      onChangeText={(value) => updateItem(index, "calories", value)}
                      keyboardType="decimal-pad"
                      style={styles.fieldInput}
                      testID={`edit-food-calories-${index}`}
                    />
                  </View>
                  <View style={[styles.field, styles.flex]}>
                    <Text style={styles.fieldLabel}>Protein</Text>
                    <TextInput
                      value={String(Math.round(item.protein_g))}
                      onChangeText={(value) => updateItem(index, "protein_g", value)}
                      keyboardType="decimal-pad"
                      style={styles.fieldInput}
                      testID={`edit-food-protein-${index}`}
                    />
                  </View>
                  <View style={[styles.field, styles.flex]}>
                    <Text style={styles.fieldLabel}>Carbs</Text>
                    <TextInput
                      value={String(Math.round(item.carbs_g))}
                      onChangeText={(value) => updateItem(index, "carbs_g", value)}
                      keyboardType="decimal-pad"
                      style={styles.fieldInput}
                      testID={`edit-food-carbs-${index}`}
                    />
                  </View>
                  <View style={[styles.field, styles.flex]}>
                    <Text style={styles.fieldLabel}>Fat</Text>
                    <TextInput
                      value={String(Math.round(item.fat_g))}
                      onChangeText={(value) => updateItem(index, "fat_g", value)}
                      keyboardType="decimal-pad"
                      style={styles.fieldInput}
                      testID={`edit-food-fat-${index}`}
                    />
                  </View>
                </View>
              </View>
            ))}

            <PressableScale style={styles.addFood} onPress={addItem} testID="add-food-button">
              <Ionicons name="add" size={19} color={colors.peach} />
              <Text style={styles.addFoodText}>Add food</Text>
            </PressableScale>

            <PressableScale style={styles.repeat} onPress={save} disabled={saving} testID="save-meal-edit-button-footer">
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.repeatText}>Save changes</Text>
                </>
              )}
            </PressableScale>
          </ScrollView>
        </KeyboardAvoidingView>
        <Toast visible={!!message} message={message} error={message.startsWith("Could")} onClose={() => setMessage("")} />
      </AppScreen>
    );
  }

  return (
    <AppScreen testID="meal-detail-screen">
      <View style={styles.header}>
        <PressableScale style={styles.back} onPress={() => router.back()} testID="meal-detail-back-button">
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </PressableScale>
        <Text style={styles.headerTitle}>Meal details</Text>
        <View style={styles.headerActions}>
          <PressableScale style={styles.back} onPress={startEdit} testID="edit-meal-button">
            <Ionicons name="create-outline" size={20} color={colors.ink} />
          </PressableScale>
          <PressableScale style={styles.back} onPress={remove} testID="delete-meal-button">
            <Ionicons name="trash-outline" size={20} color={colors.red} />
          </PressableScale>
        </View>
      </View>
      <View style={styles.hero}>
        {photoUri || meal.thumbnail_base64 ? (
          <Image
            source={{ uri: photoUri ?? `data:image/jpeg;base64,${meal.thumbnail_base64}` }}
            style={styles.mealPhoto}
            resizeMode="cover"
            testID="meal-detail-photo"
            onError={() => {
              // Photo endpoint failed (e.g. storage outage): show thumbnail.
              if (meal.thumbnail_base64 && photoUri && !photoUri.startsWith("data:")) {
                setPhotoUri(`data:image/jpeg;base64,${meal.thumbnail_base64}`);
              }
            }}
          />
        ) : (
          <View style={styles.mealIcon}>
            <Ionicons name="restaurant" size={30} color={colors.peach} />
          </View>
        )}
        <Text style={styles.kicker}>
          {meal.meal_type.toUpperCase()} •{" "}
          {new Date(meal.eaten_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
        <Text style={styles.title}>{meal.title}</Text>
        <Text style={styles.calories}>{Math.round(meal.totals.calories)} kcal</Text>
      </View>
      <View style={styles.metrics}>
        <MetricCard icon="fitness" label="Protein" value={`${Math.round(meal.totals.protein_g)}g`} />
        <MetricCard icon="leaf" label="Carbs" value={`${Math.round(meal.totals.carbs_g)}g`} accent={colors.yellow} />
        <MetricCard icon="water" label="Fat" value={`${Math.round(meal.totals.fat_g)}g`} accent={colors.peach} />
      </View>
      <Text style={styles.section}>Foods</Text>
      {meal.items.map((item) => (
        <View key={item.item_id} style={styles.food}>
          <View>
            <Text style={styles.foodName}>{item.name}</Text>
            <Text style={styles.foodDetail}>
              {item.portion} · {Math.round(item.estimated_weight_g)}g · {Math.round(item.confidence * 100)}% confidence
            </Text>
          </View>
          <Text style={styles.foodCalories}>{Math.round(item.calories)} kcal</Text>
        </View>
      ))}
      <PressableScale style={styles.repeat} onPress={repeat} testID="repeat-meal-button">
        <Ionicons name="repeat" size={20} color="white" />
        <Text style={styles.repeatText}>Add again today</Text>
      </PressableScale>
      <Toast visible={!!message} message={message} error={message.startsWith("Could")} onClose={() => setMessage("")} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", gap: 9 },
  back: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadow },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  hero: { alignItems: "center", gap: 7, paddingVertical: 10 },
  mealIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.peachSoft, alignItems: "center", justifyContent: "center" },
  mealPhoto: { width: 148, height: 148, borderRadius: 28, backgroundColor: colors.peachSoft, ...shadow },
  kicker: { color: colors.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: "800", marginTop: 6 },
  title: { color: colors.ink, fontSize: 27, fontWeight: "900", textAlign: "center" },
  calories: { color: colors.peach, fontSize: 18, fontWeight: "900" },
  metrics: { flexDirection: "row", gap: 9 },
  section: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  food: { minHeight: 66, backgroundColor: colors.surface, borderRadius: radius.md, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, ...shadow },
  foodName: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  foodDetail: { color: colors.muted, fontSize: 10, marginTop: 4 },
  foodCalories: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  repeat: { height: 56, borderRadius: radius.pill, backgroundColor: colors.dark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  repeatText: { color: "white", fontSize: 15, fontWeight: "800" },

  editContent: { gap: 14, paddingBottom: 40 },
  editCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 13, gap: 10, ...shadow },
  editCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editCardTitle: { fontSize: 11, color: colors.muted, textTransform: "uppercase", fontWeight: "800", letterSpacing: 0.6 },
  removeFood: { width: 34, height: 34, borderRadius: 13, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" },
  addFood: { height: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.peach, borderStyle: "dashed", backgroundColor: colors.peachSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  addFoodText: { color: colors.peach, fontSize: 14, fontWeight: "800" },
  editRow: { flexDirection: "row", gap: 8 },
  field: { backgroundColor: colors.canvas, borderRadius: radius.sm, padding: 10, gap: 4 },
  fieldLabel: { fontSize: 9, color: colors.muted, textTransform: "uppercase", fontWeight: "700" },
  fieldInput: { color: colors.ink, fontWeight: "800", fontSize: 14, padding: 0 },
  titleInput: { color: colors.ink, fontWeight: "800", fontSize: 18, padding: 0 },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: { height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: "center" },
  typeActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  typeText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  typeTextActive: { color: "white" },
});
