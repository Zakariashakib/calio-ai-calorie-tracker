# CalSnap — Product Requirements Document

## Problem statement
CalSnap is a camera-first AI nutrition coach for iOS and Android. It turns meal photos, barcodes, and spoken descriptions into editable nutrition logs, then connects those logs to personal calorie, macro, water, weight, fasting, and consistency goals. The experience is English-first, Apple-like, clean and premium, with green health colors and peach/orange accents.

## Architecture
- **Mobile:** Expo SDK 54, React Native, Expo Router, TypeScript, Safe Area Context.
- **Backend:** FastAPI on `0.0.0.0:8001`, Pydantic response models, asynchronous Motor access.
- **Database:** MongoDB via protected `MONGO_URL`; custom string IDs and `_id` exclusion on responses.
- **Authentication:** Emergent-managed Google OAuth; secure mobile token storage and seven-day backend sessions.
- **AI:** GPT-5.4 vision/text through `EMERGENT_LLM_KEY`; Whisper voice transcription through Emergent integrations.
- **Nutrition data:** Open Food Facts barcode lookup with backend cache and normalized nutrients.
- **Device capabilities:** Expo Camera, Image Picker, Audio, Notifications, Print, and Sharing with contextual permission handling.

## User personas
1. **Goal-focused tracker:** Wants calorie/macro targets and fast daily logging.
2. **Busy camera-first user:** Wants to capture a mixed meal in seconds and correct estimates before saving.
3. **Health-conscious learner:** Wants understandable weekly trends, hydration and sodium/fiber/protein guidance.
4. **Nutrition professional client:** Wants a shareable PDF report for a doctor or nutritionist.

## Core requirements (static)
- Google social login and personal onboarding.
- Automatic BMR, TDEE, calories, macros, water, and weight goals.
- Daily dashboard with calories, protein, carbs, fat, water, suggestions, and meal timeline.
- AI camera scanning with multi-food detection, portion estimates, confidence, warnings, editing, and saving.
- Restaurant and before/after scan modes.
- Barcode and voice meal logging.
- Meal history with one-tap repeat and delete.
- Weight graph with weekly/monthly/yearly views.
- Nutrition breakdown, weekly report, and PDF export.
- AI nutrition chat and personalized suggestions.
- Water reminders, smart local notifications, fasting countdown, challenges, streaks, and badges.
- Health guidance must remain informational and never claim to be medical advice.

## Implemented

### 2026-07-14 — Initial complete mobile MVP
- Built premium English onboarding, Google login, five-tab navigation, dashboard, meal history, scan, insights, and AI coach.
- Added real GPT-5.4 image analysis with multi-food results, confidence scores, editable nutrients, restaurant/before/after modes, and meal saving.
- Added real Whisper voice logging and Open Food Facts barcode lookup.
- Added BMR/TDEE goals, daily aggregation, meal CRUD, water logging, weight tracking, weekly reports, nutrition flower chart, AI suggestions, and persistent chat records.
- Added local water/lunch/calorie reminders, intermittent fasting, challenges, food repeat, PDF export, and health disclaimers.
- Added contextual permission sheets with denied/blocked/Open Settings states for camera, microphone, and notifications.
- Added base64 camera/photo handling, secure session storage, MongoDB indexes, test credentials, and integration testing rules.
- Verification: Python/JavaScript/TypeScript checks clean; rigorous test agent passed 8/8 backend tests and all core frontend flows; real AI vision and real voice transcription passed.

## Prioritized backlog

### P0
- None currently identified.

### P1
- Validate camera, microphone, notifications, and native PDF sharing on physical iOS and Android devices.
- Add a dedicated two-photo comparison screen that quantifies before-versus-after consumption in one combined result.
- Add automatic challenge progress and badge awarding from daily logs.

### P2
- Add clinician-friendly report branding and selectable date ranges.
- Add recipe import and restaurant menu text/photo analysis.
- Add optional localization beyond English.
- Add deeper micronutrient trends and reusable custom meals.

## Next tasks
1. Run physical-device permission and camera quality checks.
2. Add combined before/after meal consumption calculation.
3. Add automated challenge progress and streak recovery rules.
4. Add product analytics for scan completion, correction, and save conversion.
