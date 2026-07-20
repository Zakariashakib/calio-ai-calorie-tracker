export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  onboarding_complete: boolean;
};

export type Nutrients = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
};

export type MealItem = Nutrients & {
  item_id: string;
  name: string;
  estimated_weight_g: number;
  portion: string;
  confidence: number;
};

export type Meal = {
  meal_id: string;
  meal_type: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  title: string;
  eaten_at: string;
  items: MealItem[];
  totals: Nutrients;
  source: string;
  image_base64?: string;
};

export type Goals = {
  bmr: number;
  tdee: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
};

export type Dashboard = {
  date: string;
  totals: Nutrients;
  goals: Goals;
  water_ml: number;
  meals: Meal[];
  suggestions: string[];
};

export type ScanResult = {
  scan_id: string;
  meal_name: string;
  total_weight_g: number;
  foods: MealItem[];
  totals: Nutrients;
  confidence: number;
  warnings: string[];
  guidance: string;
  image_base64?: string;
};

export type Report = {
  series: {
    date: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    water_ml: number;
  }[];
  average_calories: number;
  average_protein_g: number;
  average_water_ml: number;
  weight_change_kg: number;
  consistency_percent: number;
};
