import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PermissionSheet } from "@/src/components/PermissionSheet";
import { PressableScale } from "@/src/components/PressableScale";
import { Toast } from "@/src/components/Toast";
import { colors, radius } from "@/src/theme";
import type { MealItem } from "@/src/types";

type Product = { barcode: string; product_name: string; brand?: string; serving_size: string; nutrition_grade?: string; item: MealItem };

export default function BarcodeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showPermission, setShowPermission] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const lookup = async (code: string) => { if (!code || loading) return; setLoading(true); setCameraOpen(false); try { setProduct(await api<Product>(`/barcode/${encodeURIComponent(code)}`)); setBarcode(code); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Product lookup failed"); } finally { setLoading(false); } };
  const openCamera = () => permission?.granted ? setCameraOpen(true) : setShowPermission(true);
  const grant = async () => { setShowPermission(false); if (permission?.canAskAgain !== false) { const result = await requestPermission(); if (result.granted) setCameraOpen(true); else setShowPermission(true); } };
  const save = async () => { if (!product) return; setLoading(true); try { await api("/meals", { method: "POST", body: JSON.stringify({ meal_type: "Snack", title: product.product_name, eaten_at: new Date().toISOString(), items: [product.item], source: "barcode" }) }); router.replace("/(tabs)"); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not save product"); } finally { setLoading(false); } };
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}><PressableScale style={styles.iconButton} onPress={() => router.back()} testID="barcode-back-button"><Ionicons name="arrow-back" size={21} color={colors.ink} /></PressableScale><Text style={styles.headerTitle}>Barcode scanner</Text><View style={styles.iconButton} /></View>
        {cameraOpen ? <View style={styles.cameraWrap}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }} onBarcodeScanned={({ data }) => lookup(data)} /><View style={styles.frame}><View style={styles.scanLine} /></View><Text style={styles.cameraHelp}>Align the product barcode inside the frame</Text></View> : <View style={styles.content}><View style={styles.barcodeVisual}><Ionicons name="barcode" size={100} color={colors.ink} /><Text style={styles.visualText}>Scan packaged food</Text></View><PressableScale style={styles.primary} onPress={openCamera} testID="start-barcode-camera-button"><Ionicons name="camera" size={20} color="white" /><Text style={styles.primaryText}>Open scanner</Text></PressableScale><Text style={styles.or}>OR ENTER CODE</Text><View style={styles.manual}><TextInput value={barcode} onChangeText={setBarcode} keyboardType="number-pad" placeholder="e.g. 3017624010701" placeholderTextColor="#999" style={styles.input} testID="barcode-manual-input" /><PressableScale style={styles.lookup} onPress={() => lookup(barcode)} testID="barcode-lookup-button">{loading ? <ActivityIndicator color="white" /> : <Ionicons name="arrow-forward" color="white" size={20} />}</PressableScale></View>{product ? <View style={styles.product} testID="barcode-product-result"><View style={styles.grade}><Text style={styles.gradeText}>{product.nutrition_grade?.toUpperCase() ?? "—"}</Text></View><View style={styles.productCopy}><Text style={styles.brand}>{product.brand ?? "Open Food Facts"}</Text><Text style={styles.productName}>{product.product_name}</Text><Text style={styles.productMacros}>{Math.round(product.item.calories)} kcal · {Math.round(product.item.protein_g)}g protein · {product.serving_size}</Text></View><PressableScale style={styles.add} onPress={save} testID="save-barcode-meal-button"><Ionicons name="add" color="white" size={22} /></PressableScale></View> : null}</View>}
      </KeyboardAvoidingView>
      <PermissionSheet visible={showPermission} kind="camera" blocked={permission?.canAskAgain === false} onContinue={grant} onClose={() => setShowPermission(false)} />
      <Toast visible={!!message} message={message} error onClose={() => setMessage("")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, header: { height: 66, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, iconButton: { width: 44, height: 44, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, headerTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" }, content: { flex: 1, padding: 20, gap: 18 }, barcodeVisual: { height: 220, backgroundColor: colors.peachSoft, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: 15 }, visualText: { color: colors.ink, fontSize: 18, fontWeight: "800" }, primary: { height: 56, borderRadius: radius.pill, backgroundColor: colors.dark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }, primaryText: { color: "white", fontSize: 16, fontWeight: "800" }, or: { textAlign: "center", fontSize: 10, color: colors.muted, letterSpacing: 1.5, fontWeight: "800" }, manual: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, paddingLeft: 16, alignItems: "center" }, input: { flex: 1, height: 56, fontSize: 15, color: colors.ink }, lookup: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.greenDark, alignItems: "center", justifyContent: "center", marginRight: 4 }, product: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 }, grade: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }, gradeText: { color: colors.greenDark, fontSize: 19, fontWeight: "900" }, productCopy: { flex: 1, gap: 3 }, brand: { color: colors.muted, fontSize: 10, textTransform: "uppercase" }, productName: { color: colors.ink, fontSize: 16, fontWeight: "800" }, productMacros: { color: colors.muted, fontSize: 11 }, add: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.peach, alignItems: "center", justifyContent: "center" }, cameraWrap: { flex: 1, alignItems: "center", justifyContent: "center" }, frame: { width: "82%", height: 175, borderWidth: 3, borderColor: colors.lime, borderRadius: 22, overflow: "hidden" }, scanLine: { height: 2, backgroundColor: colors.lime, marginTop: 84 }, cameraHelp: { position: "absolute", bottom: 55, color: "white", backgroundColor: "rgba(0,0,0,.55)", paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.pill, fontSize: 12 },
});
