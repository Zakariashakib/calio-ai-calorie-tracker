import {
  Ionicons,
} from "@expo/vector-icons";
import {
  router,
} from "expo-router";
import {
  useMemo,
  useState,
} from "react";
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
import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  api,
} from "@/src/api";
import {
  useAuth,
} from "@/src/auth-context";
import {
  PressableScale,
} from "@/src/components/PressableScale";
import {
  Toast,
} from "@/src/components/Toast";
import {
  colors,
  radius,
} from "@/src/theme";

const genderOptions = [
  "female",
  "male",
  "other",
] as const;

const activities = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;

const goals = [
  "lose",
  "maintain",
  "gain",
] as const;

const activityDetails = [
  "Little or no exercise",
  "1–3 workouts weekly",
  "3–5 workouts weekly",
  "6–7 workouts weekly",
  "Physical work or intense training",
];

export default function Onboarding() {
  const {
    refreshUser,
  } = useAuth();

  const [step, setStep] =
    useState(0);

  const [gender, setGender] =
    useState<
      (typeof genderOptions)[number]
    >("female");

  const [activity, setActivity] =
    useState<
      (typeof activities)[number]
    >("moderate");

  const [goal, setGoal] =
    useState<
      (typeof goals)[number]
    >("lose");

  const [age, setAge] =
    useState("28");

  const [height, setHeight] =
    useState("165");

  const [weight, setWeight] =
    useState("72");

  const [target, setTarget] =
    useState("65");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const titles = [
    "Tell us about you",
    "How active are you?",
    "Choose your goal",
  ];

  const valid = useMemo(
    () =>
      Number(age) >= 13
      && Number(height) >= 100
      && Number(weight) >= 30
      && Number(target) >= 30,
    [
      age,
      height,
      weight,
      target,
    ],
  );

  const finish = async () => {
    setSaving(true);

    try {
      await api(
        "/profile",
        {
          method: "PUT",
          body: JSON.stringify({
            gender,
            age: Number(age),
            height_cm:
              Number(height),
            weight_kg:
              Number(weight),
            activity_level:
              activity,
            goal,
            target_weight_kg:
              Number(target),
          }),
        },
      );

      await refreshUser();
      router.replace("/(tabs)");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save your goals",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={[
        "top",
        "bottom",
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <View style={styles.header}>
          <View style={styles.steps}>
            {[0, 1, 2].map(
              (item) => (
                <View
                  key={item}
                  style={[
                    styles.step,
                    item <= step
                      && styles.stepActive,
                  ]}
                />
              ),
            )}
          </View>

          <Text style={styles.kicker}>
            PERSONAL PLAN • {step + 1} OF 3
          </Text>

          <Text style={styles.title}>
            {titles[step]}
          </Text>

          <Text style={styles.subtitle}>
            We use this to calculate your
            BMR, daily calories, macros,
            water, and weight target.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 ? (
            <>
              <Text style={styles.label}>
                Gender
              </Text>

              <View style={styles.options}>
                {genderOptions.map(
                  (item) => (
                    <Choice
                      key={item}
                      selected={
                        gender === item
                      }
                      label={item}
                      onPress={() =>
                        setGender(item)
                      }
                      testID={
                        `onboarding-gender-${item}`
                      }
                    />
                  ),
                )}
              </View>

              <View style={styles.inputRow}>
                <Input
                  label="Age"
                  value={age}
                  onChange={setAge}
                  unit="years"
                  testID="onboarding-age-input"
                />

                <Input
                  label="Height"
                  value={height}
                  onChange={setHeight}
                  unit="cm"
                  testID="onboarding-height-input"
                />
              </View>

              <View style={styles.inputRow}>
                <Input
                  label="Current weight"
                  value={weight}
                  onChange={setWeight}
                  unit="kg"
                  testID="onboarding-weight-input"
                />

                <Input
                  label="Target weight"
                  value={target}
                  onChange={setTarget}
                  unit="kg"
                  testID="onboarding-target-input"
                />
              </View>
            </>
          ) : null}

          {step === 1 ? (
            <View style={styles.stack}>
              {activities.map(
                (item, index) => (
                  <Choice
                    key={item}
                    selected={
                      activity === item
                    }
                    label={
                      item.replace(
                        "_",
                        " ",
                      )
                    }
                    detail={
                      activityDetails[index]
                    }
                    onPress={() =>
                      setActivity(item)
                    }
                    testID={
                      `onboarding-activity-${item}`
                    }
                  />
                ),
              )}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stack}>
              {goals.map(
                (item) => (
                  <Choice
                    key={item}
                    selected={goal === item}
                    label={`${item} weight`}
                    detail={
                      item === "lose"
                        ? (
                            "A sustainable "
                            + "calorie deficit"
                          )
                        : item === "gain"
                          ? (
                              "A controlled "
                              + "calorie surplus"
                            )
                          : (
                              "Keep weight and "
                              + "improve quality"
                            )
                    }
                    onPress={() =>
                      setGoal(item)
                    }
                    testID={
                      `onboarding-goal-${item}`
                    }
                  />
                ),
              )}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <PressableScale
              style={styles.back}
              onPress={() =>
                setStep(step - 1)
              }
              testID="onboarding-back-button"
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={colors.ink}
              />
            </PressableScale>
          ) : null}

          <PressableScale
            style={styles.next}
            disabled={
              !valid || saving
            }
            onPress={() =>
              step < 2
                ? setStep(step + 1)
                : finish()
            }
            testID="onboarding-next-button"
          >
            {saving ? (
              <ActivityIndicator
                color="white"
              />
            ) : (
              <>
                <Text
                  style={styles.nextText}
                >
                  {step === 2
                    ? "Build my plan"
                    : "Continue"}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="white"
                />
              </>
            )}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      <Toast
        visible={Boolean(error)}
        message={error}
        error
        onClose={() => setError("")}
      />
    </SafeAreaView>
  );
}

