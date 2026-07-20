import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { scanStore } from "@/src/scan-store";
import { colors, radius, shadow } from "@/src/theme";
import type { ScanResult } from "@/src/types";

const modes = [
  { id: "meal",       label: "Meal",       hint: "Identify any meal" },
  { id: "restaurant", label: "Restaurant", hint: "Restaurant portions" },
  { id: "before",     label: "Before",     hint: "Before eating" },
  { id: "after",      label: "After",      hint: "After eating" },
] as const;

export default function ScanScreen() {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showPermission, setShowPermission] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("meal");
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");

  // Track whether a "before" scan is stored for comparison
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

      // If this is a "before" scan, stash it and prompt for "after"
      if (mode === "before") {
        scanStore.setBefore(full);
        scanStore.set(full);
        setMessage("Before photo saved. Switch to After mode and scan your leftovers.");
        setCameraOpen(false);
        return;
      }

      scanStore.set(full);
      router.push("/scan-result");
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
    return (
      <View style={styles.cameraPage} testID="ai-camera-screen">
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
        <SafeAreaView style={styles.cameraUi} edges={["top", "bottom"]}>
          <View style={styles.cameraTop}>
            <PressableScale
              style={styles.darkButton}
              onPress={() => setCameraOpen(false)}
              testID="close-camera-button"
            >
              <Ionicons name="close" size={22} color="white" />
            </PressableScale>
            <Text style={styles.cameraTitle}>
              {mode === "before" ? "Before Eating" : mode === "after" ? "After Eating" : "Scan your meal"}
            </Text>
            <PressableScale style={styles.darkButton} onPress={choosePhoto} testID="camera-gallery-button">
              <Ionicons name="images" size={20} color="white" />
            </PressableScale>
          </View>

          <View style={styles.detectionBox}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            {analyzing ? (
              <View style={styles.detecting}>
                <ActivityIndicator color={colors.lime} />
                <Text style={styles.detectingText}>Detecting food…</Text>
              </View>
            ) : (
              <Text style={styles.frameText}>
                {mode === "before" ? "Frame the full plate before eating" : mode === "after" ? "Frame the leftovers" : "Place the whole plate inside"}
              </Text>
            )}
          </View>

          <View style={styles.captureRow}>
            <PressableScale
              style={styles.sideAction}
              onPress={choosePhoto}
              testID="camera-gallery-button"
            >
              <Ionicons name="images" color="white" size={22} />
            </PressableScale>
            <PressableScale
              style={styles.shutter}
              onPress={capture}
              disabled={analyzing}
              testID="capture-meal-button"
            >
              <View style={styles.shutterInner} />
            </PressableScale>
            <PressableScale
              style={styles.sideAction}
              onPress={() => router.push("/barcode")}
              testID="open-barcode-button"
            >
              <Ionicons name="barcode" color="white" size={23} />
            </PressableScale>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Scan landing screen ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>AI MEAL SCAN</Text>
        <Text style={styles.title}>Log food in seconds.</Text>
        <Text style={styles.subtitle}>
          One photo, multiple foods, editable portions and complete nutrition estimates.
        </Text>
      </View>

      {/* Mode selector */}
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

      {/* Mode hint */}
      <View style={styles.modeHintRow}>
        <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
        <Text style={styles.modeHint}>
          {modes.find((m) => m.id === mode)?.hint}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Scan visual tap target */}
        <PressableScale
          style={styles.scanVisual}
          onPress={beginCamera}
          testID="start-ai-camera-button"
        >
          <View style={styles.plate}>
            <View style={styles.greenFood} />
            <View style={styles.peachFood} />
            <View style={styles.yellowFood} />
          </View>
          <View style={[styles.visualCorner, styles.tl]} />
          <View style={[styles.visualCorner, styles.tr]} />
          <View style={[styles.visualCorner, styles.bl]} />
          <View style={[styles.visualCorner, styles.br]} />
          <View style={styles.scanBadge}>
            <Ionicons name="scan" size={17} color={colors.greenDark} />
            <Text style={styles.scanBadgeText}>Ready to scan</Text>
          </View>
        </PressableScale>

        {/* Primary CTA */}
        <PressableScale
          style={styles.primary}
          onPress={beginCamera}
          testID="open-ai-camera-button"
        >
          <Ionicons name="camera" size={21} color="white" />
          <Text style={styles.primaryText}>Open AI Camera</Text>
        </PressableScale>

        {/* Quick actions row */}
        <View style={styles.quickRow}>
          <PressableScale
            style={styles.quick}
            onPress={choosePhoto}
            testID="choose-meal-photo-button"
          >
            <Ionicons name="images-outline" size={22} color={colors.greenDark} />
            <Text style={styles.quickTitle}>Photo</Text>
            <Text style={styles.quickText}>Choose from library</Text>
          </PressableScale>

          <PressableScale
            style={styles.quick}
            onPress={() => router.push("/voice")}
            testID="open-voice-log-button"
          >
            <Ionicons name="mic-outline" size={22} color={colors.peach} />
            <Text style={styles.quickTitle}>Voice</Text>
            <Text style={styles.quickText}>Describe your meal</Text>
          </PressableScale>

          <PressableScale
            style={styles.quick}
            onPress={() => router.push("/barcode")}
            testID="open-barcode-scan-button"
          >
            <Ionicons name="barcode-outline" size={23} color={colors.ink} />
            <Text style={styles.quickTitle}>Barcode</Text>
            <Text style={styles.quickText}>Packaged food</Text>
          </PressableScale>
        </View>

        {/* Before/After comparison card */}
        <PressableScale
          style={[styles.compareCard, hasBefore && styles.compareCardActive]}
          onPress={() => router.push("/comparison")}
          testID="open-comparison-button"
        >
          <View style={styles.compareIcon}>
            <Ionicons
              name="git-compare"
              size={22}
              color={hasBefore ? colors.greenDark : colors.muted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.compareTitle, hasBefore && { color: colors.greenDark }]}>
              Before & After Comparison
            </Text>
            <Text style={styles.compareText}>
              {hasBefore
                ? "Before photo ready — tap to add after photo"
                : "Photo before & after eating to measure exact consumption"}
            </Text>
          </View>
          {hasBefore && (
            <View style={styles.compareBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.green} />
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </PressableScale>

        <Text style={styles.disclaimer}>
          AI estimates can vary. Review portions before saving.
        </Text>
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
  kicker: { color: colors.greenDark, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
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

  content: { flex: 1, paddingHorizontal: 20, gap: 13, paddingBottom: 90 },

  // Scan visual
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
    shadowColor: colors.greenDark,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
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
  visualCorner: { position: "absolute", width: 44, height: 44, borderColor: colors.green },
  tl: { left: 22, top: 22, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 14 },
  tr: { right: 22, top: 22, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 14 },
  bl: { left: 22, bottom: 22, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 14 },
  br: { right: 22, bottom: 22, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 14 },
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
  },
  scanBadgeText: { color: colors.greenDark, fontSize: 12, fontWeight: "800" },

  // Buttons
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
    ...shadow,
  },
  quickTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 4 },
  quickText: { color: colors.muted, fontSize: 10, lineHeight: 14 },

  // Comparison card
  compareCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  compareCardActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
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
  compareBadge: { marginRight: 4 },

  disclaimer: { textAlign: "center", color: colors.muted, fontSize: 11 },

  // Camera styles
  cameraPage: { flex: 1, backgroundColor: "black" },
  cameraUi: { flex: 1, paddingHorizontal: 18, justifyContent: "space-between" },
  cameraTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  darkButton: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraTitle: { color: "white", fontSize: 15, fontWeight: "800" },
  detectionBox: {
    height: "50%",
    marginHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  detecting: {
    backgroundColor: "rgba(0,0,0,.55)",
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
  },
  detectingText: { color: "white", fontWeight: "700" },
  frameText: {
    color: "white",
    backgroundColor: "rgba(0,0,0,.42)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    fontSize: 12,
    textAlign: "center",
  },
  corner: { position: "absolute", width: 54, height: 54, borderColor: colors.lime },
  captureRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 14,
  },
  sideAction: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,.52)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: "white" },
});
