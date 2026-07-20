from collections import defaultdict
from datetime import datetime, timedelta, timezone

from models import Goals, Nutrients, ProfileInput


ACTIVITY = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}


def calculate_goals(profile: ProfileInput) -> Goals:
    base = (
        10 * profile.weight_kg
        + 6.25 * profile.height_cm
        - 5 * profile.age
    )

    bmr = base + (
        5
        if profile.gender == "male"
        else -161
        if profile.gender == "female"
        else -78
    )

    tdee = bmr * ACTIVITY[profile.activity_level]

    calories = tdee + (
        -400
        if profile.goal == "lose"
        else 300
        if profile.goal == "gain"
        else 0
    )

    protein = profile.weight_kg * (
        1.8
        if profile.goal in {"lose", "gain"}
        else 1.6
    )

    fat = calories * 0.28 / 9
    carbs = max(
        80,
        (calories - protein * 4 - fat * 9) / 4,
    )

    return Goals(
        bmr=round(bmr),
        tdee=round(tdee),
        calories=max(1200, round(calories)),
        protein_g=round(protein),
        carbs_g=round(carbs),
        fat_g=round(fat),
        fiber_g=30 if profile.gender == "male" else 25,
        water_ml=round(profile.weight_kg * 35 / 100) * 100,
    )


def sum_nutrients(items: list[dict]) -> Nutrients:
    fields = Nutrients.model_fields.keys()

    return Nutrients(
        **{
            field: round(
                sum(float(item.get(field, 0)) for item in items),
                1,
            )
            for field in fields
        }
    )


def iso_day(value: str | datetime) -> str:
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )

    return dt.astimezone(timezone.utc).date().isoformat()


async def build_dashboard(
    db,
    user_id: str,
    day: str | None = None,
) -> dict:
    selected = (
        day
        or datetime.now(timezone.utc).date().isoformat()
    )

    meals = await (
        db.meals.find(
            {
                "user_id": user_id,
                "day": selected,
            },
            {
                "_id": 0,
                "image_base64": 0,
            },
        )
        .sort("eaten_at", 1)
        .to_list(50)
    )

    water = await db.water_logs.find(
        {
            "user_id": user_id,
            "day": selected,
        },
        {"_id": 0},
    ).to_list(100)

    profile = await db.profiles.find_one(
        {"user_id": user_id},
        {"_id": 0},
    )

    totals = sum_nutrients(
        [
            meal.get("totals", {})
            for meal in meals
        ]
    )

    goals = (
        (profile or {}).get("goals")
        or Goals(
            bmr=1600,
            tdee=2000,
            calories=2000,
            protein_g=130,
            carbs_g=220,
            fat_g=65,
            fiber_g=25,
            water_ml=2800,
        ).model_dump()
    )

    water_ml = sum(
        int(item.get("amount_ml", 0))
        for item in water
    )

    suggestions = []

    if totals.protein_g < goals["protein_g"] * 0.7:
        suggestions.append(
            (
                f"Add {max(0, round(goals['protein_g'] - totals.protein_g))} "
                "g protein today."
            )
        )

    if totals.sodium_mg > 2300:
        suggestions.append(
            (
                "Sodium is high today. "
                "Choose a lower-salt next meal."
            )
        )

    if totals.fiber_g < goals["fiber_g"] * 0.6:
        suggestions.append(
            (
                "Add vegetables, beans, or fruit "
                "to close your fiber gap."
            )
        )

    if water_ml < goals["water_ml"] * 0.6:
        suggestions.append(
            (
                "Hydration is behind your target. "
                "Have a glass of water now."
            )
        )

    return {
        "date": selected,
        "totals": totals.model_dump(),
        "goals": goals,
        "water_ml": water_ml,
        "meals": meals,
        "suggestions": suggestions[:3],
    }


async def build_weekly_report(
    db,
    user_id: str,
) -> dict:
    today = datetime.now(timezone.utc).date()

    days = [
        (today - timedelta(days=index)).isoformat()
        for index in range(6, -1, -1)
    ]

    meals = await db.meals.find(
        {
            "user_id": user_id,
            "day": {"$in": days},
        },
        {
            "_id": 0,
            "image_base64": 0,
        },
    ).to_list(500)

    waters = await db.water_logs.find(
        {
            "user_id": user_id,
            "day": {"$in": days},
        },
        {"_id": 0},
    ).to_list(500)

    by_day = defaultdict(list)

    for meal in meals:
        by_day[meal["day"]].append(
            meal.get("totals", {})
        )

    water_by_day = defaultdict(int)

    for log in waters:
        water_by_day[log["day"]] += int(
            log.get("amount_ml", 0)
        )

    series = []

    for day in days:
        total = sum_nutrients(by_day[day])

        series.append(
            {
                "date": day,
                **total.model_dump(),
                "water_ml": water_by_day[day],
            }
        )

    weights = await (
        db.weight_logs.find(
            {"user_id": user_id},
            {"_id": 0},
        )
        .sort("logged_at", -1)
        .limit(2)
        .to_list(2)
    )

    change = (
        round(
            weights[0]["weight_kg"]
            - weights[-1]["weight_kg"],
            1,
        )
        if len(weights) > 1
        else 0
    )

    logged_days = sum(
        1
        for row in series
        if row["calories"] > 0
    )

    return {
        "series": series,
        "average_calories": round(
            sum(row["calories"] for row in series) / 7
        ),
        "average_protein_g": round(
            sum(row["protein_g"] for row in series) / 7
        ),
        "average_water_ml": round(
            sum(row["water_ml"] for row in series) / 7
        ),
        "weight_change_kg": change,
        "consistency_percent": round(
            logged_days / 7 * 100
        ),
    }
