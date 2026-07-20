/** Mock recipe catalog for the discovery screen (design reference parity). */

export type Recipe = {
  id: string;
  title: string;
  minutes: number;
  difficulty: 1 | 2 | 3 | 4;
  difficultyLabel: "Easy" | "Medium" | "Hard";
  kcal: number;
  category: "Vegan" | "Protein" | "Snacks" | "Sweets";
  image: string;
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const RECIPE_CATEGORIES = [
  { id: "All", image: unsplash("photo-1546069901-ba9599a7e63c") },
  { id: "Vegan", image: unsplash("photo-1512621776951-a57141f2eefd") },
  { id: "Protein", image: unsplash("photo-1467003909585-2f8a72700288") },
  { id: "Snacks", image: unsplash("photo-1568901346375-23c9450c58cd") },
  { id: "Sweets", image: unsplash("photo-1567620905732-2d1ec7ab7445") },
] as const;

export const RECIPES: Recipe[] = [
  {
    id: "quinoa-veggie-bowl",
    title: "Quinoa Veggie Bowl",
    minutes: 45,
    difficulty: 3,
    difficultyLabel: "Easy",
    kcal: 750,
    category: "Vegan",
    image: unsplash("photo-1512621776951-a57141f2eefd"),
  },
  {
    id: "grilled-salmon-bowl",
    title: "Grilled Salmon Bowl",
    minutes: 35,
    difficulty: 2,
    difficultyLabel: "Medium",
    kcal: 620,
    category: "Protein",
    image: unsplash("photo-1467003909585-2f8a72700288"),
  },
  {
    id: "rainbow-salad",
    title: "Rainbow Crunch Salad",
    minutes: 20,
    difficulty: 1,
    difficultyLabel: "Easy",
    kcal: 430,
    category: "Vegan",
    image: unsplash("photo-1546069901-ba9599a7e63c"),
  },
  {
    id: "chicken-skewers",
    title: "Herb Chicken Skewers",
    minutes: 40,
    difficulty: 3,
    difficultyLabel: "Medium",
    kcal: 540,
    category: "Protein",
    image: unsplash("photo-1555939594-58d7cb561ad1"),
  },
  {
    id: "smash-burger",
    title: "Smash Burger Sliders",
    minutes: 30,
    difficulty: 2,
    difficultyLabel: "Easy",
    kcal: 820,
    category: "Snacks",
    image: unsplash("photo-1568901346375-23c9450c58cd"),
  },
  {
    id: "berry-pancakes",
    title: "Berry Oat Pancakes",
    minutes: 25,
    difficulty: 2,
    difficultyLabel: "Easy",
    kcal: 480,
    category: "Sweets",
    image: unsplash("photo-1567620905732-2d1ec7ab7445"),
  },
];
