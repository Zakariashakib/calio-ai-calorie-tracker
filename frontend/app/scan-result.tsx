import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { scanStore } from "@/src/scan-store";
import { colors, radius, shadow } from "@/src/theme";
import type { MealItem } from "@/src/types";

export default function ScanResultScreen() {
  const scan = scanStore.get();
  const [items, setItems] = useState<MealItem[]>(scan?.foods ?? []);
  const [mealType, setMealType] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Lunch");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => items.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein_g: sum.protein_g + item.protein_g, carbs_g: sum.carbs_g + item.carbs_g, fat_g: sum.fat_g + item.fat_g, fiber_g: sum.fiber_g + item.fiber_g, sugar_g: sum.sugar_g + item.sugar_g, sodium_mg: sum.sodium_mg + item.sodium_mg }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 }), [items]);
  if (!scan) return <SafeAreaView style={styles.missing}><Text style={styles.title}>Scan result expired</Text><PressableScale style={styles.primary} onPress={() => router.replace("/(tabs)/scan")}><Text style={styles.primaryText}>Scan again</Text></PressableScale></SafeAreaView>;
  const update = (index: number, key: keyof MealItem, value: string) => setItems((current) => current.map((item, i) => i === index ? { ...item, [key]: key === "name" || key === "portion" ? value : Number(value) || 0 } : item));
  const save = async () => {
    setSaving(true);
    try {
      await api("/meals", { method: "POST", body: JSON.stringify({ meal_type: mealType, title: scan.meal_name, eaten_at: new Date().toISOString(), items, image_base64: scan.image_base64, source: "camera" }) });
      scanStore.clear(); router.replace("/(tabs)");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not save meal"); }
    finally { setSaving(false); }
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}><PressableScale style={styles.iconButton} onPress={() => router.back()} testID="scan-result-back-button"><Ionicons name="arrow-back" size={21} color={colors.ink} /></PressableScale><Text style={styles.headerTitle}>AI Result</Text><View style={styles.confidence}><Text style={styles.confidenceText}>{Math.round(scan.confidence * 100)}%</Text></View></View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {scan.image_base64 ? <Image source={{ uri: `data:image/jpeg;base64,${scan.image_base64}` }} style={styles.photo} resizeMode="cover" testID="scan-result-photo" /> : null}
          <View style={styles.summary}><Text style={styles.kicker}>DETECTED MEAL</Text><Text style={styles.title}>{scan.meal_name}</Text><Text style={styles.guidance}>{scan.guidance}</Text><View style={styles.totalRow}><Text style={styles.total}>{Math.round(totals.calories)} kcal</Text><Text style={styles.weight}>{Math.round(scan.total_weight_g)} g estimated</Text></View></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.types}>{(["Breakfast", "Lunch", "Dinner", "Snack"] as const).map((type) => <PressableScale key={type} style={[styles.type, mealType === type && styles.typeActive]} onPress={() => setMealType(type)} testID={`result-meal-type-${type.toLowerCase()}`}><Text style={[styles.typeText, mealType === type && styles.typeTextActive]}>{type}</Text></PressableScale>)}</ScrollView>
          <View style={styles.sectionRow}><Text style={styles.section}>Detected foods</Text><Text style={styles.editHint}>Tap values to edit</Text></View>
          {items.map((item, index) => <View key={item.item_id} style={styles.foodCard} testID={`detected-food-${index}`}><View style={styles.foodTop}><TextInput style={styles.foodName} value={item.name} onChangeText={(value) => update(index, "name", value)} testID={`food-name-input-${index}`} /><Text style={styles.itemConfidence}>{Math.round(item.confidence * 100)}%</Text></View><View style={styles.fields}><Field label="Grams" value={String(Math.round(item.estimated_weight_g))} onChange={(value) => update(index, "estimated_weight_g", value)} testID={`food-weight-input-${index}`} /><Field label="Calories" value={String(Math.round(item.calories))} onChange={(value) => update(index, "calories", value)} testID={`food-calories-input-${index}`} /><Field label="Protein" value={String(Math.round(item.protein_g))} onChange={(value) => update(index, "protein_g", value)} testID={`food-protein-input-${index}`} /></View><View style={styles.macroTextRow}><Text style={styles.macroText}>{Math.round(item.carbs_g)}g carbs</Text><Text style={styles.macroText}>{Math.round(item.fat_g)}g fat</Text><Text style={styles.macroText}>{Math.round(item.fiber_g)}g fiber</Text><Text style={styles.macroText}>{Math.round(item.sodium_mg)}mg sodium</Text></View></View>)}
          {scan.warnings.map((warning) => <View key={warning} style={styles.warning}><Ionicons name="information-circle" size={18} color={colors.peach} /><Text style={styles.warningText}>{warning}</Text></View>)}
        </ScrollView>
        <View style={styles.footer}><PressableScale style={styles.primary} onPress={save} disabled={saving} testID="save-scanned-meal-button">{saving ? <ActivityIndicator color="white" /> : <><Text style={styles.primaryText}>Save meal</Text><Ionicons name="checkmark" size={20} color="white" /></>}</PressableScale></View>
      </KeyboardAvoidingView>
      <Toast visible={!!message} message={message} error onClose={() => setMessage("")} />
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, testID }: { label: string; value: string; onChange: (value: string) => void; testID: string }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.fieldInput} testID={testID} /></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, missing: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", padding: 25, gap: 20 }, header: { height: 66, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, iconButton: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" }, confidence: { backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }, confidenceText: { color: colors.greenDark, fontSize: 12, fontWeight: "800" }, content: { paddingHorizontal: 20, paddingBottom: 110, gap: 16 }, photo: { width: "100%", height: 225, borderRadius: radius.lg }, summary: { gap: 6 }, kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: colors.greenDark }, title: { fontSize: 27, fontWeight: "900", color: colors.ink }, guidance: { fontSize: 13, lineHeight: 19, color: colors.muted }, totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }, total: { fontSize: 22, fontWeight: "900", color: colors.ink }, weight: { fontSize: 12, color: colors.muted }, types: { gap: 8 }, type: { height: 36, paddingHorizontal: 15, borderRadius: 18, flexShrink: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: "center" }, typeActive: { backgroundColor: colors.dark }, typeText: { color: colors.muted, fontSize: 12 }, typeTextActive: { color: "white" }, sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, section: { fontSize: 20, fontWeight: "900", color: colors.ink }, editHint: { fontSize: 11, color: colors.muted }, foodCard: { backgroundColor: colors.surface, padding: 16, borderRadius: radius.md, gap: 13, ...shadow }, foodTop: { flexDirection: "row", alignItems: "center", gap: 10 }, foodName: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: "800", borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 5 }, itemConfidence: { color: colors.greenDark, fontSize: 11, fontWeight: "800" }, fields: { flexDirection: "row", gap: 9 }, field: { flex: 1, backgroundColor: colors.canvas, borderRadius: radius.sm, padding: 9, gap: 4 }, fieldLabel: { fontSize: 9, color: colors.muted, textTransform: "uppercase" }, fieldInput: { color: colors.ink, fontWeight: "800", fontSize: 15, padding: 0 }, macroTextRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, macroText: { color: colors.muted, fontSize: 11 }, warning: { flexDirection: "row", gap: 9, padding: 13, borderRadius: radius.sm, backgroundColor: colors.peachSoft }, warningText: { color: colors.ink, fontSize: 12, lineHeight: 17, flex: 1 }, footer: { paddingHorizontal: 20, paddingBottom: 8 }, primary: { height: 56, minWidth: 180, borderRadius: radius.pill, backgroundColor: colors.dark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, primaryText: { color: "white", fontSize: 16, fontWeight: "800" },
});
