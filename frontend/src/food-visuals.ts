import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/src/theme";

type IconName = keyof typeof Ionicons.glyphMap;
type Visual = { icon: IconName; color: string; soft: string };

const RULES: { pattern: RegExp; visual: Visual }[] = [
  { pattern: /salad|lettuce|spinach|green|veggie|vegetable|broccoli|cucumber|kale/i, visual: { icon: "leaf", color: colors.green, soft: colors.greenSoft } },
  { pattern: /fish|salmon|tuna|shrimp|seafood/i, visual: { icon: "fish", color: colors.blue, soft: "#E7F1F9" } },
  { pattern: /steak|beef|chicken|pork|meat|turkey|lamb|sausage|bacon/i, visual: { icon: "flame", color: colors.red, soft: colors.peachSoft } },
  { pattern: /egg|omelet/i, visual: { icon: "sunny", color: colors.yellow, soft: "#FCF3DF" } },
  { pattern: /rice|pasta|noodle|bread|toast|grain|quinoa|oat|cereal|fusilli|spaghetti/i, visual: { icon: "restaurant", color: colors.peach, soft: colors.peachSoft } },
  { pattern: /fruit|apple|banana|berry|orange|mango|grape|melon/i, visual: { icon: "nutrition", color: colors.red, soft: colors.peachSoft } },
  { pattern: /milk|yogurt|cheese|dairy|cream/i, visual: { icon: "cafe", color: colors.blue, soft: "#E7F1F9" } },
  { pattern: /soup|stew|curry|bowl/i, visual: { icon: "cafe", color: colors.peach, soft: colors.peachSoft } },
  { pattern: /cake|cookie|dessert|chocolate|sweet|ice cream|donut/i, visual: { icon: "ice-cream", color: colors.peach, soft: colors.peachSoft } },
  { pattern: /juice|smoothie|drink|coffee|tea|water/i, visual: { icon: "water", color: colors.blue, soft: "#E7F1F9" } },
];

const BY_MEAL_TYPE: Record<string, Visual> = {
  Breakfast: { icon: "sunny", color: colors.yellow, soft: "#FCF3DF" },
  Lunch: { icon: "restaurant", color: colors.peach, soft: colors.peachSoft },
  Dinner: { icon: "moon", color: colors.blue, soft: "#E7F1F9" },
  Snack: { icon: "ice-cream", color: colors.green, soft: colors.greenSoft },
};

/** Deterministic icon + tint for a food name (no fake photos for real data). */
export function foodVisual(name: string, mealType?: string): Visual {
  for (const rule of RULES) if (rule.pattern.test(name)) return rule.visual;
  if (mealType && BY_MEAL_TYPE[mealType]) return BY_MEAL_TYPE[mealType];
  return { icon: "restaurant", color: colors.peach, soft: colors.peachSoft };
}
