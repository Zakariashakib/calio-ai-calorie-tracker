import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PermissionSheet } from "@/src/components/PermissionSheet";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { scanStore } from "@/src/scan-store";
import { colors, radius } from "@/src/theme";
import type { ScanResult } from "@/src/types";

const modes = [{ id: "meal", label: "Meal" }, { id: "restaurant", label: "Restaurant" }, { id: "before", label: "Before" }, { id: "after", label: "After" }] as const;

export default function ScanScreen() {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showPermission, setShowPermission] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mode, setMode] = useState<(typeof modes)[number]["id"]>("meal");
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");

  const beginCamera = () => {
    if (Platform.OS === "web" && !navigator.mediaDevices) { setMessage("Camera is unavailable here. Choose a meal photo instead."); return; }
    if (permission?.granted) setCameraOpen(true); else setShowPermission(true);
  };
  const grantCamera = async () => {
    setShowPermission(false);
    if (!permission?.granted && permission?.canAskAgain !== false) {
      const result = await requestPermission();
      if (result.granted) setCameraOpen(true); else setShowPermission(true);
    }
  };
  const analyze = async (base64: string) => {
    setAnalyzing(true);
    try {
      const result = await api<ScanResult>("/scan", { method: "POST", body: JSON.stringify({ image_base64: base64, mime_type: "image/jpeg", mode }) });
      scanStore.set({ ...result, image_base64: base64 });
      router.push("/scan-result");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Food analysis failed"); }
    finally { setAnalyzing(false); }
  };
  const capture = async () => {
    const photo = await camera.current?.takePictureAsync({ base64: true, quality: 0.45, skipProcessing: false });
    if (photo?.base64) await analyze(photo.base64);
  };
  const choosePhoto = async () => {
    const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!permissionResult.granted && permissionResult.canAskAgain) await ImagePicker.requestMediaLibraryPermissionsAsync();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.45, base64: true });
    if (!result.canceled && result.assets[0].base64) await analyze(result.assets[0].base64);
  };

  if (cameraOpen) return (
    <View style={styles.cameraPage} testID="ai-camera-screen">
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" />
      <SafeAreaView style={styles.cameraUi} edges={["top", "bottom"]}>
        <View style={styles.cameraTop}><PressableScale style={styles.darkButton} onPress={() => setCameraOpen(false)} testID="close-camera-button"><Ionicons name="close" size={22} color="white" /></PressableScale><Text style={styles.cameraTitle}>Scan your meal</Text><View style={styles.darkButton}><Ionicons name="flash-off" size={20} color="white" /></View></View>
        <View style={styles.detectionBox}><View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} /><View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />{analyzing ? <View style={styles.detecting}><ActivityIndicator color={colors.lime} /><Text style={styles.detectingText}>Detecting food…</Text></View> : <Text style={styles.frameText}>Place the whole plate inside</Text>}</View>
        <View style={styles.captureRow}><PressableScale style={styles.sideAction} onPress={choosePhoto} testID="camera-gallery-button"><Ionicons name="images" color="white" size={22} /></PressableScale><PressableScale style={styles.shutter} onPress={capture} disabled={analyzing} testID="capture-meal-button"><View style={styles.shutterInner} /></PressableScale><PressableScale style={styles.sideAction} onPress={() => router.push("/barcode")} testID="open-barcode-button"><Ionicons name="barcode" color="white" size={23} /></PressableScale></View>
      </SafeAreaView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}><Text style={styles.kicker}>AI MEAL SCAN</Text><Text style={styles.title}>Log food in seconds.</Text><Text style={styles.subtitle}>One photo, multiple foods, editable portions and complete nutrition estimates.</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroller} contentContainerStyle={styles.modes} testID="scan-mode-row">
        {modes.map((item) => <PressableScale key={item.id} style={[styles.mode, mode === item.id && styles.modeActive]} onPress={() => setMode(item.id)} testID={`scan-mode-${item.id}`}><Text style={[styles.modeText, mode === item.id && styles.modeTextActive]}>{item.label}</Text></PressableScale>)}
      </ScrollView>
      <View style={styles.content}>
        <PressableScale style={styles.scanVisual} onPress={beginCamera} testID="start-ai-camera-button">
          <View style={styles.plate}><View style={styles.greenFood} /><View style={styles.peachFood} /><View style={styles.yellowFood} /></View>
          <View style={[styles.visualCorner, styles.tl]} /><View style={[styles.visualCorner, styles.tr]} /><View style={[styles.visualCorner, styles.bl]} /><View style={[styles.visualCorner, styles.br]} />
          <View style={styles.scanBadge}><Ionicons name="scan" size={18} color={colors.greenDark} /><Text style={styles.scanBadgeText}>Ready to scan</Text></View>
        </PressableScale>
        <PressableScale style={styles.primary} onPress={beginCamera} testID="open-ai-camera-button"><Ionicons name="camera" size={21} color="white" /><Text style={styles.primaryText}>Open AI Camera</Text></PressableScale>
        <View style={styles.quickRow}>
          <PressableScale style={styles.quick} onPress={choosePhoto} testID="choose-meal-photo-button"><Ionicons name="images-outline" size={22} color={colors.greenDark} /><Text style={styles.quickTitle}>Photo</Text><Text style={styles.quickText}>Choose from library</Text></PressableScale>
          <PressableScale style={styles.quick} onPress={() => router.push("/voice")} testID="open-voice-log-button"><Ionicons name="mic-outline" size={22} color={colors.peach} /><Text style={styles.quickTitle}>Voice</Text><Text style={styles.quickText}>Describe your meal</Text></PressableScale>
          <PressableScale style={styles.quick} onPress={() => router.push("/barcode")} testID="open-barcode-scan-button"><Ionicons name="barcode-outline" size={23} color={colors.ink} /><Text style={styles.quickTitle}>Barcode</Text><Text style={styles.quickText}>Packaged food</Text></PressableScale>
        </View>
        <Text style={styles.disclaimer}>AI estimates can vary. Review portions before saving.</Text>
      </View>
      <PermissionSheet visible={showPermission} kind="camera" blocked={permission?.canAskAgain === false} onContinue={grantCamera} onClose={() => setShowPermission(false)} />
      <Toast visible={!!message} message={message} error onClose={() => setMessage("")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, header: { paddingHorizontal: 20, paddingTop: 18, gap: 8 }, kicker: { color: colors.greenDark, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 31, fontWeight: "900", letterSpacing: -0.8 }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, maxWidth: 340 },
  modeScroller: { maxHeight: 56, marginTop: 10, flexGrow: 0 }, modes: { height: 56, paddingHorizontal: 20, gap: 9, alignItems: "center" }, mode: { height: 36, flexShrink: 0, paddingHorizontal: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: "center" }, modeActive: { backgroundColor: colors.dark, borderColor: colors.dark }, modeText: { fontSize: 13, color: colors.muted, fontWeight: "600" }, modeTextActive: { color: "white" },
  content: { flex: 1, paddingHorizontal: 20, gap: 16, paddingBottom: 88 }, scanVisual: { flex: 1, minHeight: 230, maxHeight: 310, backgroundColor: colors.greenSoft, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", overflow: "hidden" }, plate: { width: 176, height: 176, borderRadius: 88, backgroundColor: "white", position: "relative", shadowColor: colors.greenDark, shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 6 }, greenFood: { position: "absolute", width: 110, height: 60, borderRadius: 40, backgroundColor: colors.green, left: 33, top: 42, transform: [{ rotate: "-15deg" }] }, peachFood: { position: "absolute", width: 62, height: 62, borderRadius: 31, backgroundColor: colors.peach, left: 25, bottom: 31 }, yellowFood: { position: "absolute", width: 65, height: 45, borderRadius: 25, backgroundColor: colors.yellow, right: 22, bottom: 30 }, visualCorner: { position: "absolute", width: 45, height: 45, borderColor: colors.green }, corner: { position: "absolute", width: 54, height: 54, borderColor: colors.lime }, tl: { left: 25, top: 25, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 15 }, tr: { right: 25, top: 25, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 15 }, bl: { left: 25, bottom: 25, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 15 }, br: { right: 25, bottom: 25, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 15 }, scanBadge: { position: "absolute", bottom: 20, backgroundColor: "white", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 8 }, scanBadgeText: { color: colors.greenDark, fontSize: 12, fontWeight: "800" },
  primary: { height: 56, borderRadius: radius.pill, backgroundColor: colors.dark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, primaryText: { color: "white", fontSize: 16, fontWeight: "800" }, quickRow: { flexDirection: "row", gap: 10 }, quick: { flex: 1, minHeight: 92, borderRadius: radius.md, backgroundColor: colors.surface, padding: 12, gap: 4 }, quickTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, quickText: { color: colors.muted, fontSize: 10, lineHeight: 14 }, disclaimer: { textAlign: "center", color: colors.muted, fontSize: 11 },
  cameraPage: { flex: 1, backgroundColor: "black" }, cameraUi: { flex: 1, paddingHorizontal: 18, justifyContent: "space-between" }, cameraTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, darkButton: { width: 44, height: 44, borderRadius: 17, backgroundColor: "rgba(0,0,0,.45)", alignItems: "center", justifyContent: "center" }, cameraTitle: { color: "white", fontSize: 16, fontWeight: "800" }, detectionBox: { height: "52%", marginHorizontal: 12, justifyContent: "center", alignItems: "center" }, detecting: { backgroundColor: "rgba(0,0,0,.55)", borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", gap: 10 }, detectingText: { color: "white", fontWeight: "700" }, frameText: { color: "white", backgroundColor: "rgba(0,0,0,.42)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, fontSize: 12 }, captureRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingBottom: 14 }, sideAction: { width: 52, height: 52, borderRadius: 20, backgroundColor: "rgba(0,0,0,.52)", alignItems: "center", justifyContent: "center" }, shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: "white", alignItems: "center", justifyContent: "center" }, shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: "white" },
});
