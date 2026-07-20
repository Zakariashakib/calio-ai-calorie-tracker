import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PermissionSheet } from "@/src/components/PermissionSheet";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { IconButton } from "@/src/components/ui/IconButton";
import { MacroChip } from "@/src/components/ui/MacroChip";
import { scanStore } from "@/src/scan-store";
import { colors, radius, shadows } from "@/src/theme";
import type { ScanResult } from "@/src/types";

const modes = [
  { id: "meal", label: "Meal", hint: "Identify any meal" },
  { id: "restaurant", label: "Restaurant", hint: "Restaurant portions" },
  { id: "before", label: "Before", hint: "Before eating" },
  { id: "after", label: "After", hint: "After eating" },
] as const;

const USE_NATIVE_DRIVER = Platform.OS !== "web";

/** Animated lime scan-line sweeping inside the detection frame. */
function ScanLine({ active }: { active: boolean }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(y, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, y]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.scanLine,
        { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [6, 230] }) }] },
      ]}
    />
  );
}

export default function ScanScreen() {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showPermission, setShowPermission] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("meal");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<ScanResult | null>(null);
  const [message, setMessage] = useState("");

  const hasBefore = !!scanStore.getBefore();

  const beginCamera = () => {
    if (Platform.OS === "web" && !navigator.mediaDevices) {
      setMessage("Camera is unavailable here. Choose a meal photo instead.");
      return;
    }
    if (permission?.granted) setCameraOpen(true);
    else setShowPermission(true);
  };

  const grantCamera = async () => {
    setShowPermission(false);
    if (!permission?.granted && permission?.canAskAgain !== false) {
      const result = await requestPermission();
      if (result.granted) setCameraOpen(true);
      else setShowPermission(true);
    }
  };

  const analyze = async (base64: string) => {
    setAnalyzing(true);
    try {
      const result = await api<ScanResult>("/scan", {
        method: "POST",
        body: JSON.stringify({ image_base64: base64, mime_type: "image/jpeg", mode }),
      });
      const full = { ...result, image_base64: base64 };

      if (mode === "before") {
        scanStore.setBefore(full);
        scanStore.set(full);
        setMessage("Before photo saved. Switch to After mode and scan your leftovers.");
        setCameraOpen(false);
        return;
      }

      scanStore.set(full);
      setPreview(full);
      setTimeout(() => {
        setPreview(null);
        setCameraOpen(false);
        router.push("/scan-result");
      }, 900);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Food analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const capture = async () => {
    const photo = await camera.current?.takePictureAsync({
      base64: true,
      quality: 0.45,
      skipProcessing: false,
    });
    if (photo?.base64) await analyze(photo.base64);
  };

  const choosePhoto = async () => {
    const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!permissionResult.granted && permissionResult.canAskAgain) {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.45,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      await analyze(result.assets[0].base64);
    }
  };

  // ── Live camera view ─────────────────────────────────────────────────────
  if (cameraOpen) {
    const previewTotals = preview?.totals;
    return (
      <View style={styles.cameraPage} testID="ai-camera-screen">
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
        <SafeAreaView style={styles.cameraUi} edges={["top", "bottom"]}>
          <View style={styles.cameraTop}>
            <IconButton
              icon="close"
              variant="dark"
              onPress={() => setCameraOpen(false)}
              testID="close-camera-button"
            />
            <Text style={styles.cameraTitle}>
              {mode === "before" ? "Before Eating" : mode === "after" ? "After Eating" : "Scan your meal"}
            </Text>
            <IconButton
              icon="images"
              variant="dark"
              iconSize={19}
              onPress={choosePhoto}
              testID="camera-gallery-button"
            />
          </View>

          {/* Detection frame with lime brackets + scan line */}
          <View style={styles.detectionBox}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <ScanLine active={!analyzing && !preview} />
            {analyzing ? (
              <View style={styles.detecting}>
                <ActivityIndicator color={colors.lime} />
                <Text style={styles.detectingText}>Detecting food…</Text>
              </View>
            ) : null}
          </View>

          {/* Detection result pill */}
          <View style={styles.detectionInfo}>
            {preview ? (
              <>
                <Text style={styles.detectedName}>{preview.meal_name}</Text>
                <Text style={styles.detectedWeight}>{Math.round(preview.total_weight_g)} g</Text>
                <View style={styles.macroChips}>
                  <MacroChip
                    kind="carbs"
                    variant="card"
                    value={`${Math.round(previewTotals?.carbs_g ?? 0)}g`}
                  />
                  <MacroChip
                    kind="fats"
                    variant="card"
                    value={`${Math.round(previewTotals?.fat_g ?? 0)}g`}
                  />
                  <MacroChip
                    kind="sugar"
                    variant="card"
                    value={`${Math.round(previewTotals?.sugar_g ?? 0)}g`}
                  />
                </View>
              </>
            ) : (
              <Text style={styles.frameHint}>
                {mode === "before"
                  ? "Frame the full plate before eating"
                  : mode === "after"
                    ? "Frame the leftovers"
                    : "Place the whole plate inside the frame"}
              </Text>
            )}
          </View>

          {/* Capture row */}
          <View style={styles.captureRow}>
            <IconButton
              icon="images"
              variant="dark"
              size={50}
              iconSize={22}
              onPress={choosePhoto}
              testID="camera-gallery-side-button"
            />
            <PressableScale
              style={styles.shutter}
              onPress={capture}
              disabled={analyzing || !!preview}
              testID="capture-meal-button"
            >
              <View style={styles.shutterInner} />
            </PressableScale>
            <IconButton
              icon="barcode"
              variant="dark"
              size={50}
              iconSize={23}
              onPress={() => router.push("/barcode")}
              testID="open-barcode-button"
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Scan landing screen ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>AI MEAL SCAN</Text>
        <Text style={styles.title}>Log food in seconds.</Text>
        <Text style={styles.subtitle}>
          One photo, multiple foods, editable portions and complete nutrition estimates.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modeScroller}
        contentContainerStyle={styles.modes}
        testID="scan-mode-row"
      >
        {modes.map((item) => (
          <PressableScale
            key={item.id}
            style={[styles.mode, mode === item.id && styles.modeActive]}
            onPress={() => setMode(item.id)}
            testID={`scan-mode-${item.id}`}
          >
            <Text style={[styles.modeText, mode === item.id && styles.modeTextActive]}>
              {item.label}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>

      <View style={styles.modeHintRow}>
        <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
        <Text style={styles.modeHint}>{modes.find((m) => m.id === mode)?.hint}</Text>
      </View>

      <View style={styles.content}>
        {/* Scan visual tap target — lime brackets like the reference */}
        <PressableScale style={styles.scanVisual} onPress={beginCamera} testID="start-ai-camera-button">
          <View style={styles.plate}>
            <View style={styles.greenFood} />
            <View style={styles.peachFood} />
            <View style={styles.yellowFood} />
          </View>
          <View style={[styles.visualCorner, styles.vtl]} />
          <View style={[styles.visualCorner, styles.vtr]} />
          <View style={[styles.visualCorner, styles.vbl]} />
          <View style={[styles.visualCorner, styles.vbr]} />
          <View style={styles.scanBadge}>
            <Ionicons name="scan" size={16} color={colors.dark} />
            <Text style={styles.scanBadgeText}>Ready to scan</Text>
          </View>
        </PressableScale>

        <PressableScale style={styles.primary} onPress={beginCamera} testID="open-ai-camera-button">
          <Ionicons name="camera" size={20} color="white" />
          <Text style={styles.primaryText}>Open AI Camera</Text>
        </PressableScale>

        <View style={styles.quickRow}>
          <PressableScale style={styles.quick} onPress={choosePhoto} testID="choose-meal-photo-button">
            <Ionicons name="images-outline" size={22} color={colors.green} />
            <Text style={styles.quickTitle}>Photo</Text>
            <Text style={styles.quickText}>Choose from library</Text>
          </PressableScale>

          <PressableScale style={styles.quick} onPress={() => router.push("/voice")} testID="open-voice-log-button">
            <Ionicons name="mic-outline" size={22} color={colors.peach} />
            <Text style={styles.quickTitle}>Voice</Text>
            <Text style={styles.quickText}>Describe your meal</Text>
          </PressableScale>

          <PressableScale style={styles.quick} onPress={() => router.push("/barcode")} testID="open-barcode-scan-button">
            <Ionicons name="barcode-outline" size={23} color={colors.ink} />
            <Text style={styles.quickTitle}>Barcode</Text>
            <Text style={styles.quickText}>Packaged food</Text>
          </PressableScale>
        </View>

        <PressableScale
          style={[styles.compareCard, hasBefore && styles.compareCardActive]}
          onPress={() => router.push("/comparison")}
          testID="open-comparison-button"
        >
          <View style={styles.compareIcon}>
            <Ionicons name="git-compare" size={22} color={hasBefore ? colors.green : colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.compareTitle, hasBefore && { color: colors.greenDark }]}>
              Before &amp; After Comparison
            </Text>
            <Text style={styles.compareText}>
              {hasBefore
                ? "Before photo ready — tap to add after photo"
                : "Photo before & after eating to measure exact consumption"}
            </Text>
          </View>
          {hasBefore ? <Ionicons name="checkmark-circle" size={18} color={colors.green} /> : null}
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </PressableScale>

        <Text style={styles.disclaimer}>AI estimates can vary. Review portions before saving.</Text>
      </View>

      <PermissionSheet
        visible={showPermission}
        kind="camera"
        blocked={permission?.canAskAgain === false}
        onContinue={grantCamera}
        onClose={() => setShowPermission(false)}
      />
      <Toast
        visible={!!message}
        message={message}
        error={message.toLowerCase().includes("fail") || message.toLowerCase().includes("error")}
        onClose={() => setMessage("")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },

  header: { paddingHorizontal: 20, paddingTop: 18, gap: 6 },
  kicker: { color: colors.peach, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, maxWidth: 340 },

  modeScroller: { maxHeight: 52, marginTop: 12, flexGrow: 0 },
  modes: { height: 52, paddingHorizontal: 20, gap: 9, alignItems: "center" },
  mode: {
    height: 34,
    flexShrink: 0,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
  },
  modeActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  modeText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  modeTextActive: { color: "white" },

  modeHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 2,
  },
  modeHint: { color: colors.muted, fontSize: 11, fontWeight: "600" },

  content: { flex: 1, paddingHorizontal: 20, gap: 13, paddingBottom: 20 },

  scanVisual: {
    flex: 1,
    minHeight: 200,
    maxHeight: 280,
    backgroundColor: colors.greenSoft,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  plate: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: "white",
    position: "relative",
    ...shadows.card,
  },
  greenFood: {
    position: "absolute",
    width: 108,
    height: 58,
    borderRadius: 38,
    backgroundColor: colors.green,
    left: 30,
    top: 40,
    transform: [{ rotate: "-15deg" }],
  },
  peachFood: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.peach,
    left: 22,
    bottom: 28,
  },
  yellowFood: {
    position: "absolute",
    width: 62,
    height: 44,
    borderRadius: 24,
    backgroundColor: colors.yellow,
    right: 20,
    bottom: 27,
  },
  visualCorner: { position: "absolute", width: 44, height: 44, borderColor: colors.lime },
  vtl: { left: 22, top: 22, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 14 },
  vtr: { right: 22, top: 22, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 14 },
  vbl: { left: 22, bottom: 22, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 14 },
  vbr: { right: 22, bottom: 22, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 14 },
  scanBadge: {
    position: "absolute",
    bottom: 18,
    backgroundColor: "white",
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    ...shadows.subtle,
  },
  scanBadgeText: { color: colors.dark, fontSize: 12, fontWeight: "800" },

  primary: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryText: { color: "white", fontSize: 16, fontWeight: "800" },

  quickRow: { flexDirection: "row", gap: 10 },
  quick: {
    flex: 1,
    minHeight: 88,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
    ...shadows.card,
  },
  quickTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 4 },
  quickText: { color: colors.muted, fontSize: 10, lineHeight: 14 },

  compareCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  compareCardActive: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  compareIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  compareTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  compareText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },

  disclaimer: { textAlign: "center", color: colors.muted, fontSize: 11 },

  // ── Camera overlay ──
  cameraPage: { flex: 1, backgroundColor: "black" },
  cameraUi: { flex: 1, justifyContent: "space-between", paddingHorizontal: 20 },
  cameraTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  cameraTitle: { color: "white", fontSize: 16, fontWeight: "700" },

  detectionBox: {
    alignSelf: "center",
    width: "88%",
    aspectRatio: 1,
    maxHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  corner: { position: "absolute", width: 46, height: 46, borderColor: colors.lime },
  tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 18 },
  tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 18 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 18 },
  br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 18 },
  scanLine: {
    position: "absolute",
    top: 0,
    width: "82%",
    height: 66,
    borderRadius: 20,
    backgroundColor: "rgba(182,236,79,0.28)",
    borderBottomWidth: 2,
    borderBottomColor: colors.lime,
  },
  detecting: { alignItems: "center", gap: 8 },
  detectingText: { color: colors.lime, fontSize: 13, fontWeight: "700" },

  detectionInfo: { alignItems: "center", gap: 6, paddingHorizontal: 10 },
  detectedName: { color: "white", fontSize: 22, fontWeight: "800" },
  detectedWeight: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "600" },
  frameHint: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600", textAlign: "center" },
  macroChips: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 8 },

  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 8,
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.65)",
  },
  shutterInner: { width: 30, height: 30, borderRadius: 15, backgroundColor: "white" },
});
