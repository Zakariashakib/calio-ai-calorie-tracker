import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { scanStore } from "@/src/scan-store";
import { colors, radius, shadow } from "@/src/theme";
import type { CompareResponse, MealItem } from "@/src/types";

type Step = "before-prompt" | "before-camera" | "after-prompt" | "after-camera" | "result";

export default function ComparisonScreen() {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [step, setStep] = useState<Step>("before-prompt");
  const [beforeBase64, setBeforeBase64] = useState<string | null>(null);
  const [afterBase64, setAfterBase64] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const ensurePermission = async (): Promise<boolean> => {
    if (permission?.granted) return true;
    if (permission?.canAskAgain !== false) {
      const res = await requestPermission();
      return res.granted;
    }
    return false;
  };

  const capturePhoto = async (which: "before" | "after") => {
    const granted = await ensurePermission();
    if (!granted) { setMessage("Camera permission needed"); setIsError(true); return; }
    setStep(which === "before" ? "before-camera" : "after-camera");
  };

  const pickPhoto = async (which: "before" | "after") => {
    const perms = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perms.granted && perms.canAskAgain) await ImagePicker.requestMediaLibraryPermissionsAsync();
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.45, base64: true });
    if (!res.canceled && res.assets[0].base64) {
      if (which === "before") { setBeforeBase64(res.assets[0].base64); setStep("after-prompt"); }
      else { setAfterBase64(res.assets[0].base64); await runComparison(beforeBase64!, res.assets[0].base64); }
    }
  };

  const onShutter = async (which: "before" | "after") => {
    const photo = await camera.current?.takePictureAsync({ base64: true, quality: 0.45, skipProcessing: false });
    if (!photo?.base64) return;
    if (which === "before") {
      setBeforeBase64(photo.base64);
      setStep("after-prompt");
    } else {
      setAfterBase64(photo.base64);
      setStep("result");
      await runComparison(beforeBase64!, photo.base64);
    }
  };

  const runComparison = async (before: string, after: string) => {
    setStep("result");
    setAnalyzing(true);
    try {
      const res = await api<CompareResponse>("/scan/compare", {
        method: "POST",
        body: JSON.stringify({ before_image_base64: before, after_image_base64: after }),
      });
      setResult(res);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Comparison failed");
      setIsError(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveMeal = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const items: MealItem[] = result.before.foods.map((food, i) => {
        const afterFood = result.after.foods[i];
        const ratio = afterFood
          ? Math.max(0, 1 - afterFood.estimated_weight_g / (food.estimated_weight_g || 1))
          : 1;
        return {
          ...food,
          estimated_weight_g: Math.round(food.estimated_weight_g * ratio),
          calories: Math.round(food.calories * ratio),
          protein_g: Math.round(food.protein_g * ratio),
          carbs_g: Math.round(food.carbs_g * ratio),
          fat_g: Math.round(food.fat_g * ratio),
          fiber_g: Math.round(food.fiber_g * ratio),
          sugar_g: Math.round(food.sugar_g * ratio),
          sodium_mg: Math.round(food.sodium_mg * ratio),
        };
      });

      await api("/meals", {
        method: "POST",
        body: JSON.stringify({
          meal_type: "Lunch",
          title: result.before.meal_name,
          eaten_at: new Date().toISOString(),
          items: items.length ? items : result.before.foods,
          image_base64: beforeBase64,
          source: "camera",
        }),
      });

      scanStore.clearBefore();
      router.replace("/(tabs)");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save meal");
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  // ── Camera views ────────────────────────────────────────────────────────────
  if (step === "before-camera" || step === "after-camera") {
    const which = step === "before-camera" ? "before" : "after";
    return (
      <View style={styles.cameraPage}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
        <SafeAreaView style={styles.cameraUi} edges={["top", "bottom"]}>
          <View style={styles.cameraTop}>
            <PressableScale style={styles.darkBtn} onPress={() => setStep(which === "before" ? "before-prompt" : "after-prompt")}>
              <Ionicons name="close" size={22} color="white" />
            </PressableScale>
            <Text style={styles.cameraTitle}>{which === "before" ? "Before eating" : "After eating"}</Text>
            <PressableScale style={styles.darkBtn} onPress={() => pickPhoto(which)}>
              <Ionicons name="images" size={20} color="white" />
            </PressableScale>
          </View>
          <View style={styles.frameHint}>
            <Text style={styles.frameText}>
              {which === "before" ? "Photo your full plate before eating" : "Photo the leftovers after eating"}
            </Text>
          </View>
          <View style={styles.captureRow}>
            <PressableScale style={styles.shutter} onPress={() => onShutter(which)}>
              <View style={styles.shutterInner} />
            </PressableScale>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Before-prompt ─────────────────────────────────────────────────────────
  if (step === "before-prompt") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Before & After</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="git-compare" size={36} color={colors.greenDark} />
            </View>
            <Text style={styles.heroTitle}>Plate Comparison</Text>
            <Text style={styles.heroText}>
              Photo your plate before and after eating. CalSnap calculates exactly how much you consumed.
            </Text>
          </View>

          <View style={styles.stepsRow}>
            <StepCard number="1" label="Before eating" icon="restaurant" color={colors.green} active />
            <View style={styles.arrow}><Ionicons name="arrow-forward" size={16} color={colors.muted} /></View>
            <StepCard number="2" label="After eating" icon="leaf" color={colors.peach} active={false} />
          </View>

          <PressableScale style={styles.primary} onPress={() => capturePhoto("before")}>
            <Ionicons name="camera" size={22} color="white" />
            <Text style={styles.primaryText}>Photo the full plate</Text>
          </PressableScale>

          <PressableScale style={styles.secondary} onPress={() => pickPhoto("before")}>
            <Ionicons name="images-outline" size={20} color={colors.greenDark} />
            <Text style={styles.secondaryText}>Choose from library</Text>
          </PressableScale>

          <Text style={styles.disclaimer}>AI estimates can vary. Review before saving.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── After-prompt ──────────────────────────────────────────────────────────
  if (step === "after-prompt") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <PressableScale style={styles.backBtn} onPress={() => setStep("before-prompt")}>
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Step 2 of 2</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.previewRow}>
            <View style={styles.previewCard}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${beforeBase64}` }}
                style={styles.previewImg}
                resizeMode="cover"
              />
              <View style={styles.previewLabel}>
                <Ionicons name="checkmark-circle" size={15} color={colors.green} />
                <Text style={styles.previewLabelText}>Before</Text>
              </View>
            </View>
            <View style={[styles.previewCard, styles.previewCardDim]}>
              <View style={[styles.previewImg, styles.previewPlaceholder]}>
                <Ionicons name="camera" size={32} color={colors.muted} />
              </View>
              <View style={styles.previewLabel}>
                <Ionicons name="ellipse-outline" size={15} color={colors.muted} />
                <Text style={[styles.previewLabelText, { color: colors.muted }]}>After</Text>
              </View>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Now photo the leftovers</Text>
            <Text style={styles.heroText}>
              Photo what remains on the plate after eating. Leave the plate in the same position for best accuracy.
            </Text>
          </View>

          <PressableScale style={styles.primary} onPress={() => capturePhoto("after")}>
            <Ionicons name="camera" size={22} color="white" />
            <Text style={styles.primaryText}>Photo the leftovers</Text>
          </PressableScale>

          <PressableScale style={styles.secondary} onPress={() => pickPhoto("after")}>
            <Ionicons name="images-outline" size={20} color={colors.greenDark} />
            <Text style={styles.secondaryText}>Choose from library</Text>
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <PressableScale style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </PressableScale>
          <Text style={styles.headerTitle}>Comparison Result</Text>
          {result ? (
            <View style={styles.confidence}>
              <Text style={styles.confText}>{Math.round(result.confidence * 100)}%</Text>
            </View>
          ) : <View style={{ width: 44 }} />}
        </View>

        {analyzing ? (
          <View style={styles.analyzeCenter}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.analyzeText}>Analyzing consumption…</Text>
          </View>
        ) : result ? (
          <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
            {/* Photo row */}
            <View style={styles.photoRow}>
              <View style={styles.photoCol}>
                <Image source={{ uri: `data:image/jpeg;base64,${beforeBase64}` }} style={styles.photo} resizeMode="cover" />
                <Text style={styles.photoLabel}>BEFORE</Text>
                <Text style={styles.photoCalories}>{Math.round(result.before.totals.calories)} kcal</Text>
              </View>
              <View style={styles.arrowCenter}>
                <Ionicons name="remove" size={24} color={colors.muted} />
              </View>
              <View style={styles.photoCol}>
                {afterBase64 ? (
                  <Image source={{ uri: `data:image/jpeg;base64,${afterBase64}` }} style={styles.photo} resizeMode="cover" />
                ) : (
                  <View style={[styles.photo, styles.previewPlaceholder]} />
                )}
                <Text style={styles.photoLabel}>AFTER (LEFTOVER)</Text>
                <Text style={styles.photoCalories}>{Math.round(result.after.totals.calories)} kcal</Text>
              </View>
            </View>

            {/* Consumed summary */}
            <View style={styles.consumedCard}>
              <View style={styles.consumedHeader}>
                <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                <Text style={styles.consumedTitle}>You consumed</Text>
              </View>
              <Text style={styles.consumedCalories}>{Math.round(result.consumed.calories)} kcal</Text>
              <Text style={styles.consumedWeight}>{Math.round(result.consumed_weight_g)} g estimated</Text>
              <Text style={styles.consumedGuidance}>{result.guidance}</Text>

              <View style={styles.macroRow}>
                <MacroChip label="Protein" value={result.consumed.protein_g} color={colors.green} />
                <MacroChip label="Carbs" value={result.consumed.carbs_g} color={colors.yellow} />
                <MacroChip label="Fat" value={result.consumed.fat_g} color={colors.peach} />
              </View>
            </View>

            {/* Side-by-side macro breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Macro Breakdown</Text>
              {(["protein_g", "carbs_g", "fat_g", "fiber_g"] as const).map((key) => (
                <View key={key} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{macroLabel(key)}</Text>
                  <Text style={styles.breakdownBefore}>{Math.round(result.before.totals[key])}g</Text>
                  <Ionicons name="remove" size={12} color={colors.muted} />
                  <Text style={styles.breakdownAfter}>{Math.round(result.after.totals[key])}g</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.muted} />
                  <Text style={[styles.breakdownConsumed, { color: colors.greenDark }]}>
                    {Math.round(result.consumed[key])}g
                  </Text>
                </View>
              ))}
            </View>

            <PressableScale style={styles.primary} onPress={saveMeal} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.primaryText}>Save consumed meal</Text>
                  <Ionicons name="checkmark" size={20} color="white" />
                </>
              )}
            </PressableScale>

            <Text style={styles.disclaimer}>Estimates are informational only. Review before saving.</Text>
          </ScrollView>
        ) : (
          <View style={styles.analyzeCenter}>
            <Text style={styles.analyzeText}>No result — please try again.</Text>
            <PressableScale style={[styles.primary, { marginTop: 20 }]} onPress={() => router.back()}>
              <Text style={styles.primaryText}>Go back</Text>
            </PressableScale>
          </View>
        )}
      </KeyboardAvoidingView>
      <Toast visible={!!message} message={message} error={isError} onClose={() => { setMessage(""); setIsError(false); }} />
    </SafeAreaView>
  );
}

function StepCard({ number, label, icon, color, active }: { number: string; label: string; icon: any; color: string; active: boolean }) {
  return (
    <View style={[sstyles.stepCard, active && { borderColor: color, borderWidth: 2 }]}>
      <View style={[sstyles.stepIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={sstyles.stepNum}>Step {number}</Text>
      <Text style={sstyles.stepLabel}>{label}</Text>
    </View>
  );
}

const sstyles = StyleSheet.create({
  stepCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 6, alignItems: "center", borderWidth: 1, borderColor: colors.line },
  stepIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 10, color: colors.muted, fontWeight: "700", letterSpacing: 0.5 },
  stepLabel: { fontSize: 12, color: colors.ink, fontWeight: "800", textAlign: "center" },
});

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[mstyles.chip, { backgroundColor: `${color}18` }]}>
      <Text style={[mstyles.chipValue, { color }]}>{Math.round(value)}g</Text>
      <Text style={mstyles.chipLabel}>{label}</Text>
    </View>
  );
}

const mstyles = StyleSheet.create({
  chip: { flex: 1, borderRadius: radius.sm, padding: 10, alignItems: "center", gap: 2 },
  chipValue: { fontSize: 16, fontWeight: "900" },
  chipLabel: { fontSize: 10, color: colors.muted, fontWeight: "700" },
});

function macroLabel(key: string): string {
  return { protein_g: "Protein", carbs_g: "Carbs", fat_g: "Fat", fiber_g: "Fiber" }[key] ?? key;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { height: 66, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  backBtn: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  confidence: { backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  confText: { color: colors.greenDark, fontSize: 12, fontWeight: "800" },

  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 18 },
  hero: { alignItems: "center", gap: 10, paddingVertical: 10 },
  heroIcon: { width: 80, height: 80, borderRadius: 30, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 24, fontWeight: "900", color: colors.ink, textAlign: "center" },
  heroText: { fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: "center", maxWidth: 320 },

  stepsRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  arrow: { alignItems: "center" },

  primary: { height: 56, borderRadius: radius.pill, backgroundColor: colors.dark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryText: { color: "white", fontSize: 16, fontWeight: "800" },
  secondary: { height: 52, borderRadius: radius.pill, backgroundColor: colors.greenSoft, borderWidth: 1.5, borderColor: colors.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  secondaryText: { color: colors.greenDark, fontSize: 15, fontWeight: "700" },
  disclaimer: { textAlign: "center", color: colors.muted, fontSize: 11 },

  previewRow: { flexDirection: "row", gap: 14 },
  previewCard: { flex: 1, gap: 8 },
  previewCardDim: { opacity: 0.5 },
  previewImg: { width: "100%", aspectRatio: 1, borderRadius: radius.md },
  previewPlaceholder: { backgroundColor: colors.line, alignItems: "center", justifyContent: "center" },
  previewLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewLabelText: { fontSize: 12, fontWeight: "800", color: colors.ink },

  // Camera styles
  cameraPage: { flex: 1, backgroundColor: "black" },
  cameraUi: { flex: 1, paddingHorizontal: 18, justifyContent: "space-between" },
  cameraTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cameraTitle: { color: "white", fontSize: 16, fontWeight: "800" },
  darkBtn: { width: 44, height: 44, borderRadius: 17, backgroundColor: "rgba(0,0,0,.45)", alignItems: "center", justifyContent: "center" },
  frameHint: { alignItems: "center" },
  frameText: { color: "white", backgroundColor: "rgba(0,0,0,.42)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, fontSize: 13, textAlign: "center" },
  captureRow: { alignItems: "center", paddingBottom: 16 },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "white", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: "white" },

  // Result styles
  resultContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 18 },
  analyzeCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  analyzeText: { color: colors.muted, fontSize: 15, fontWeight: "600" },

  photoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  photoCol: { flex: 1, gap: 7 },
  photo: { width: "100%", aspectRatio: 1.2, borderRadius: radius.md },
  photoLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: colors.muted },
  photoCalories: { fontSize: 15, fontWeight: "900", color: colors.ink },
  arrowCenter: { paddingTop: 50 },

  consumedCard: { backgroundColor: colors.dark, borderRadius: radius.lg, padding: 22, gap: 10 },
  consumedHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  consumedTitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "700" },
  consumedCalories: { color: "white", fontSize: 38, fontWeight: "900", letterSpacing: -1 },
  consumedWeight: { color: "rgba(255,255,255,0.55)", fontSize: 13 },
  consumedGuidance: { color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 19 },
  macroRow: { flexDirection: "row", gap: 10, marginTop: 4 },

  breakdownCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18, gap: 13, ...shadow },
  breakdownTitle: { fontSize: 16, fontWeight: "900", color: colors.ink, marginBottom: 2 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownLabel: { flex: 1, fontSize: 13, color: colors.muted, fontWeight: "600" },
  breakdownBefore: { fontSize: 13, fontWeight: "800", color: colors.ink, minWidth: 36, textAlign: "right" },
  breakdownAfter: { fontSize: 13, fontWeight: "700", color: colors.muted, minWidth: 36, textAlign: "right" },
  breakdownConsumed: { fontSize: 14, fontWeight: "900", minWidth: 36, textAlign: "right" },
});
