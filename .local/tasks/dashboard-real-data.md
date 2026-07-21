# Complete Dashboard Real Data

## What & Why
The Today dashboard (`frontend/app/(tabs)/index.tsx`) already shows real calories (ArcMeter), water progress, and the daily AI suggestion from `GET /dashboard`. But three items from the product spec are not surfaced: **daily Protein/Carbs/Fat progress**, **BMI**, and **Weight Goal**. Reusable components already exist for this — `MacroCard` and `MetricCard` in `frontend/src/components/DashboardCards.tsx` — they are simply not rendered, and BMI/weight-goal data isn't exposed yet. This task fills the dashboard with the remaining real user data.

## Done looks like
- The dashboard shows daily Protein, Carbs, and Fat progress (consumed vs goal) using real totals and goals from the backend, updating after meals are logged.
- The dashboard shows the user's BMI (value plus a simple healthy/over/under category label) computed from their profile.
- The dashboard shows a Weight Goal card: current weight vs target weight with progress toward the target.
- All new cards use real backend data (no placeholders) and refresh with the existing focus/pull-to-refresh flow.
- Values respect the user's preferred unit where weight is displayed.

## Out of scope
- The onboarding unit/DOB/name capture (handled in the onboarding task).
- Weekly statistics on the Insights tab (already real).
- General spacing/typography/shadow polish and skeletons (handled in the UI polish task) — this task wires data and reuses existing card styling.

## Steps
1. **Expose BMI and weight goal data** — Ensure the dashboard (or profile) response provides what's needed for BMI and the weight-goal card (current weight, target weight, and BMI derived from height/weight), reusing existing profile data and keeping the response backward compatible.
2. **Render macro progress** — Add Protein/Carbs/Fat progress to the dashboard using the existing `MacroCard` component wired to real `totals` and `goals`.
3. **Render BMI and Weight Goal cards** — Add a BMI card (value + category) and a Weight Goal card (current vs target with progress) using the existing `MetricCard`/progress components, displaying weight in the user's preferred unit.

## Relevant files
- `frontend/app/(tabs)/index.tsx`
- `frontend/src/components/DashboardCards.tsx`
- `frontend/src/api.ts`
- `backend/nutrition.py:191-300`
- `backend/server.py:220-226`
