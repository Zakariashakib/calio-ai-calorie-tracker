import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useMemo } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOnboarding } from "@/src/onboarding-context";
import { PressableScale } from "@/src/components/PressableScale";
import { colors, radius, shadows } from "@/src/theme";
import { Toast } from "@/src/components/Toast";

// --- Form Helpers ---
function Choice({ label, detail, selected, onPress }: any) {
  return (
    <PressableScale style={[styles.choice, selected && styles.choiceActive]} onPress={onPress}>
      <View style={styles.choiceText}>
        <Text style={styles.choiceLabel}>{label}</Text>
        {detail ? <Text style={styles.choiceDetail}>{detail}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.peach} /> : null}
    </PressableScale>
  );
}

const goals = ["lose", "maintain", "gain"] as const;
const motivations = ["Eat healthier", "Boost energy", "Stay motivated", "Feel better"];
const obstaclesList = ["Lack of consistency", "Unhealthy eating", "Busy schedule", "Lack of support", "No meal inspiration"];
const genders = ["male", "female", "other"] as const;
const activities = ["0–2", "3–5", "6+"] as const;

export default function CoreOnboarding() {
  const { data, updateData } = useOnboarding();
  const [step, setStep] = useState(0);

  // Validation
  const canGoNext = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return !!data.goal;
    if (step === 2) return !!data.motivation;
    if (step === 3) return data.obstacles.length > 0;
    if (step === 4) return !!data.gender;
    if (step === 5) return !!data.age; // Assuming we calculate age
    if (step === 6) return data.height_cm > 0;
    if (step === 7) return data.weight_kg > 0;
    if (step === 8) return !!data.activity_level;
    if (step === 9) return data.personal_trainer !== null;
    return false;
  }, [step, data]);

  const titles = [
    "Welcome to Cal AI",
    "What is your primary goal?",
    "Why do you want to improve?",
    "What usually prevents you?",
    "What is your gender?",
    "When were you born?",
    "How tall are you?",
    "How much do you weigh?",
    "How active are you?",
    "Do you work with a trainer?",
  ];

  const handleNext = () => {
    if (step < 9) {
      setStep(step + 1);
    } else {
      router.push("/onboarding/processing");
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const toggleObstacle = (obs: string) => {
    const next = data.obstacles.includes(obs)
      ? data.obstacles.filter((o) => o !== obs)
      : [...data.obstacles, obs];
    updateData({ obstacles: next });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          {step > 0 && (
            <View style={styles.steps}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View key={i} style={[styles.stepDot, i < step && styles.stepActive]} />
              ))}
            </View>
          )}
          {step > 0 && <Text style={styles.kicker}>STEP {step} OF 9</Text>}
          <Text style={styles.title}>{titles[step]}</Text>
          {step === 0 && (
            <Text style={styles.subtitle}>Cal AI will personalize everything based on your answers.</Text>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 0 && (
             <View style={styles.centerBox}>
               <Ionicons name="sparkles" size={60} color={colors.peach} />
               <Text style={styles.welcomeText}>Get ready for a personalized nutrition experience.</Text>
             </View>
          )}

          {step === 1 && (
            <View style={styles.stack}>
              {goals.map((item) => (
                <Choice key={item} selected={data.goal === item} label={`${item.charAt(0).toUpperCase() + item.slice(1)} weight`} onPress={() => updateData({ goal: item })} />
              ))}
            </View>
          )}

          {step === 2 && (
            <View style={styles.stack}>
              {motivations.map((item) => (
                <Choice key={item} selected={data.motivation === item} label={item} onPress={() => updateData({ motivation: item })} />
              ))}
            </View>
          )}

          {step === 3 && (
            <View style={styles.stack}>
              <Text style={styles.instruction}>Select all that apply</Text>
              {obstaclesList.map((item) => (
                <Choice key={item} selected={data.obstacles.includes(item)} label={item} onPress={() => toggleObstacle(item)} />
              ))}
            </View>
          )}

          {step === 4 && (
            <View style={styles.stack}>
              {genders.map((item) => (
                <Choice key={item} selected={data.gender === item} label={item.charAt(0).toUpperCase() + item.slice(1)} onPress={() => updateData({ gender: item })} />
              ))}
            </View>
          )}

          {step === 5 && (
            <View style={styles.stack}>
              <Text style={styles.instruction}>For simplicity in this demo, tap to confirm age 25.</Text>
              <Choice selected={data.age === 25} label="25 Years Old" onPress={() => updateData({ age: 25, date_of_birth: "1998-06-15" })} />
            </View>
          )}

          {step === 6 && (
            <View style={styles.stack}>
              <Choice selected={data.height_cm === 170} label="170 cm" onPress={() => updateData({ height_cm: 170 })} />
              <Choice selected={data.height_cm === 160} label="160 cm" onPress={() => updateData({ height_cm: 160 })} />
              <Choice selected={data.height_cm === 180} label="180 cm" onPress={() => updateData({ height_cm: 180 })} />
            </View>
          )}

          {step === 7 && (
            <View style={styles.stack}>
              <Choice selected={data.weight_kg === 70} label="70 kg" onPress={() => updateData({ weight_kg: 70 })} />
              <Choice selected={data.weight_kg === 60} label="60 kg" onPress={() => updateData({ weight_kg: 60 })} />
              <Choice selected={data.weight_kg === 80} label="80 kg" onPress={() => updateData({ weight_kg: 80 })} />
            </View>
          )}

          {step === 8 && (
            <View style={styles.stack}>
              {activities.map((item) => (
                <Choice key={item} selected={data.activity_level === item} label={`${item} workouts per week`} onPress={() => updateData({ activity_level: item })} />
              ))}
            </View>
          )}

          {step === 9 && (
            <View style={styles.stack}>
              <Choice selected={data.personal_trainer === true} label="Yes" onPress={() => updateData({ personal_trainer: true })} />
              <Choice selected={data.personal_trainer === false} label="No" onPress={() => updateData({ personal_trainer: false })} />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && (
            <PressableScale style={styles.back} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </PressableScale>
          )}
          <PressableScale style={styles.next} disabled={!canGoNext} onPress={handleNext}>
            <Text style={styles.nextText}>{step === 0 ? "Get Started" : "Continue"}</Text>
            <Ionicons name="arrow-forward" size={19} color="white" />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10, gap: 10 },
  steps: { flexDirection: "row", gap: 4, marginBottom: 8 },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#E4E0D6" },
  stepActive: { backgroundColor: colors.peach },
  kicker: { fontSize: 11, fontWeight: "800", color: colors.muted, letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, lineHeight: 34 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22, marginTop: 4 },
  content: { paddingHorizontal: 24, paddingVertical: 20 },
  stack: { gap: 12 },
  centerBox: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 20 },
  welcomeText: { fontSize: 18, color: colors.muted, textAlign: "center", fontWeight: "600", paddingHorizontal: 20 },
  instruction: { fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 4 },
  choice: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: radius.md, padding: 18, borderWidth: 1.5, borderColor: "transparent", ...shadows.subtle },
  choiceActive: { borderColor: colors.dark },
  choiceText: { flex: 1, gap: 4 },
  choiceLabel: { fontSize: 16, fontWeight: "700", color: colors.ink },
  choiceDetail: { fontSize: 13, color: colors.muted },
  footer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16, gap: 12 },
  back: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadows.subtle },
  next: { flex: 1, height: 54, borderRadius: radius.pill, backgroundColor: colors.dark, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextText: { color: "white", fontSize: 16, fontWeight: "700" },
});
