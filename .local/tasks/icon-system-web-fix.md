# Fix Icon System (Empty Boxes)

## What & Why
Across the app, icons render as empty square "tofu" boxes in the web preview. Root cause: `frontend/src/hooks/use-icon-fonts.ts` only loads the `@expo/vector-icons` font files from a CDN under Expo Go (`StoreClient`); for web it passes an empty font map, and `frontend/app/+html.tsx` never injects the matching `@font-face` declarations. So the browser has no glyph data and shows boxes. The app already standardizes on `@expo/vector-icons` (Ionicons is the primary family, ~150 usages), so the fix is font delivery on web plus tightening consistency — not a redesign.

## Done looks like
- Every icon in the web preview renders as a real glyph (tab bar, buttons, dashboard, onboarding, cards) — no empty boxes.
- Icons continue to render correctly under Expo Go and native builds (no regression to the existing CDN path).
- The whole app draws icons from a single library (`@expo/vector-icons`); any stray/other-library or ad-hoc glyph icons used as UI controls are unified.
- Icon size, color, and spacing are consistent for equivalent UI roles (e.g. header actions, list rows, tab bar), driven by shared theme tokens/components rather than per-screen magic numbers.

## Out of scope
- Replacing food-category emoji in `frontend/src/food-visuals.ts` (those are intentional emoji, not UI control icons).
- Swapping to a different icon library (Lucide, etc.) — keep `@expo/vector-icons`.
- Any visual redesign beyond making icons appear and be consistent.

## Steps
1. **Serve icon fonts on web** — Ensure the `@expo/vector-icons` font families the app actually uses are available to the browser (inject the correct `@font-face`/font sources for web so glyphs resolve), keeping the existing Expo Go CDN behavior and native autolinking intact. Verify the font source/version stays in sync with the installed `@expo/vector-icons`.
2. **Verify coverage** — Load the web preview and confirm the tab bar, dashboard, onboarding, and a few detail screens show real icons; fix any remaining family that still 404s or shows boxes.
3. **Unify icon usage** — Audit icon usages for any non-`@expo/vector-icons` control icons or ad-hoc glyphs and route them through the standard library and the shared icon component so sizing/color/spacing are consistent per role.

## Relevant files
- `frontend/src/hooks/use-icon-fonts.ts`
- `frontend/app/+html.tsx`
- `frontend/app/_layout.tsx`
- `frontend/app/(tabs)/_layout.tsx`
- `frontend/src/components/ui/IconButton.tsx`
- `frontend/app.config.ts`
