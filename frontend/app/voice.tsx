import { Ionicons } from "@expo/vector-icons";
import { RecordingPresets, getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PermissionSheet } from "@/src/components/PermissionSheet";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { scanStore } from "@/src/scan-store";
import { colors, radius } from "@/src/theme";
import type { MealItem } from "@/src/types";

type VoiceResult = { title: string; meal_type: "Breakfast" | "Lunch" | "Dinner" | "Snack"; transcript: string; items: MealItem[]; warnings?: string[] };

export default function VoiceScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [showPermission, setShowPermission] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const startIntent = async () => { const status = await getRecordingPermissionsAsync(); if (!status.granted) { setBlocked(status.canAskAgain === false); setShowPermission(true); return; } await start(); };
  const start = async () => { setShowPermission(false); await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); await recorder.prepareToRecordAsync(); recorder.record(); };
  const grant = async () => { const result = await requestRecordingPermissionsAsync(); setBlocked(result.canAskAgain === false); if (result.granted) await start(); else setShowPermission(true); };
  const stop = async () => {
    await recorder.stop();
    if (!recorder.uri) { setMessage("No recording was created"); return; }
    setProcessing(true);
    try {
      const form = new FormData();
      form.append("file", { uri: recorder.uri, name: "meal.m4a", type: "audio/m4a" } as unknown as Blob);
      const result = await api<VoiceResult>("/voice/parse", { method: "POST", body: form });
      const totals = result.items.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein_g: sum.protein_g + item.protein_g, carbs_g: sum.carbs_g + item.carbs_g, fat_g: sum.fat_g + item.fat_g, fiber_g: sum.fiber_g + item.fiber_g, sugar_g: sum.sugar_g + item.sugar_g, sodium_mg: sum.sodium_mg + item.sodium_mg }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });
      scanStore.set({ scan_id: "voice", meal_name: result.title, total_weight_g: result.items.reduce((s, x) => s + x.estimated_weight_g, 0), foods: result.items, totals, confidence: Math.min(...result.items.map((x) => x.confidence)), warnings: result.warnings ?? [], guidance: `Transcript: "${result.transcript}" Review the foods before saving.` });
      router.replace("/scan-result");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Voice logging failed"); }
    finally { setProcessing(false); }
  };
  const seconds = Math.floor(state.durationMillis / 1000);
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}><PressableScale style={styles.iconButton} onPress={() => router.back()} testID="voice-back-button"><Ionicons name="arrow-back" size={21} color={colors.ink} /></PressableScale><Text style={styles.headerTitle}>Voice log</Text><View style={styles.iconButton} /></View>
      <View style={styles.content}>
        <View style={styles.copy}><Text style={styles.kicker}>SPEAK NATURALLY</Text><Text style={styles.title}>{state.isRecording ? "I’m listening…" : processing ? "Understanding your meal…" : "Tell me what you ate."}</Text><Text style={styles.subtitle}>Try: “For lunch I had two eggs, one plate of rice, and grilled fish.”</Text></View>
        <View style={styles.visual} testID="voice-recording-visual">{[38,62,88,55,105,72,42,90,60].map((height, i) => <View key={i} style={[styles.wave, { height: state.isRecording ? height : 22 + (i % 3) * 10 }]} />)}</View>
        <Text style={styles.timer}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</Text>
        <PressableScale style={[styles.record, state.isRecording && styles.recordActive]} onPress={state.isRecording ? stop : startIntent} disabled={processing} testID={state.isRecording ? "stop-voice-recording-button" : "start-voice-recording-button"}>{processing ? <ActivityIndicator color="white" /> : <Ionicons name={state.isRecording ? "stop" : "mic"} size={31} color="white" />}</PressableScale>
        <Text style={styles.hint}>{state.isRecording ? "Tap to finish" : processing ? "Transcribing and estimating nutrition" : "Tap to start recording"}</Text>
        <View style={styles.privacy}><Ionicons name="shield-checkmark" size={17} color={colors.peach} /><Text style={styles.privacyText}>Audio is processed only to create your meal log.</Text></View>
      </View>
      <PermissionSheet visible={showPermission} kind="microphone" blocked={blocked} onContinue={grant} onClose={() => setShowPermission(false)} />
      <Toast visible={!!message} message={message} error onClose={() => setMessage("")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, header: { height: 66, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, iconButton: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" }, content: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingBottom: 22 }, copy: { alignItems: "center", gap: 9, marginTop: 25 }, kicker: { color: colors.peach, fontSize: 11, letterSpacing: 1.5, fontWeight: "800" }, title: { color: colors.ink, fontSize: 30, fontWeight: "900", textAlign: "center" }, subtitle: { maxWidth: 310, color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" }, visual: { height: 155, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 35 }, wave: { width: 7, borderRadius: 5, backgroundColor: colors.peach }, timer: { fontSize: 18, color: colors.muted, fontWeight: "700", fontVariant: ["tabular-nums"] }, record: { width: 82, height: 82, borderRadius: 41, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center", marginTop: "auto", shadowColor: colors.ink, shadowOpacity: 0.2, shadowRadius: 20, elevation: 6 }, recordActive: { backgroundColor: colors.peach }, hint: { color: colors.muted, fontSize: 12, marginTop: 12 }, privacy: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 9, marginTop: 25 }, privacyText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
});
