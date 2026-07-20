/** Recipe types for the discovery screen. Data comes from the backend
 * (`GET /api/recipes`), matched to the signed-in user's goals. */

export type RecipeCategory = { id: string; image: string };

export type Recipe = {
  id: string;
  title: string;
  minutes: number;
  difficulty: 1 | 2 | 3 | 4;
  difficultyLabel: "Easy" | "Medium" | "Hard";
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  category: string;
  image: string;
  saved: boolean;
};

export type RecipeDetail = Recipe & {
  description: string;
  ingredients: string[];
  steps: string[];
};

/** API shapes (snake_case difficulty_label from FastAPI). */
type ApiRecipeSummary = {
  id: string;
  title: string;
  minutes: number;
  difficulty: number;
  difficulty_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  category: string;
  image: string;
  saved: boolean;
};

type ApiRecipeDetail = ApiRecipeSummary & {
  description: string;
  ingredients: string[];
  steps: string[];
};

export type RecipeListResponse = {
  categories: RecipeCategory[];
  recipes: ApiRecipeSummary[];
  matched_to_goals: boolean;
};

export function mapRecipe(r: ApiRecipeSummary): Recipe {
  return {
    id: r.id,
    title: r.title,
    minutes: r.minutes,
    difficulty: Math.min(4, Math.max(1, r.difficulty)) as 1 | 2 | 3 | 4,
    difficultyLabel: r.difficulty_label as Recipe["difficultyLabel"],
    kcal: r.kcal,
    protein_g: r.protein_g,
    carbs_g: r.carbs_g,
    fat_g: r.fat_g,
    fiber_g: r.fiber_g,
    category: r.category,
    image: r.image,
    saved: r.saved,
  };
}

export function mapRecipeDetail(r: ApiRecipeDetail): RecipeDetail {
  return {
    ...mapRecipe(r),
    description: r.description,
    ingredients: r.ingredients,
    steps: r.steps,
  };
}
