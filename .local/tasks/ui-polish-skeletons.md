# UI Polish & Loading Skeletons

## What & Why
The app's premium design is in place but a few finishing details from the product spec are missing. Screens currently show a plain spinner (`ActivityIndicator`) while data loads instead of content skeletons, and spacing/typography/shadows/padding are applied per-screen rather than consistently from the theme. This task tightens the visual polish toward Apple HIG without redesigning anything — same layout, better finish. It runs after the Onboarding and Dashboard tasks so it polishes their final layouts rather than churning them.

## Done looks like
- Primary data screens show content-shaped loading skeletons (cards/rows) instead of a bare centered spinner while their initial data loads.
- Card shadows, corner radii, section spacing, and padding are visually consistent across screens, driven by shared theme tokens rather than ad-hoc per-screen values.
- Typography (sizes/weights for titles, labels, values) is consistent for equivalent roles across screens.
- Tappable controls give consistent press feedback (using the existing press-scale component), and key content transitions feel smooth.
- No layout or feature changes — only spacing, typography, shadow, skeleton, and feedback refinements; nothing that previously worked is broken.

## Out of scope
- The icon font fix and icon standardization (separate icon task).
- Adding new dashboard/onboarding data or fields (handled in their own tasks).
- Any redesign, restacking, or color-scheme change to the existing premium look.

## Steps
1. **Reusable skeleton component** — Build a small shimmer/placeholder skeleton primitive and use it to create content-shaped loading states.
2. **Apply skeletons** — Replace bare `ActivityIndicator` initial-load states on the primary screens (Today, History, Insights, Coach, Recipes, meal detail) with appropriate skeletons.
3. **Consistency pass** — Normalize card shadow/radius/padding, section spacing, and typography to shared theme tokens across screens, and ensure tappable controls use the existing press-scale feedback consistently.

## Relevant files
- `frontend/src/theme.ts`
- `frontend/src/components/PressableScale.tsx`
- `frontend/app/(tabs)/index.tsx`
- `frontend/app/(tabs)/history.tsx`
- `frontend/app/(tabs)/insights.tsx`
- `frontend/app/(tabs)/coach.tsx`
- `frontend/app/recipes.tsx`
- `frontend/app/meal/[id].tsx`
