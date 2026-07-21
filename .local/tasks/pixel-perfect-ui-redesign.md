# Pixel-Perfect UI Redesign from Reference Screenshots

## What & Why
Recreate the four attached reference screenshots (in `attached_assets/`) as pixel-perfect as possible across the existing CalSnap Expo app. The screenshots are the single source of truth — match spacing, sizing, typography, colors, shadows, border radii, icon placement, navigation styling, and proportions. Do NOT redesign or reinterpret. Keep all current business logic, API calls, navigation routes, and backend integrations intact; this is a visual-layer replacement only.

## Design reference (source of truth)
Reference images (view them before writing any code):
- `attached_assets/86556_1784533522572.png` — Dashboard (segmented arc calorie meter, meal cards), Onboarding hero ("Your Food, Decoded By AI"), Recipes/discovery screen (category chips, trending recipe card)
- `attached_assets/25721_1784533529585.png` — Home/"Let's Check Your Meal Together" (big title, search bar + filter, Last scans rail)
- `attached_assets/33583_1784533536110.png` — Scanner (lime corner brackets, macro chips, dark capture button), Food detail (petal/flower ingredient % visualization, ingredient rows)
- `attached_assets/75642_1784533542790.png` — Same screens, closer crops for spacing/shadow detail
- `attached_assets/Pasted-The-attached-screenshot-is-the-single-source-of-truth-R_1784533505178.txt` — full requirements text

Key visual language: warm cream canvas; white cards with large radii and soft shadows; salmon-orange primary accent (arc meter, active tab, kcal highlights, badges); near-black charcoal dark elements (bottom tab bar, primary buttons, capture button); lime-green scanner brackets; macro chips with colored icons (green leaf = carbs/protein, orange drop = fats, red cube = sugar); SF-style typography with bold large titles and gray secondary text.

## Done looks like
- Welcome screen matches the onboarding shot: food hero imagery with floating kcal callout chips, "Your Food, Decoded By AI" headline, page dots, full-width dark pill "Get Started" button (existing auth flow unchanged)
- Today tab matches the Dashboard shot: white icon-buttons + centered title header, segmented arc calorie progress meter with date/current kcal/goal, "+" pill button, meal cards with circular photo, name/time, kcal + "% of goal" in orange, protein/carbs/fat columns, edit affordance — all driven by real data
- History tab matches the "Let's Check Your Meal Together" shot: hamburger + bell/avatar header, two-line bold/gray title, search field with filter button, "Last scans" horizontal card rail with food photo and three macro chips per card — driven by real meal history
- Scan tab camera view matches the scanner shot: lime corner brackets with scan-line effect, detected food name + weight below the frame, three white macro chips, large dark circular capture button (scan, gallery, barcode, voice, before/after logic all still work)
- Scan result screen matches the food-detail shot: back + bookmark icon buttons, petal/flower ingredient percentage visualization around a central circular food image with warm glow, food name + total weight, ingredient list rows with thumbnail, grams, and per-ingredient mini macro chips (save/edit meal logic unchanged)
- A recipes/discovery screen matches the trending-recipes shot: search bar, category chips with food thumbnails (All, Vegan, Protein, Snacks), "Trending Recipes" with orange count badge, recipe cards with photo, bookmark star, time, difficulty dots, kcal — using realistic mock data and Unsplash images
- Bottom tab bar matches the shots: dark charcoal bar, center scan button in an orange rounded square, muted inactive icons, consistent icon set — same five routes as today
- All tokens (colors, spacing, typography, radii, shadows) extracted into the shared theme; shared UI pieces (macro chip, icon button, search bar, arc meter, category chip, difficulty dots) are reusable components, no duplicated styling blocks
- Responsive from iPhone SE width up to Pro Max and Android sizes; SafeArea respected everywhere; no layout overflow
- TypeScript compiles clean, no lint errors, no new console warnings; press states and transitions are smooth (60fps-friendly, using the existing animation libs)
- Dark-mode-ready token structure (light palette shipped; tokens organized so a dark palette can drop in later)

## Out of scope
- Comparison, voice, barcode, challenges, weight, fasting, reminders, more, insights, and coach screens keep their current layouts — they inherit the updated theme tokens automatically but are NOT rebuilt (comparison and voice screens are being modified by other active tasks)
- No new backend endpoints, no changes to API contracts, stores, or auth
- No real recipes backend — recipes screen uses realistic mock data only
- No full dark mode implementation (token structure only)
- No changes to the Expo/React Native/Router versions or the tab route structure

## Steps
1. **Design system foundation** — Extract the reference palette, typography scale, spacing, radii, and shadows into the shared theme; build the reusable primitives (macro chip, icon button, search bar, segmented arc meter, category chip, difficulty dots, section header) used across all redesigned screens.
2. **Tab bar restyle** — Rebuild the tab navigator's visual layer: dark charcoal bar with the center scan button in an orange rounded square, keeping the existing five routes and icons consistent.
3. **Welcome screen** — Rebuild the sign-in screen visual layer to match the onboarding hero shot while preserving the existing auth flow and redirects.
4. **Dashboard (Today tab)** — Rebuild with the segmented arc calorie meter, header icon-buttons, and the meal-card list design, wired to the existing daily summary and meals data.
5. **Meal check (History tab)** — Rebuild with the big two-line title, search + filter row, and horizontal "Last scans" rail using real meal history.
6. **Scanner screen** — Restyle the camera experience with lime corner brackets, scan-line effect, detection pill, macro chips, and the dark capture button, preserving all existing scan modes and navigation.
7. **Food detail (scan result)** — Rebuild with the petal ingredient visualization, central food image with warm glow, and per-ingredient rows with mini macro chips, preserving the existing edit/save logic.
8. **Recipes discovery screen** — Build the new mock-data screen matching the trending-recipes shot, reachable from the redesigned Dashboard, with Unsplash placeholder images.
9. **Quality pass** — Verify pixel fidelity against each screenshot, responsive behavior across small/large screens, SafeArea, TypeScript/lint cleanliness, no console warnings, and smooth micro-interactions.

## Relevant files
- `frontend/src/theme.ts`
- `frontend/app/(tabs)/_layout.tsx`
- `frontend/app/index.tsx`
- `frontend/app/(tabs)/index.tsx`
- `frontend/app/(tabs)/history.tsx`
- `frontend/app/(tabs)/scan.tsx`
- `frontend/app/scan-result.tsx`
- `frontend/src/components/PressableScale.tsx`
- `frontend/src/components/AppScreen.tsx`
- `frontend/src/components/NutritionUi.tsx`
- `frontend/src/components/DashboardCards.tsx`
- `frontend/src/api.ts`
- `frontend/src/types.ts`
- `frontend/src/scan-store.ts`
