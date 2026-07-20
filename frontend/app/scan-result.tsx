import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { IconButton } from "@/src/components/ui/IconButton";
import { MacroChip } from "@/src/components/ui/MacroChip";
import { PetalChart, type Petal } from "@/src/components/ui/PetalChart";
import { foodVisual } from "@/src/food-visuals";
import { scanStore } from "@/src/scan-store";
import { colors, radius, shadows } from "@/src/theme";
import type { MealItem } from "@/src/types";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

export default function ScanResultScreen() {
  const scan = scanStore.get();
  const [items, setItems] = useState<MealItem[]>(scan?.foods ?? []);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>("Lunch");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const totals = useMemo(
    () =>
      items.reduce(
        (sum, item) => ({
          calories: sum.calories + item.calories,
          protein_g: sum.protein_g + item.protein_g,
          carbs_g: sum.carbs_g + item.carbs_g,
          fat_g: sum.fat_g + item.fat_g,
          fiber_g: sum.fiber_g + item.fiber_g,
          sugar_g: sum.sugar_g + item.sugar_g,
          sodium_mg: sum.sodium_mg + item.sodium_mg,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },
      ),
    [items],
  );

  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + (item.estimated_weight_g || 0), 0),
    [items],
  );

  const petals = useMemo<Petal[]>(() => {
    const base = totalWeight || 1;
    return items
      .map((item) => ({ label: item.name, pct: ((item.estimated_weight_g || 0) / base) * 100 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
  }, [items, totalWeight]);

  if (!scan) {
    return (
      <SafeAreaView style={styles.missing}>
        <Text style={styles.foodName}>Scan result expired</Text>
        <PressableScale style={styles.primary} onPress={() => router.replace("/(tabs)/scan")}>
          <Text style={styles.primaryText}>Scan again</Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  const imageUri = scan.image_base64 ? `data:image/jpeg;base64,${scan.image_base64}` : undefined;

  const update = (index: number, key: keyof MealItem, value: string) =>
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, [key]: key === "name" || key === "portion" ? value : Number(value) || 0 }
          : item,
      ),
    );

  const save = async () => {
    setSaving(true);
    try {
      await api("/meals", {
        method: "POST",
        body: JSON.stringify({
          meal_type: mealType,
          title: scan.meal_name,
          eaten_at: new Date().toISOString(),
          items,
          image_base64: scan.image_base64,
          source: "camera",
        }),
      });
      scanStore.clear();
      router.replace("/(tabs)");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not save meal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <IconButton icon="chevron-back" onPress={() => router.back()} testID="scan-result-back-button" />
          <View style={styles.confidence}>
            <Ionicons name="sparkles" size={12} color={colors.peach} />
            <Text style={styles.confidenceText}>{Math.round(scan.confidence * 100)}%</Text>
          </View>
          <IconButton icon="bookmark-outline" testID="scan-result-bookmark-button" />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {petals.length ? (
            <PetalChart
              petals={petals}
              imageUri={imageUri}
              testID="scan-result-petal"
              imageTestID="scan-result-photo"
            />
          ) : null}

          <View style={styles.titleBlock}>
            <Text style={styles.foodName}>{scan.meal_name}</Text>
            <Text style={styles.weight}>{Math.round(totalWeight)} g</Text>
          </View>

          {scan.guidance ? <Text style={styles.guidance}>{scan.guidance}</Text> : null}

          {/* Total macro chips */}
          <View style={styles.totalChips}>
            <MacroChip kind="carbs" variant="card" value={`${Math.round(totals.carbs_g)}g`} />
            <MacroChip kind="fats" variant="card" value={`${Math.round(totals.fat_g)}g`} />
            <MacroChip kind="sugar" variant="card" value={`${Math.round(totals.sugar_g)}g`} />
          </View>

          <View style={styles.calorieRow}>
            <Text style={styles.calorieValue}>{Math.round(totals.calories)} kcal</Text>
            <Text style={styles.calorieLabel}>{Math.round(totals.protein_g)}g protein total</Text>
          </View>

          {/* Meal type */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.types}
          >
            {MEAL_TYPES.map((type) => (
              <PressableScale
                key={type}
                style={[styles.type, mealType === type && styles.typeActive]}
                onPress={() => setMealType(type)}
                testID={`result-meal-type-${type.toLowerCase()}`}
              >
                <Text style={[styles.typeText, mealType === type && styles.typeTextActive]}>
                  {type}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>

          <View style={styles.sectionRow}>
            <Text style={styles.section}>Ingredients</Text>
            <Text style={styles.editHint}>Tap a row to edit</Text>
          </View>

          {items.map((item, index) => {
            const visual = foodVisual(item.name);
            const expanded = editingId === item.item_id;
            return (
              <View key={item.item_id} style={styles.ingredient} testID={`detected-food-${index}`}>
                <PressableScale
                  style={styles.ingredientTop}
                  onPress={() => setEditingId(expanded ? null : item.item_id)}
                  testID={`toggle-food-${index}`}
                >
                  <View style={[styles.ingredientThumb, { backgroundColor: visual.soft }]}>
                    <Ionicons name={visual.icon} size={22} color={visual.color} />
                  </View>
                  <View style={styles.ingredientCopy}>
                    <Text style={styles.ingredientName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.ingredientChips}>
                      <MacroChip kind="carbs" variant="pill" value={`${Math.round(item.carbs_g)}g`} />
                      <MacroChip kind="fats" variant="pill" value={`${Math.round(item.fat_g)}g`} />
                      <MacroChip kind="sugar" variant="pill" value={`${Math.round(item.sugar_g)}g`} />
                    </View>
                  </View>
                  <View style={styles.ingredientRight}>
                    <Text style={styles.ingredientGrams}>{Math.round(item.estimated_weight_g)} g</Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "pencil"}
                      size={14}
                      color={colors.faint}
                    />
                  </View>
                </PressableScale>

                {expanded ? (
                  <View style={styles.editRow}>
                    <Field
                      label="Name"
                      value={item.name}
                      onChange={(value) => update(index, "name", value)}
                      keyboard="default"
                      flex={2}
                      testID={`food-name-input-${index}`}
                    />
                    <Field
                      label="Grams"
                      value={String(Math.round(item.estimated_weight_g))}
                      onChange={(value) => update(index, "estimated_weight_g", value)}
                      testID={`food-weight-input-${index}`}
                    />
                    <Field
                      label="Calories"
                      value={String(Math.round(item.calories))}
                      onChange={(value) => update(index, "calories", value)}
                      testID={`food-calories-input-${index}`}
                    />
                    <Field
                      label="Protein"
                      value={String(Math.round(item.protein_g))}
                      onChange={(value) => update(index, "protein_g", value)}
                      testID={`food-protein-input-${index}`}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}

          {scan.warnings.map((warning) => (
            <View key={warning} style={styles.warning}>
              <Ionicons name="information-circle" size={18} color={colors.peach} />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <PressableScale
            style={styles.primary}
            onPress={save}
            disabled={saving}
            testID="save-scanned-meal-button"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.primaryText}>Save meal</Text>
                <Ionicons name="checkmark" size={20} color="white" />
              </>
            )}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
      <Toast visible={!!message} message={message} error onClose={() => setMessage("")} />
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  testID,
  keyboard = "decimal-pad",
  flex = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testID: string;
  keyboard?: "decimal-pad" | "default";
  flex?: number;
}) {
  return (
    <View style={[styles.field, { flex }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        style={styles.fieldInput}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  missing: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    gap: 20,
  },

  header: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confidence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.peachSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  confidenceText: { color: colors.peach, fontSize: 12, fontWeight: "800" },

  content: { paddingHorizontal: 20, paddingBottom: 110, gap: 14 },

  titleBlock: { alignItems: "center", gap: 3, marginTop: 4 },
  foodName: { fontSize: 26, fontWeight: "800", letterSpacing: -0.4, color: colors.ink },
  weight: { fontSize: 15, fontWeight: "600", color: colors.muted },
  guidance: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: "center" },

  totalChips: { flexDirection: "row", gap: 12 },

  calorieRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  calorieValue: { fontSize: 20, fontWeight: "800", color: colors.ink },
  calorieLabel: { fontSize: 12, fontWeight: "500", color: colors.muted },

  types: { gap: 8, paddingVertical: 2 },
  type: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
  },
  typeActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  typeText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  typeTextActive: { color: "white" },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  section: { fontSize: 18, fontWeight: "800", color: colors.ink },
  editHint: { fontSize: 11, color: colors.muted },

  ingredient: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    ...shadows.card,
  },
  ingredientTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  ingredientThumb: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientCopy: { flex: 1, gap: 6 },
  ingredientName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  ingredientChips: { flexDirection: "row", gap: 6 },
  ingredientRight: { alignItems: "flex-end", gap: 6 },
  ingredientGrams: { fontSize: 14, fontWeight: "800", color: colors.ink },

  editRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  field: { backgroundColor: colors.canvas, borderRadius: radius.sm, padding: 9, gap: 4 },
  fieldLabel: { fontSize: 9, color: colors.muted, textTransform: "uppercase", fontWeight: "700" },
  fieldInput: { color: colors.ink, fontWeight: "800", fontSize: 14, padding: 0 },

  warning: {
    flexDirection: "row",
    gap: 9,
    padding: 13,
    borderRadius: radius.sm,
    backgroundColor: colors.peachSoft,
  },
  warningText: { color: colors.ink, fontSize: 12, lineHeight: 17, flex: 1 },

  footer: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 6 },
  primary: {
    height: 56,
    minWidth: 180,
    borderRadius: radius.pill,
    backgroundColor: colors.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryText: { color: "white", fontSize: 16, fontWeight: "800" },
});
