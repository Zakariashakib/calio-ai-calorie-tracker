import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius } from "@/src/theme";

type Message = { id: string; role: "user" | "coach"; text: string };
const prompts = ["What should I eat for protein?", "Is my sodium high today?", "Suggest a balanced dinner"];

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "coach", text: "I’m your CalSnap nutrition coach. Ask about today’s macros, meal ideas, or how to close a nutrition gap." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const send = async (text = input) => { if (!text.trim() || loading) return; const userMessage = { id: `u-${Date.now()}`, role: "user" as const, text: text.trim() }; setMessages((m) => [...m, userMessage]); setInput(""); setLoading(true); try { const result = await api<{ reply: string }>("/coach", { method: "POST", body: JSON.stringify({ message: userMessage.text }) }); setMessages((m) => [...m, { id: `c-${Date.now()}`, role: "coach", text: result.reply }]); } catch (reason) { setMessages((m) => [...m, { id: `e-${Date.now()}`, role: "coach", text: reason instanceof Error ? reason.message : "I couldn't answer right now." }]); } finally { setLoading(false); } };
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={72}>
        <View style={styles.header}><View style={styles.bot}><Ionicons name="sparkles" size={22} color={colors.peach} /></View><View style={styles.headerCopy}><Text style={styles.title}>AI Nutrition Coach</Text><Text style={styles.status}>Personalized to today&apos;s progress</Text></View><View style={styles.online} /></View>
        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" testID="coach-messages-list">
          {messages.map((message) => <View key={message.id} style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.coachBubble]}><Text style={[styles.bubbleText, message.role === "user" && styles.userText]}>{message.text}</Text></View>)}
          {loading ? <View style={[styles.bubble, styles.coachBubble]}><ActivityIndicator color={colors.peach} /></View> : null}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptScroller} contentContainerStyle={styles.prompts}>{prompts.map((prompt) => <PressableScale key={prompt} style={styles.prompt} onPress={() => send(prompt)} testID={`coach-prompt-${prompt.slice(0, 8).toLowerCase().replaceAll(" ", "-")}`}><Text style={styles.promptText}>{prompt}</Text></PressableScale>)}</ScrollView>
        <View style={styles.composer}><TextInput value={input} onChangeText={setInput} placeholder="Ask about your nutrition…" placeholderTextColor="#979C94" style={styles.input} multiline maxLength={1000} testID="coach-message-input" /><PressableScale style={styles.send} onPress={() => send()} disabled={!input.trim() || loading} testID="coach-send-button"><Ionicons name="arrow-up" color="white" size={20} /></PressableScale></View>
        <Text style={styles.disclaimer}>Informational guidance, not medical advice.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, header: { height: 76, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, bot: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.peachSoft, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, gap: 3 }, title: { color: colors.ink, fontSize: 17, fontWeight: "900" }, status: { color: colors.muted, fontSize: 11 }, online: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green }, messages: { padding: 20, paddingBottom: 25, gap: 12 }, bubble: { maxWidth: "84%", paddingHorizontal: 15, paddingVertical: 12, borderRadius: 20 }, coachBubble: { backgroundColor: colors.surface, alignSelf: "flex-start", borderBottomLeftRadius: 6 }, userBubble: { backgroundColor: colors.dark, alignSelf: "flex-end", borderBottomRightRadius: 6 }, bubbleText: { color: colors.ink, fontSize: 14, lineHeight: 21 }, userText: { color: "white" }, promptScroller: { maxHeight: 52 }, prompts: { paddingHorizontal: 16, gap: 8, alignItems: "center" }, prompt: { flexShrink: 0, height: 36, borderRadius: 18, paddingHorizontal: 13, backgroundColor: colors.surface, justifyContent: "center" }, promptText: { color: colors.ink, fontSize: 11, fontWeight: "700" }, composer: { margin: 12, marginBottom: 5, minHeight: 56, paddingLeft: 16, paddingRight: 5, borderRadius: 28, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 8 }, input: { flex: 1, maxHeight: 92, color: colors.ink, fontSize: 14, paddingVertical: 12 }, send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.peach, alignItems: "center", justifyContent: "center" }, disclaimer: { color: colors.muted, fontSize: 9, textAlign: "center", paddingBottom: 7 },
});
