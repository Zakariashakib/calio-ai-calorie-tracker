import { createContext, PropsWithChildren, useContext, useState, useMemo } from "react";
import type { OnboardingData } from "@/src/types";

type OnboardingContextValue = {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  resetData: () => void;
};

const defaultData: OnboardingData = {
  goal: "",
  motivation: "",
  obstacles: [],
  gender: "",
  date_of_birth: null,
  age: null,
  height_cm: 170, // default placeholder
  weight_kg: 70, // default placeholder
  target_weight_kg: 65, // default placeholder
  activity_level: "3-5", // default
  personal_trainer: null,
  preferred_unit: "metric",
  name: "",
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<OnboardingData>(defaultData);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const resetData = () => {
    setData(defaultData);
  };

  const value = useMemo(() => ({ data, updateData, resetData }), [data]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
