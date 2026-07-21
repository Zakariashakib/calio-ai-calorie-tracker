# Complete Onboarding Profile Wizard

## What & Why
The onboarding wizard (`frontend/app/onboarding.tsx`) already collects gender, age, height, weight, target weight, activity level, and goal, and the backend already computes BMR/TDEE/calories/macros/water from them via `nutrition.py:calculate_goals`. Three pieces from the product spec are still missing: (1) a **preferred unit** toggle (Metric/Imperial) — the UI is hardcoded to cm/kg; (2) **Date of Birth** with age derived automatically instead of typing an age integer; and (3) a **Name** field. Adding these completes the profile setup and lets the rest of the app display values in the user's chosen units.

## Done looks like
- The wizard lets the user pick Metric or Imperial, and height/weight/target-weight inputs display and accept values in the chosen units (cm/kg or ft-in/lb), converting to the canonical metric values the backend expects before saving.
- The user selects a Date of Birth and age is calculated and shown automatically; the wizard no longer requires manually typing an age.
- The user can enter/confirm their Name (prefilled from their account name when available) and it is saved.
- The user's preferred unit (and DOB/name) persist to the backend and survive reload, and the calculated goals (BMR/TDEE/calories/macros/water) are computed correctly from the metric values regardless of the unit chosen.
- All existing onboarding validation still holds (reasonable age/height/weight bounds) and completing the wizard still marks onboarding complete and lands on the tabs.

## Out of scope
- Changing the BMR/TDEE/macro formulas themselves (already implemented and correct).
- Converting every downstream screen to imperial display (the dashboard/weight screens can be updated in the Dashboard and Polish tasks); this task guarantees the stored preference and correct onboarding capture.
- Redesigning the wizard layout or step flow beyond what these fields require.

## Steps
1. **Backend profile fields** — Extend the profile schema and `PUT/GET /profile` to persist a preferred unit (metric/imperial), date of birth, and name, keeping the canonical height/weight in metric so `calculate_goals` stays unchanged and existing profiles without the new fields still load.
2. **Unit toggle + conversions** — Add a Metric/Imperial selector to the wizard and convert imperial inputs to metric before submit (and format displayed values in the chosen unit).
3. **Date of Birth → age** — Replace the manual age input with a DOB picker, derive age automatically, and continue sending the values the backend needs.
4. **Name capture** — Add a Name field prefilled from the signed-in account name and include it in the saved profile.

## Relevant files
- `frontend/app/onboarding.tsx`
- `frontend/src/auth-context.tsx`
- `backend/models.py`
- `backend/nutrition.py:117-160`
- `backend/server.py`
