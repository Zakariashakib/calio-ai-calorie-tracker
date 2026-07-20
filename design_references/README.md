# Calio UI Design References

This directory contains the core visual design references for the **Calio - AI Calorie Tracker** application. When building or updating any user interface elements (whether in the mobile app, web app, or admin panel), AI assistants and developers should refer to these images to maintain a cohesive, high-quality, modern design language.

## Reference Images Directory

| File Name | Description & Key UI Elements |
| :--- | :--- |
| **`01_meal_check_and_scan_reference.png`** | • **"Let's Check Your Meal Together"** header & search input.<br>• **Food Scan Frame:** Green targeting box overlaid on food plates.<br>• **Macro breakdown:** Clean white rounded cards for Carbs, Fats, and Sugar percentages.<br>• **Visual Breakdown:** Flower/radial macro chart ("Salmon Bowl" example). |
| **`02_home_and_item_card_reference.png`** | • **Mobile Screen Layout:** Top navigation bar with menu icon, notification bell, and user avatar.<br>• **Food Cards:** Clean white pill/card container featuring high-quality food photography ("Tender Beef Steak") with macro statistics listed underneath.<br>• **Bottom Navigation Bar:** Dark floating pill container with rounded icon buttons (`Home`, `Diet/Plate`, `Scan/Camera`, `Community/Chat`, `Settings`). |
| **`03_dashboard_and_onboarding_reference.png`** | • **Dashboard Calorie Arc Chart:** Orange half-ring/arc displaying current calories vs. daily goal (e.g., `1250 kcal / Goal 2000 kcal`).<br>• **Meal Logging Cards:** Breakfast, Lunch cards showing timestamp, total calories (`693 kcal`), and exact macro breakdown (`Protein 48g`, `Carbs 83g`, `Fat 25g`).<br>• **AI Onboarding Screen:** "Your Food, Decoded By AI" with callout pins over ingredients.<br>• **Trending Recipes Screen:** Search bar, category pills (`All`, `Vegan`, `Protein`, `Snacks`), and detailed recipe cards (`Quinoa Veggie Bowl`, `45 min`, `750 kcal`). |
| **`04_ui_collage_and_macros_reference.png`** | • **Collage Overview:** Comprehensive view across multiple app states, showcasing typography hierarchy, spacing, shadow tokens, and green/cream/white/dark aesthetic palette. |

---

## Guidelines for AI Assistants & Developers

1. **Inspecting References:** You can use the `view_file` tool directly on any of the `.png` files in this directory to visually verify UI layout, spacing, colors, and components before writing frontend code.
2. **Color Palette & Styling:**
   - **Background Theme:** Soft cream/light grey backgrounds (`#F4F5F2` / `#F8F9F6`) with vibrant nature-green accents (`#3E863D` / `#7AC142`) for scanning highlights.
   - **Cards & Containers:** Pure white (`#FFFFFF`) rounded cards with soft, diffused drop shadows.
   - **Navigation & Action Bars:** Deep charcoal/matte black floating navigation bars (`#1A1A1A` / `#222222`) with orange/warm yellow active indicators (`#FFA14A` / `#F59E0B`).
3. **Typography:** Clean, modern geometric sans-serif fonts (e.g., `Inter`, `Outfit`, `Plus Jakarta Sans`) with strong font-weight contrast between titles and macro details.