type ChoiceProps = {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
};

function Choice({
  label,
  detail,
  selected,
  onPress,
  testID,
}: ChoiceProps) {
  return (
    <PressableScale
      style={[
        styles.choice,
        selected
          && styles.choiceActive,
      ]}
      onPress={onPress}
      testID={testID}
    >
      <View style={styles.choiceText}>
        <Text
          style={styles.choiceLabel}
        >
          {label}
        </Text>

        {detail ? (
          <Text
            style={styles.choiceDetail}
          >
            {detail}
          </Text>
        ) : null}
      </View>

      {selected ? (
        <Ionicons
          name="checkmark-circle"
          size={22}
          color={colors.greenDark}
        />
      ) : null}
    </PressableScale>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  unit: string;
  testID: string;
};

function Input({
  label,
  value,
  onChange,
  unit,
  testID,
}: InputProps) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View style={styles.inputBox}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          style={styles.input}
          testID={testID}
        />

        <Text style={styles.unit}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    gap: 10,
  },
  steps: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 12,
  },
  step: {
    flex: 1,
    height: 5,
    borderRadius: 6,
    backgroundColor: colors.line,
  },
  stepActive: {
    backgroundColor: colors.green,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1.7,
    color: colors.greenDark,
    fontWeight: "800",
  },
  title: {
    fontSize: 31,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  content: {
    padding: 22,
    gap: 16,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "700",
  },
  options: {
    flexDirection: "row",
    gap: 9,
  },
  stack: {
    gap: 12,
  },
  choice: {
    minHeight: 58,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  choiceActive: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.green,
  },
  choiceText: {
    gap: 4,
    flex: 1,
  },
  choiceLabel: {
    textTransform: "capitalize",
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  choiceDetail: {
    color: colors.muted,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputWrap: {
    flex: 1,
    gap: 8,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
  },
  unit: {
    fontSize: 12,
    color: colors.muted,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  back: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  next: {
    flex: 1,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
